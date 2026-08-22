import { useEffect, useRef, useState } from 'react'
import type { ExpandResponse } from '../../shared/types'
import { PerspectiveList } from './PerspectiveList'
import { MAX_TEXT_LENGTH } from './personas'
import { MOCK_INPUT } from './mock'
import { expand, readMockMode } from './api'
import './bias-filter.css'

/** 画面の状態はこの 4 つだけ。状態管理ライブラリは入れない */
type Status = 'idle' | 'loading' | 'done' | 'error'

/**
 * Bias Filter ▽ の画面。
 *
 * 待ち時間を「間」にしないのがここの肝。
 * loading 中もペルソナ名つきのドロップダウンを 4 つ先に描き、
 * 本文にあたる部分だけスケルトンにする（PerspectiveItem 側）。
 */
export function BiasFilter() {
  const [text, setText] = useState(MOCK_INPUT)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ExpandResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  /** `?mock=` の判定は起動時に 1 回だけ */
  const [mock] = useState(readMockMode)
  /** 実行中のリクエスト。連打とアンマウント後の setState を防ぐ */
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  const remaining = MAX_TEXT_LENGTH - text.length
  const loading = status === 'loading'

  async function run(input: string) {
    if (inFlight.current) return // 連打しても 2 本目は飛ばさない
    const controller = new AbortController()
    inFlight.current = controller

    setStatus('loading')
    setErrorMessage('')
    setResult(null)

    try {
      const response = await expand(input, { mock, signal: controller.signal })
      setResult(response)
      setStatus('done')
    } catch (e) {
      if (controller.signal.aborted) return // アンマウント時。画面はもう無い
      setErrorMessage(e instanceof Error ? e.message : String(e))
      setStatus('error')
    } finally {
      if (inFlight.current === controller) inFlight.current = null
    }
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
          onClick={() => void run(text)}
          disabled={loading || text.trim().length === 0}
        >
          {loading ? '展開中…' : '▽ 展開する'}
        </button>
      </div>

      {status === 'error' && (
        <div className="bf__error" role="alert">
          <span className="bf__error-text">{errorMessage}</span>
          <button type="button" className="bf__retry" onClick={() => void run(text)}>
            もう一度
          </button>
        </div>
      )}

      {(loading || result) && (
        <div className="bf__result">
          {result ? (
            <p className="bf__summary">{result.summary}</p>
          ) : (
            <p className="bf__summary bf__summary--skeleton" aria-hidden="true" />
          )}
          <PerspectiveList perspectives={result?.perspectives ?? []} loading={loading} />
        </div>
      )}
    </section>
  )
}
