import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 開発中、/api/* への通信をローカルの Hono サーバー(3000)へ転送する。
    // これで本番と同じ相対パス（fetch('/api/expand')）のまま開発できる。
    //
    // バックエンドは既存の Hono を拡張する方針で確定（#15 / BE-1 #8）。
    // `npm run dev` が web(5173) と api(3000) の両方を起動するので、追加の起動は要らない。
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
