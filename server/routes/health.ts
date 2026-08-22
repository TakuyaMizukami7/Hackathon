import { Hono } from 'hono'
import type { HealthResponse } from '../../src/shared/types'

/**
 * GET /api/health
 *
 * Railway のヘルスチェック先でもあり、人間用の状態確認ページでもある。
 * デプロイ直後とデモ直前にここを開けば、
 * 「サーバーが生きているか」「APIキーが入っているか」
 * 「今動いているのはどのコミットか」が一目で分かる。
 */
export const health = new Hono()

// server/routes/chat.ts の既定値と合わせてある（Gemini を呼ばずに確認したいだけなので、
// あちらを import はせず値だけ重複させる。CLAUDE.md の「重複を許す」方針に沿う）。
const DEFAULT_MODEL = 'gemini-3.7-flash'

health.get('/', (c) => {
  const body: HealthResponse = {
    ok: true,
    time: new Date().toISOString(),
    region: process.env.RAILWAY_REPLICA_REGION ?? 'local',
    env: process.env.RAILWAY_ENVIRONMENT_NAME ?? 'local',
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    // 実際に Gemini を呼ばずに、今設定されている本命モデルだけ確認できるようにする
    model: process.env.LLM_MODEL ?? DEFAULT_MODEL,
  }
  return c.json(body, 200, { 'cache-control': 'no-store' })
})
