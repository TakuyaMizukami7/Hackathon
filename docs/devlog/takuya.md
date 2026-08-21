# 作業ログ — @TakuyaMizukami7

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

## 2026-08-21 — 土台の準備完了（ハッカソン前）

- **やったこと**: リポジトリの土台一式。Vite + React + TS（画面）/ Hono 常駐サーバー（`server/`）/
  Railway へのデプロイ配線 / CI（型・lint・フォーマット・ビルド）/ 2 人開発のルール整備
- **決めたこと**:
  - ホスティングは Railway。当日サービスが大きくなっても、リクエストサイズ・実行時間・
    WebSocket の制限に当たらないようにするため（Vercel Functions から乗り換え）
  - LLM は Gemini（`@google/genai`）。無料枠がありクレジット購入が不要なため
  - コンフリクト対策の要は「1 機能 = 1 ディレクトリ = 1 人が所有」。共有ファイルは痩せさせる
- **検証済み**: `/api/health`、静的配信、SPA フォールバック、`/api/chat` のエラー経路、
  ストリーミングが逐次で流れること（約0.4秒間隔で到着）
- **次やること**: Railway の初期設定 5 つ（[docs/DEPLOY.md](../DEPLOY.md)）。
  `GEMINI_API_KEY` を入れて `/api/health` の `hasApiKey` が true になれば全開通
- **未検証**: モデル ID `gemini-3.7-flash` の実呼び出し。弾かれたら環境変数 `LLM_MODEL` を
  `gemini-3.5-flash-lite` などに変えるだけで直る（コード変更不要）
- **相方への申し送り**: 作業前に [CLAUDE.md](../../CLAUDE.md) を読ませること
