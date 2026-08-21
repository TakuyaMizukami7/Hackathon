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
  const contents = payload.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  let stream: Awaited<ReturnType<typeof ai.models.generateContentStream>>
  try {
    stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: payload.system ? { systemInstruction: payload.system } : undefined,
    })
  } catch (err) {
    // ストリームが始まる前のエラー（キーが無効・モデルIDが違う・レート制限など）は
    // ここで捕まるので、ちゃんとステータスコードを付けて返せる
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Gemini の呼び出しに失敗しました: ${message}` }, 502)
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
        const message = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`\n\n[APIエラー] ${message}`))
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
    },
  })
})
