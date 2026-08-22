# 作業ログ — @TakuyaMizukami7

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

## 2026-08-22 — Bias Filter ▽ の実装プランと Issue 8 件を用意

- **やったこと**: [docs/PLAN_BIAS_FILTER.md](../PLAN_BIAS_FILTER.md) を追加（#3 でマージ済み）。
  API 契約・MVP 仕分け・時間割・プロンプト設計をまとめ、GitHub に Issue #4〜#11 を登録
- **決めたこと**:
  - **ペルソナのカタログはフロント側の定数で固定**し、AI には中身だけを埋めさせる。
    これでフロントは API 完成前に UI を作り切れ、ローディング中もペルソナ名を先に出せる
  - **`POST /api/expand?mock=1` を最初に作る**。2 人が互いに待たないための生命線。
    本番でも残し、当日 Gemini が落ちたときのデモの保険にする
  - JSON は `response_schema`（Pydantic / responseSchema）で強制する。
    プロンプトで「JSON で返して」と頼むだけの実装はコードフェンスで必ず壊れる
  - 関門は 3 つ: 0:20 types.ts 凍結 / 0:40 デプロイ済み / 2:30 コードフリーズ
- **未決**: **バックエンドを FastAPI 新規にするか、既存 Hono に `/api/expand` を足すか。**
  当日の開始 10 分以内に 2 人で決める。既存 Hono ならデプロイ・CI・503 リトライを
  流用できて BE-1 が 15 分で終わる（FastAPI 新規は 45〜60 分）。プラン冒頭に比較表あり
- **次やること**: Railway の初期設定（`GEMINI_API_KEY` 投入 → `/api/health` の `hasApiKey`）。
  実キーでの `gemini-3.7-flash` 疎通確認は依然として未検証
- **相方への申し送り**: **`src/shared/types.ts` はまだ触っていない。** 当日 0:20 までに
  BE 担当が `PersonaId` / `PERSONA_IDS` / `Perspective` / `ExpandRequest` / `ExpandResponse` を
  **追加のみ**で入れて即マージする。確定形はプランの 1-3 にそのまま貼れる形で書いてある

---

## 2026-08-21 — /api/chat の 503(混雑) 対策

- **やったこと**: `server/routes/chat.ts` にリトライ + モデルのフォールバックを実装。
  Gemini が 503 UNAVAILABLE（高負荷）を返して 502 になっていた事象への対応。
  1 モデルにつき 3 回（400ms → 800ms の指数バックオフ + ジッタ）試し、
  ダメなら次のモデルへ。全滅したら 502 ではなく **503 + Retry-After: 10** を返す
- **決めたこと**:
  - 逃げ道のモデルは `LLM_FALLBACK_MODELS`（既定 `gemini-3.5-flash-lite,gemini-2.5-flash`）。
    コードを触らず Railway の Variables で差し替えられる
  - 恒久エラー（キー無効・モデルID違い = 400/401/403/404）はリトライせず即 502。デモ中に無駄に待たない
  - Gemini のエラーは JSON が三重に入れ子なので、一番内側の文だけを取り出して返す
  - どのモデルが答えたかはレスポンスヘッダ `x-llm-model` で確認できる
- **検証済み**: 偽 Gemini サーバーで (1) 全モデル 503 → 9 回試行して 4.7 秒で 503 応答、
  (2) 本命だけ 503 → `gemini-3.5-flash-lite` にフォールバックして 200 でストリーム、
  (3) 無効キー → リトライせず 0.5 秒で 502 + 「API key not valid」
- **次やること**: 実キーでの疎通（`gemini-3.7-flash` の実呼び出し確認）。Railway の初期設定 5 つ
- **相方への申し送り**: `src/shared/api.ts` の `streamChat()` のエラー処理だけ変更した。
  サーバーの `{ error }` を取り出して投げるので、画面に生 JSON が出なくなる（関数のシグネチャは不変）

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
