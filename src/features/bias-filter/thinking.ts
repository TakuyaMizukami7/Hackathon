/**
 * 待ち時間の演出用（Issue #26 / FE-5）。
 *
 * ここの狙いは「読み込み中です」を綺麗に見せることではない。
 * **結果が返る前に 4 人の性格を伝えてしまうこと**。
 * 楽観主義者が「良い面を探しています」と言っている数秒間に、
 * 審査員はこのアプリが何をするものかを理解し終える。
 *
 * 定数とフックだけを置く。描画は PerspectiveItem / BiasFilter 側。
 */
import { useEffect, useState } from 'react'
import type { PersonaId } from '../../shared/types'

/**
 * ペルソナごとの「考え中」の独り言。
 *
 * 書くときのルール:
 *   1. 20 文字以内。ヘッドラインの行と同じ幅に収める
 *   2. その人しか言わない台詞にする（誰が言っても成立する文は削る）
 *   3. 結論は書かない。結論は API が返す本物の headline の仕事
 */
export const THINKING_LINES: Record<PersonaId, string[]> = {
  optimist: ['良い面を探しています', 'これは追い風では…？', '悪くない、むしろ最高かも'],
  conspiracist: ['裏を取っています', '誰が得をするか調べています', '発表のタイミングが妙だ'],
  historian2125: [
    '年表のどこに置くか考え中',
    '100年後から振り返っています',
    '教科書の一行を書いています',
  ],
  realist_investor: ['数字に落としています', 'どこに金が流れるか計算中', 'チャートを見ています'],
}

/** 独り言を入れ替える間隔 */
export const LINE_INTERVAL_MS = 2200

/** 4 人が一斉に喋り出さないようにするための、1 人あたりのずらし幅 */
export const LINE_STAGGER_MS = 260

/** 経過秒数の更新間隔 */
export const ELAPSED_TICK_MS = 100

/** これを超えたら「混み合っています」のフォローを出す。Gemini の 503 リトライ中でも壊れて見えないように */
export const LONG_WAIT_MS = 8000

/**
 * `active` の間だけ 0..count-1 を巡回する。
 * 最初の切り替えだけ `delayMs` ぶん遅らせて、4 人の口が同時に動くのを避ける。
 *
 * 2 回目以降の実行で 1 行目から始まらないことがあるが、それは直さない。
 * 直そうとすると effect の中で state をリセットすることになり、
 * 毎回よけいな再レンダーが 1 回増える。デモ的にも毎回同じ台詞から始まらない方が良い。
 */
export function useRotatingIndex(count: number, active: boolean, delayMs = 0): number {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!active || count <= 1) return

    let timer = window.setTimeout(function tick() {
      setStep((prev) => prev + 1)
      timer = window.setTimeout(tick, LINE_INTERVAL_MS)
    }, LINE_INTERVAL_MS + delayMs)

    return () => window.clearTimeout(timer)
  }, [count, active, delayMs])

  return active ? step % count : 0
}

/**
 * `startedAt`(performance.now() の値) からの経過ミリ秒。null の間は 0 で止まる。
 *
 * 進捗率は API から取れないので、代わりに**隠さず経過時間を出す**。
 * 「止まっているのでは」と思われるのを防ぐのが目的。
 *
 * 経過時間を state に持たず「今の時刻 - 開始時刻」で毎回求めているのは、
 * 実行のたびに state をリセットしなくて済むようにするため。
 * 前回の実行で止まった `now` が残っていても、引き算が負になるので 0 に丸めれば良い。
 */
export function useElapsedMs(startedAt: number | null): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setNow(performance.now()), ELAPSED_TICK_MS)
    return () => window.clearInterval(id)
  }, [startedAt])

  return startedAt === null ? 0 : Math.max(0, now - startedAt)
}

/** OS の「視差効果を減らす」設定。true なら独り言の入れ替えを止める */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}
