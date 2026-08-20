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

health.get('/', (c) => {
  const body: HealthResponse = {
    ok: true,
    time: new Date().toISOString(),
    region: process.env.RAILWAY_REPLICA_REGION ?? 'local',
    env: process.env.RAILWAY_ENVIRONMENT_NAME ?? 'local',
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  }
  return c.json(body, 200, { 'cache-control': 'no-store' })
})
