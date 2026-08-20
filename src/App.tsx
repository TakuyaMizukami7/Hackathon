import { useEffect, useState } from 'react'
import { fetchHealth, streamChat } from './shared/api'
import type { HealthResponse } from './shared/types'

/**
 * ここは「配線が生きているか」を確認するだけのページ。
 * 当日はこの中身を消して、src/features/ の各機能を並べる場所にする。
 *
 * ★ App.tsx は 2 人が同時に触る唯一の画面ファイル。
 *   ロジックを書かず、<FeatureA /> <FeatureB /> を並べるだけに保つこと。
 *   そうすれば差分が 1 行ずつになり、コンフリクトしてもすぐ直せる。
 */
export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState('自己紹介を1文でしてください。')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((e: unknown) => setHealthError(e instanceof Error ? e.message : String(e)))
  }, [])

  async function onAsk() {
    setBusy(true)
    setAnswer('')
    try {
      await streamChat([{ role: 'user', content: prompt }], (delta) =>
        setAnswer((prev) => prev + delta),
      )
    } catch (e) {
      setAnswer(`エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1>{import.meta.env.VITE_APP_NAME ?? 'Hackathon App'}</h1>
      <p className="lead">
        ハッカソン当日の土台。デプロイ・API・LLM の配線がつながっているかをここで確認する。
      </p>

      <section className="panel">
        <h2>1. サーバー疎通 (/api/health)</h2>
        {healthError && <p className="error">NG: {healthError}</p>}
        {!health && !healthError && <p>確認中…</p>}
        {health && (
          <ul>
            <li>サーバー応答: OK</li>
            <li>サーバー時刻: {health.time}</li>
            <li>環境: {health.env}</li>
            <li>稼働中のコミット: {health.commit}</li>
            <li>実行リージョン: {health.region}</li>
            <li>
              LLM APIキー: {health.hasApiKey ? '設定済み' : '未設定（下のチャットは動きません）'}
            </li>
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>2. LLM 疎通 (/api/chat)</h2>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
        <button type="button" onClick={onAsk} disabled={busy || !prompt.trim()}>
          {busy ? '生成中…' : '送信'}
        </button>
        {answer && <pre className="answer">{answer}</pre>}
      </section>
    </main>
  )
}
