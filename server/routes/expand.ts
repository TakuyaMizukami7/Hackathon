import { GoogleGenAI } from '@google/genai'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ExpandRequest, ExpandResponse } from '../../src/shared/types'
import { generateExpand, isRetryable, readableMessage } from '../lib/gemini'

/**
 * POST /api/expand
 *
 * BE-1 の時点ではモック応答(`?mock=1`)のみ実装する。
 * 実際の Gemini 呼び出しは BE-2 で追加する。
 * `?mock=1` は本番でも生かしておき、当日 Gemini が落ちたときのデモの保険にする。
 */
export const expand = new Hono()

// フロントは基本的に同一オリジン(Vite proxy / Railway 同居配信)から叩くが、
// Issue の要求どおり全オリジンを許可しておく。
expand.use('/', cors({ origin: '*' }))

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MOCK_RESPONSE: ExpandResponse = {
  summary: '大手SNSが表示順アルゴリズムの全面公開を発表した。',
  perspectives: [
    {
      id: 'optimist',
      persona: '楽観主義者',
      headline: '透明性の時代がついに来た',
      body: '素晴らしい決断だ。これで誰もが仕組みを理解し、より良い情報に出会える。他社も追随せざるを得ないだろう。インターネットは確実に良い方向へ進んでいる。私たちはその歴史的な転換点に立ち会っているのだ。',
      biasLevel: 4,
      keywords: ['透明性', '歴史的転換点', '進歩'],
    },
    {
      id: 'conspiracist',
      persona: '陰謀を疑う人',
      headline: '公開するのは「安全な部分」だけ',
      body: 'なぜ今なのか考えてみてほしい。規制の議論が本格化する直前だ。公開されるのは当たり障りのない部分だけで、本当に効いている仕組みは別にあるに違いない。見せられたものを信じさせることこそ、最も効率的な誘導なのだ。',
      biasLevel: 5,
      keywords: ['タイミング', '規制逃れ', '見せかけ'],
    },
    {
      id: 'historian2125',
      persona: '100年後の歴史家',
      headline: '21世紀前半のありふれた一幕',
      body: '当時の人々は「アルゴリズムの公開」に大きな意味を見出していた。しかし2125年の我々から見れば、これは情報統制が個別最適化へ移行する過程の、ごく初期の小さな出来事に過ぎない。当事者がそれを自覚していなかった点だけが興味深い。',
      biasLevel: 3,
      keywords: ['過渡期', '相対化', '無自覚'],
    },
    {
      id: 'realist_investor',
      persona: '現実主義の投資家',
      headline: '広告単価への影響が全て',
      body: '感情論は不要だ。論点は一つ、これが広告単価とユーザー滞在時間にどう効くか。公開はブランド毀損リスクのヘッジであり、規制コストの前払いに過ぎない。株価は短期的に反応するだろうが、6ヶ月後には織り込まれて元に戻る。',
      biasLevel: 4,
      keywords: ['広告単価', 'リスクヘッジ', '織り込み済み'],
    },
  ],
  model: 'mock',
  elapsedMs: 1500,
}

expand.post('/', async (c) => {
  let payload: ExpandRequest
  try {
    payload = await c.req.json<ExpandRequest>()
  } catch {
    return c.json({ error: 'リクエストボディが JSON ではありません' }, 400)
  }

  const text = payload.text
  if (typeof text !== 'string' || text.length < 1 || text.length > 400) {
    return c.json({ error: 'text は 1〜400 文字で入力してください' }, 400)
  }

  if (c.req.query('mock') === '1') {
    await sleep(1500)
    return c.json(MOCK_RESPONSE, 200)
  }

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

  const ai = new GoogleGenAI({ apiKey })

  let result: ExpandResponse
  try {
    result = await generateExpand(ai, text)
  } catch (err) {
    const detail = readableMessage(err)
    if (isRetryable(err)) {
      // Gemini 側の一時的な混雑。こちらのバグではないと分かる文面にする
      return c.json(
        { error: `Gemini が混雑しています。数十秒待ってもう一度送ってください。詳細: ${detail}` },
        503,
        { 'retry-after': '10' },
      )
    }
    return c.json({ error: `Gemini の呼び出しに失敗しました: ${detail}` }, 502)
  }

  return c.json(result, 200)
})
