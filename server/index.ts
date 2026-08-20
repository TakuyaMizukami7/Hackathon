import { existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { chat } from './routes/chat'
import { health } from './routes/health'

/**
 * Railway で動く常駐サーバー。役割は 2 つだけ。
 *   1. /api/* … サーバー側の処理（LLM 呼び出しなど）
 *   2. それ以外 … vite build した dist/ を配信
 *
 * ★ このファイルは 2 人が同時に触る共有ファイル。
 *   ルーティングを 1 行足すだけの場所に保つこと（App.tsx と同じ考え方）。
 *   処理は server/routes/<エンドポイント>.ts の中に書く。
 */

const app = new Hono()

// --- API ルート（1 エンドポイント = 1 ファイル = 1 人が所有）---
app.route('/api/health', health)
app.route('/api/chat', chat)

// --- フロントの配信 ---
const distIndex = './dist/index.html'
if (existsSync(distIndex)) {
  app.use('/*', serveStatic({ root: './dist' }))
  // SPA なので、見つからないパスは index.html を返す
  app.get('*', serveStatic({ path: distIndex }))
} else {
  // ローカルで `npm run dev` 中は dist/ が無い。UI は Vite 側(5173)を見る
  app.get('*', (c) =>
    c.text('ビルド成果物(dist/)がありません。UI は http://localhost:5173 を開いてください。', 404),
  )
}

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`[server] listening on http://0.0.0.0:${info.port}`)
})
