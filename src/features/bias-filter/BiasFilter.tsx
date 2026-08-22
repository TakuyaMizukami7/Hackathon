import { useEffect, useRef, useState } from 'react'
import type { ExpandResponse } from '../../shared/types'
import { PerspectiveList } from './PerspectiveList'
import { MAX_TEXT_LENGTH } from './personas'
import { SAMPLE_INPUTS } from './samples'
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
  // デモは必ず空欄から始める。初期値を入れておくと
  // 「打たなくても出る」ように見えてチップの意味がなくなる
  const [text, setText] = useState('')
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
  const empty = text.trim().length === 0

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
        <h1 className="bf__title">Bias Filter ▽</h1>
        <p className="bf__lead">
          ひとつの出来事を、4 人の偏った語り手が同時に解説する。事実は 1 つ、解釈は 4 つ。
        </p>
      </header>

      <div className="bf__samples">
        <span className="bf__samples-label">お題を選ぶ</span>
        {SAMPLE_INPUTS.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className="bf__chip"
            onClick={() => setText(sample.text)}
            disabled={loading}
          >
            {sample.label}
          </button>
        ))}
      </div>

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
          disabled={loading || empty}
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

      {/* 審査員が最初に気にするのはここ。結果より下だが常に画面内に置く */}
      <footer className="bf__disclaimer">
        表示される解説は AI が特定の立場を演じたものです。事実ではありません。
      </footer>
    </section>
  )
}
