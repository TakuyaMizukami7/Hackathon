# 作業ログ — @TakuyaMizukami7

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

## 2026-08-22 — FE-2 API 連携（/api/expand）と待ち時間のスケルトン

- **やったこと**: `src/features/bias-filter/api.ts` を追加（[#5](https://github.com/TakuyaMizukami7/Hackathon/issues/5)）。
  `expand(text, { mock, signal })` で `POST /api/expand` を叩く。`BiasFilter.tsx` は
  `idle / loading / done / error` の 4 状態だけを `useState` で持つ。
  loading 中もペルソナ名つきの空アコーディオンを 4 つ描き、見出しだけ pulse スケルトンにする
- **決めたこと**:
  - **`api.ts` は `src/shared/api.ts` ではなく機能ディレクトリに置いた**。共有ファイルの
    コンフリクトを避けるため。shared 側は health / chat のまま触っていない
  - **`?mock=` は 3 値**。`off`（本番）/ `1`→`server`（BE の `/api/expand?mock=1` を叩く）/
    `local`（ブラウザ内の MOCK_RESPONSE を 1.5 秒待って返す・通信ゼロ）。
    `local` は **BE-1 が未着手でも画面の動きを確認できる逃げ道**で、当日 BE が落ちたときの保険にもなる
  - エラー本文は `res.text()` してから JSON を試す。BE 未実装だと HTML の 404 が返るので、
    `res.json()` だと画面が別のエラーで壊れる
  - 連打防止は `useRef<AbortController>`。アンマウント時は abort して setState しない
  - 4 件揃わずに返ってきたペルソナは「この視点は返ってきませんでした」を出す（レイアウトは崩さない）
- **検証済み**: スタブサーバー相手に `expand()` を 10 ケース（`?mock=` の解釈 / 成功 /
  サーバーの `error` 文の素通し / HTML 404 / abort / サーバー停止）。
  `PerspectiveList` を SSR して loading 時にペルソナ名 4 つ + スケルトン 4 本が出ることを確認。
  `npm run check` と `npm run build` は通っている
- **未検証**: **ブラウザでの目視**と、**実際の `/api/expand?mock=1` との疎通**（BE-1 が未着手のため）。
  → [#14](https://github.com/TakuyaMizukami7/Hackathon/issues/14) に切り出した
- **次やること**: FE-3（アコーディオンのアニメーション）。BE-1 が入ったら #14 の疎通確認
- **相方への申し送り**:
  - **バックエンドは FastAPI に決定（[#15](https://github.com/TakuyaMizukami7/Hackathon/issues/15)）。
    `vite.config.ts` の proxy を `http://localhost:8000` に変えた。**
    既存の Hono(3000) はもう `/api/*` を受け取らないので、開発中は uvicorn を 8000 で起動すること。
    `npm run dev:api`（Hono）と Railway の start コマンドの差し替えは BE-1
    ([#8](https://github.com/TakuyaMizukami7/Hackathon/issues/8)) 側でお願いしたい
  - フロントは `POST /api/expand` に `{ text }` を投げ、`?mock=1` が付いたら固定応答を期待する。
    エラーは **HTTP ステータス + `{ error: string }`** で返してほしい（その文をそのまま画面に出す）

## 2026-08-22 — FE-1 ペルソナ定数とモック駆動の UI 骨組み

- **やったこと**: `src/features/bias-filter/` に FE-1 一式（[#4](https://github.com/TakuyaMizukami7/Hackathon/issues/4) / PR #13）。
  `personas.ts`（PERSONA_META・MAX_TEXT_LENGTH）/ `mock.ts`（MOCK_RESPONSE）/
  `BiasFilter.tsx` / `PerspectiveList.tsx` / `PerspectiveItem.tsx` / `bias-filter.css`。
  通信ゼロで 4 つのアコーディオンが開閉する
- **決めたこと**:
  - **`src/shared/types.ts` にプラン 1-3 の型を先に入れた**（BE 担当の想定だったが FE-1 が書けないため）。
    `PersonaId` / `PERSONA_IDS` / `Perspective` / `ExpandRequest` / `ExpandResponse` の**追加のみ**
  - `PerspectiveList` は API の返り順を信用せず `PERSONA_IDS` の順で描く
  - `PerspectiveItem` の `perspective` は省略可能（未生成なら見出しが「生成中…」）。
    FE-2 のローディング表示はここに繋ぐだけでよい設計にした
  - CSS は機能ディレクトリ内で完結。`src/index.css` には足していない
- **未検証**: ブラウザでの目視確認。型 / lint / フォーマット / `npm run build` は通っている
- **次やること**: FE-2。`BiasFilter.tsx` の `handleExpand()` を `fetch('/api/expand')` に差し替える
- **相方への申し送り**: 上記のとおり **types.ts に 5 つの型を追加済み**。BE 側で重複追加しないこと。
  `src/App.tsx` は `<BiasFilter />` の 1 行追加だけ

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
