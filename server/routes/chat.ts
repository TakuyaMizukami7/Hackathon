import { GoogleGenAI } from '@google/genai'
import { Hono } from 'hono'
import type { ChatRequest } from '../../src/shared/types'

/**
 * POST /api/chat  ->  text/plain のストリーム
 *
 * LLM を呼ぶ処理は必ずここ（サーバー側）に置く。
 * ブラウザから直接 Gemini を叩くと API キーが全世界に公開される。
 *
 * レスポンスは SSE ではなく「生テキストのストリーム」。
 * クライアントは response.body を読むだけでよく、パーサが要らない。
 *   -> src/shared/api.ts の streamChat() を参照
 */

// モデルを変えたくなったら Railway の環境変数 LLM_MODEL を差し替えるだけでよい（コード変更不要）。
// 速度/コスト優先なら 'gemini-3.5-flash-lite'、安定重視なら 'gemini-2.5-flash'。
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

type GeminiContent = { role: string; parts: { text: string }[] }
type GeminiStream = Awaited<ReturnType<GoogleGenAI['models']['generateContentStream']>>

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
 */
function readableMessage(err: unknown): string {
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

function isRetryable(err: unknown): boolean {
  const status = statusOf(err)
  if (status !== undefined) return RETRYABLE_STATUS.has(status)
  // ステータスが読めない場合（接続断など）はネットワーク系だけ拾う
  return /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(readableMessage(err))
}

/**
 * ストリームを開く。混雑(503)などの一時エラーなら、
 * 「待ってリトライ」→「次のモデルへ」の順で粘る。
 * 恒久的なエラー（キーが無効・モデルIDが違う）は即座に投げ返す。
 */
async function openStream(
  ai: GoogleGenAI,
  contents: GeminiContent[],
  systemInstruction: string | undefined,
): Promise<{ stream: GeminiStream; model: string }> {
  let lastError: unknown = new Error('モデルが 1 つも設定されていません')

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: systemInstruction ? { systemInstruction } : undefined,
        })
        return { stream, model }
      } catch (err) {
        lastError = err
        if (!isRetryable(err)) throw err
        console.warn(
          `[chat] ${model} が ${statusOf(err) ?? '不明'} を返しました (${attempt}/${ATTEMPTS_PER_MODEL}): ${readableMessage(err)}`,
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

export const chat = new Hono()

chat.post('/', async (c) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return c.json(
      {
        error:
          'GEMINI_API_KEY が未設定です。ローカルは .env.local、本番は Railway の Variables に登録してください。',
      },
      500,
    )
  }

  let payload: ChatRequest
  try {
    payload = await c.req.json<ChatRequest>()
  } catch {
    return c.json({ error: 'リクエストボディが JSON ではありません' }, 400)
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return c.json({ error: 'messages が空です' }, 400)
  }

  const ai = new GoogleGenAI({ apiKey })

  // 共有の型は role を 'user' | 'assistant' で持っている（フロントで扱いやすいため）。
  // Gemini 側は 'user' | 'model' なので、ここで変換する。
  const contents: GeminiContent[] = payload.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  let stream: GeminiStream
  let model: string
  try {
    // ストリームが始まる前のエラー（キーが無効・モデルIDが違う・混雑など）は
    // ここで捕まるので、ちゃんとステータスコードを付けて返せる
    ;({ stream, model } = await openStream(ai, contents, payload.system))
  } catch (err) {
    const detail = readableMessage(err)
    if (isRetryable(err)) {
      // Gemini 側の一時的な混雑。こちらのバグではないと分かる文面にする
      return c.json(
        {
          error: `Gemini が混雑しています（${MODELS.join(' / ')} を各 ${ATTEMPTS_PER_MODEL} 回試して全滅）。数十秒待ってもう一度送ってください。詳細: ${detail}`,
        },
        503,
        { 'retry-after': '10' },
      )
    }
    return c.json({ error: `Gemini の呼び出しに失敗しました: ${detail}` }, 502)
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        // ストリーム開始後のエラーは HTTP ステータスを変えられないので、
        // 本文に流し込んで画面上で気づけるようにする
        controller.enqueue(encoder.encode(`\n\n[APIエラー] ${readableMessage(err)}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      // ストリームを途中でバッファさせない
      'x-accel-buffering': 'no',
      // どのモデルが応答したか（フォールバックしたかどうか）を確認できるようにする
      'x-llm-model': model,
    },
  })
})
