import { useState } from 'react'
import type { ExpandResponse } from '../../shared/types'
import { PerspectiveList } from './PerspectiveList'
import { MAX_TEXT_LENGTH } from './personas'
import { MOCK_INPUT, MOCK_RESPONSE } from './mock'
import './bias-filter.css'

/**
 * Bias Filter ▽ の画面。
 *
 * FE-1 の時点では通信ゼロ。「▽ 展開する」を押すとモックを表示するだけ。
 * FE-2 でここの handleExpand の中身を fetch('/api/expand') に差し替える。
 */
export function BiasFilter() {
  const [text, setText] = useState(MOCK_INPUT)
  const [result, setResult] = useState<ExpandResponse | null>(null)

  const remaining = MAX_TEXT_LENGTH - text.length

  function handleExpand() {
    // FE-2 でここを API 呼び出しに差し替える
    setResult(MOCK_RESPONSE)
  }

  return (
    <section className="bf">
      <header className="bf__header">
        <h2 className="bf__title">Bias Filter ▽</h2>
        <p className="bf__lead">
          出来事をひとつ入力すると、4 人のペルソナがそれぞれの偏った視点で解説する。
        </p>
      </header>

      <textarea
        className="bf__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_TEXT_LENGTH}
        rows={4}
        placeholder="気になったニュースや出来事を貼り付ける"
      />

      <div className="bf__actions">
        <span className="bf__count">残り {remaining} 文字</span>
        <button
          type="button"
          className="bf__submit"
          onClick={handleExpand}
          disabled={text.trim().length === 0}
        >
          ▽ 展開する
        </button>
      </div>

      {result && (
        <div className="bf__result">
          <p className="bf__summary">{result.summary}</p>
          <PerspectiveList perspectives={result.perspectives} />
        </div>
      )}
    </section>
  )
}
