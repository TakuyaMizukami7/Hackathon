import type { HealthResponse } from '../src/shared/types'

/**
 * GET /api/health
 * 疎通確認用。デプロイ直後とデモ直前にここを開けば
 * 「サーバーが動いているか」「APIキーが本番に入っているか」が一目で分かる。
 */
export default {
  async fetch(): Promise<Response> {
    const body: HealthResponse = {
      ok: true,
      time: new Date().toISOString(),
      region: process.env.VERCEL_REGION ?? 'local',
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    }
    return Response.json(body, {
      headers: { 'cache-control': 'no-store' },
    })
  },
}
