import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 開発中、/api/* への通信をローカルの Hono サーバー(3000)へ転送する。
    // これで本番と同じ相対パス（fetch('/api/chat')）のまま開発できる。
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
