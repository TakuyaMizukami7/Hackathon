import Anthropic from '@anthropic-ai/sdk'
import { Hono } from 'hono'
import type { ChatRequest } from '../../src/shared/types'

/**
 * POST /api/chat  ->  text/plain のストリーム
 *
 * LLM を呼ぶ処理は必ずここ（サーバー側）に置く。
 * ブラウザから直接 Anthropic を叩くと API キーが全世界に公開される。
 *
 * レスポンスは SSE ではなく「生テキストのストリーム」。
 * クライアントは response.body を読むだけでよく、パーサが要らない。
 *   -> src/shared/api.ts の streamChat() を参照
 */

// モデルを変えたくなったら Railway の環境変数 LLM_MODEL を差し替えるだけでよい。
// 速度優先なら 'claude-haiku-4-5'、品質優先なら 'claude-opus-5'。
const MODEL = process.env.LLM_MODEL ?? 'claude-opus-5'

export const chat = new Hono()

chat.post('/', async (c) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return c.json(
      {
        error:
          'ANTHROPIC_API_KEY が未設定です。ローカルは .env.local、本番は Railway の Variables に登録してください。',
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

  const client = new Anthropic()

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8192,
    system: payload.system,
    messages: payload.messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
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
