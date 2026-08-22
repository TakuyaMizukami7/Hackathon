/**
 * 通信ゼロで UI を作り切るためのモック。
 * 中身は docs/PLAN_BIAS_FILTER.md 1-4 の応答例そのまま。
 * BE の `POST /api/expand?mock=1` が返すものと同じ形。
 */
import type { ExpandResponse } from '../../shared/types'

export const MOCK_RESPONSE: ExpandResponse = {
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

/** モックの入力例。textarea の初期値に使う */
export const MOCK_INPUT = '大手SNSが、投稿の表示順を決めるアルゴリズムを全面公開すると発表した。'
