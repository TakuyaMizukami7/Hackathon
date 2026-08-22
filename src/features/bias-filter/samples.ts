/**
 * デモ用のサンプル入力。
 *
 * 3 分のデモ中に文章を打つ余裕はない。チップを 1 クリックで textarea に
 * 流し込めるようにしておく（Issue #7）。
 *
 * 文面は BE-3 が出力を確認したものと同じにすること。
 * 変えると本番でどんな解説が返るかを事前に確認できなくなる。
 */
export type SampleInput = {
  /** チップに出す短い名前 */
  label: string
  /** textarea に流し込む本文 */
  text: string
}

export const SAMPLE_INPUTS: SampleInput[] = [
  {
    label: 'SNSのアルゴリズム公開',
    text: '大手SNSが表示順アルゴリズムを全面公開すると発表した',
  },
  {
    label: '自動運転タクシー解禁',
    text: '自動運転タクシーが市内全域で解禁された',
  },
  {
    label: '新作おにぎり発売',
    text: 'コンビニの新作おにぎりが発売された',
  },
]
