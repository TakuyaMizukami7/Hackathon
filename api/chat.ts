import Anthropic from '@anthropic-ai/sdk'
import type { ChatRequest } from '../src/shared/types'

/**
 * POST /api/chat  ->  text/plain のストリーム
 *
 * LLM を呼ぶ処理は必ずここ（サーバー側）に置く。
 * ブラウザから直接 Anthropic を叩くと API キーが全世界に公開される。
 *
 * レスポンスは SSE ではなく「生テキストのストリーム」にしてある。
 * クライアント側は response.body のリーダーで読むだけでよく、パーサが要らない。
 *   -> src/shared/api.ts の streamChat() を参照
 */

// 当日モデルを変えたくなったら Vercel の環境変数 LLM_MODEL だけ差し替える。
// 速度優先なら 'claude-haiku-4-5'、品質優先なら 'claude-opus-5'。
const MODEL = process.env.LLM_MODEL ?? 'claude-opus-5'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        {
          error:
            'ANTHROPIC_API_KEY が未設定です。ローカルは .env.local、本番は Vercel の Settings > Environment Variables に登録してください。',
        },
        { status: 500 },
      )
    }

    let payload: ChatRequest
    try {
      payload = (await request.json()) as ChatRequest
    } catch {
      return Response.json({ error: 'リクエストボディが JSON ではありません' }, { status: 400 })
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return Response.json({ error: 'messages が空です' }, { status: 400 })
    }

    const client = new Anthropic()

    // 注意: Vercel Hobby はリクエスト/レスポンスの body が 4.5MB まで。
    // 画像を送るときはクライアント側で縮小してから base64 にすること。
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
      },
    })
  },
}
