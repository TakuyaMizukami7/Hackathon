import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 開発中、/api/* への通信をローカルの FastAPI(8000) へ転送する。
    // これで本番と同じ相対パス（fetch('/api/expand')）のまま開発できる。
    //
    // バックエンドは FastAPI に決定した（#15）。既存の Hono(3000) はもう
    // /api/* を受け取らないので、`npm run dev:api` とは別に uvicorn を 8000 で起動する。
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
