/**
 * Bias Filter ▽ から /api/expand を呼ぶところ。
 *
 * 通信の都合（URL の組み立て・エラー文の取り出し・モック切替）は全部ここに閉じ込め、
 * BiasFilter.tsx 側は「呼ぶ / 待つ / 失敗を出す」だけにする。
 */
import type { ExpandRequest, ExpandResponse } from '../../shared/types'
import { MOCK_RESPONSE } from './mock'

/**
 * モックの使い方。開発中の切替用に URL の `?mock=` で選ぶ。
 *   off    … 本番。/api/expand をそのまま叩く
 *   server … `?mock=1`。BE の固定応答（/api/expand?mock=1）を叩く。通信はする
 *   local  … `?mock=local`。ブラウザ内の MOCK_RESPONSE を返す。通信ゼロ。
 *            BE がまだ無い / 落ちているときでも画面の動きを確認できる
 */
export type MockMode = 'off' | 'server' | 'local'

/** ローカルモックの疑似待ち時間。ローディング表示を目視で確認するため */
const LOCAL_MOCK_DELAY_MS = 1500

/** 現在の URL から `?mock=` を読む */
export function readMockMode(search: string = window.location.search): MockMode {
  const value = new URLSearchParams(search).get('mock')
  if (value === null || value === '' || value === '0') return 'off'
  return value === 'local' ? 'local' : 'server'
}

/**
 * 出来事のテキストを 4 ペルソナ分の解説に展開する。
 * 失敗したときはサーバーが返した `error` の文をそのまま持つ Error を投げる。
 */
export async function expand(
  text: string,
  options: { mock?: MockMode; signal?: AbortSignal } = {},
): Promise<ExpandResponse> {
  const mock = options.mock ?? 'off'

  if (mock === 'local') {
    await sleep(LOCAL_MOCK_DELAY_MS, options.signal)
    return MOCK_RESPONSE
  }

  const url = mock === 'server' ? '/api/expand?mock=1' : '/api/expand'
  const body: ExpandRequest = { text }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  const raw = await res.text()

  if (!res.ok) {
    // サーバーは { error: string } を返す。画面に出すのは中の文だけでよい。
    // BE 未実装のときは HTML の 404 が返るので、JSON でない場合も落ちないようにする
    throw new Error(pickErrorMessage(raw) || `/api/expand が ${res.status} を返しました`)
  }

  try {
    return JSON.parse(raw) as ExpandResponse
  } catch {
    throw new Error('サーバーの応答を読めませんでした（JSON ではありません）')
  }
}

function pickErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown }
    if (typeof parsed.error === 'string') return parsed.error
  } catch {
    // JSON でなければ諦めてステータスコードで伝える
  }
  return ''
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
