/**
 * ブラウザ側から自前の /api/* を呼ぶための薄いラッパ。
 * ここも共有ファイル。関数の「追加」は自由、既存関数の書き換えは要相談。
 */
import type { ChatMessage, HealthResponse } from './types'

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error(`/api/health が ${res.status} を返しました`)
  return (await res.json()) as HealthResponse
}

/**
 * /api/chat をストリームで呼ぶ。
 * 届いた差分を onDelta で受け取り、最終的な全文を返す。
 *
 *   const answer = await streamChat(messages, (t) => setText((prev) => prev + t))
 */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  options: { system?: string; signal?: AbortSignal } = {},
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, system: options.system }),
    signal: options.signal,
  })

  if (!res.ok) {
    // サーバーは { error: string } を返す。画面に出すのは中の文だけでよい
    const body = await res.text().catch(() => '')
    let detail = body
    try {
      const parsed = JSON.parse(body) as { error?: unknown }
      if (typeof parsed.error === 'string') detail = parsed.error
    } catch {
      // JSON でなければ本文をそのまま出す
    }
    throw new Error(detail || `/api/chat が ${res.status} を返しました`)
  }
  if (!res.body) throw new Error('レスポンスボディが空です')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk
    onDelta(chunk)
  }
  return full
}
