import { GoogleGenAI, Type } from '@google/genai'
import type { Schema } from '@google/genai'
import type { ExpandResponse, Perspective } from '../../src/shared/types'
import { PERSONA_IDS } from '../../src/shared/types'
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts/expand'

/**
 * POST /api/expand から使う、非ストリーミング版の Gemini 呼び出し。
 *
 * server/routes/chat.ts の「503(混雑)ならリトライ→モデルフォールバック」という
 * パターンを、非ストリーミング + JSON構造化出力向けに複製したもの。
 * chat.ts 自体は編集しないので、多少のロジック重複は許容している。
 */

// モデルを変えたくなったら Railway の環境変数 LLM_MODEL を差し替えるだけでよい（コード変更不要）。
const MODEL = process.env.LLM_MODEL ?? 'gemini-3.7-flash'

// 本命モデルが 503(混雑) を返したときに順番に試す逃げ道。
// 環境変数 LLM_FALLBACK_MODELS でカンマ区切り指定できる。空文字にすれば無効化。
const FALLBACK_MODELS = (
  process.env.LLM_FALLBACK_MODELS ?? 'gemini-3.5-flash-lite,gemini-2.5-flash'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

/** 実際に試す順番。重複は除く */
const MODELS = [...new Set([MODEL, ...FALLBACK_MODELS])]

/** 1 モデルあたりの試行回数（初回 + リトライ） */
const ATTEMPTS_PER_MODEL = 3
/** リトライの待ち時間。2 回目以降は倍々にする */
const BASE_DELAY_MS = 400

/** 時間を置けば直る可能性があるステータス（混雑・レート制限・一時障害） */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Gemini のエラーから HTTP ステータスを取り出す。
 * SDK が status を持たない場合もあるので、本文の "code": 503 も見る。
 */
function statusOf(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const status = (err as { status?: unknown }).status
    if (typeof status === 'number') return status
  }
  const text = err instanceof Error ? err.message : String(err)
  const matched = text.match(/"code"\s*:\s*(\d{3})/)
  return matched ? Number(matched[1]) : undefined
}

/**
 * Gemini のエラーは JSON が二重・三重に入れ子になっていて、そのまま出すと読めない。
 * 一番内側の人間向けメッセージだけを取り出す。
 *
 * expand.ts 側でエラーメッセージを組み立てるために export する。
 */
export function readableMessage(err: unknown): string {
  let text = err instanceof Error ? err.message : String(err)
  for (let depth = 0; depth < 4; depth++) {
    try {
      const parsed = JSON.parse(text) as { error?: { message?: unknown } }
      const inner = parsed.error?.message
      if (typeof inner !== 'string') break
      text = inner
    } catch {
      break
    }
  }
  return text.trim()
}

/**
 * 一時的なエラー（混雑・レート制限など）かどうか。
 * expand.ts 側で 503 と 502 を切り分けるために export する。
 */
export function isRetryable(err: unknown): boolean {
  const status = statusOf(err)
  if (status !== undefined) return RETRYABLE_STATUS.has(status)
  // ステータスが読めない場合（接続断など）はネットワーク系だけ拾う
  return /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(readableMessage(err))
}

/** Perspective 1件分の JSON Schema */
const PERSPECTIVE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, format: 'enum', enum: PERSONA_IDS },
    persona: { type: Type.STRING },
    headline: { type: Type.STRING },
    body: { type: Type.STRING },
    biasLevel: { type: Type.INTEGER },
    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['id', 'persona', 'headline', 'body', 'biasLevel', 'keywords'],
}

/**
 * AI に生成させる範囲の JSON Schema。
 * ExpandResponse のうち model / elapsedMs はサーバー側で付与するので含めない。
 */
const EXPAND_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    perspectives: {
      type: Type.ARRAY,
      items: PERSPECTIVE_SCHEMA,
      minItems: '4',
      maxItems: '4',
    },
  },
  required: ['summary', 'perspectives'],
}

/** Gemini に生成させる部分だけを表す型（model / elapsedMs を除いた ExpandResponse） */
type GeneratedExpand = {
  summary: string
  perspectives: Perspective[]
}

/**
 * JSON構造化出力で Gemini を呼ぶ。混雑(503)などの一時エラーなら、
 * 「待ってリトライ」→「次のモデルへ」の順で粘る。
 * 恒久的なエラー（キーが無効・モデルIDが違う）は即座に投げ返す。
 */
async function generateStructured(
  ai: GoogleGenAI,
  text: string,
): Promise<{ data: GeneratedExpand; model: string }> {
  let lastError: unknown = new Error('モデルが 1 つも設定されていません')

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: buildUserPrompt(text) }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT || undefined,
            responseMimeType: 'application/json',
            responseSchema: EXPAND_SCHEMA,
          },
        })
        const raw = response.text
        if (!raw) throw new Error('Gemini から空の応答が返されました')
        const data = JSON.parse(raw) as GeneratedExpand
        return { data, model }
      } catch (err) {
        lastError = err
        if (!isRetryable(err)) throw err
        console.warn(
          `[expand] ${model} が ${statusOf(err) ?? '不明'} を返しました (${attempt}/${ATTEMPTS_PER_MODEL}): ${readableMessage(err)}`,
        )
        if (attempt < ATTEMPTS_PER_MODEL) {
          // ジッタを入れて、同時アクセスのリトライが重ならないようにする
          const wait = BASE_DELAY_MS * 2 ** (attempt - 1)
          await sleep(wait + Math.random() * wait * 0.25)
        }
      }
    }
  }
  throw lastError
}

/**
 * text から ExpandResponse を生成する。POST /api/expand の本体処理。
 *
 * 失敗時は Gemini の生エラーをそのまま throw するので、呼び出し側
 * (server/routes/expand.ts) は isRetryable() / readableMessage() を使って
 * HTTP ステータスとエラーメッセージを組み立てること。
 */
export async function generateExpand(ai: GoogleGenAI, text: string): Promise<ExpandResponse> {
  const start = Date.now()
  const { data, model } = await generateStructured(ai, text)
  return {
    summary: data.summary,
    perspectives: data.perspectives,
    model,
    elapsedMs: Date.now() - start,
  }
}
