# 作業ログ — @TakuyaMizukami7

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

## 2026-08-22 13:50 — FE-4: デモ用の仕上げ（サンプルチップ・免責・タイトル）と配線サンプルの撤去

- **やったこと**（[#7](https://github.com/TakuyaMizukami7/Hackathon/issues/7)）:
  - `samples.ts` を新設し、**サンプル入力チップを 3 つ**（SNSのアルゴリズム公開 / 自動運転タクシー解禁 /
    新作おにぎり発売）。クリックで textarea に流し込む。文面は Issue #7 = BE-3 の確認済みと同じ
  - textarea の初期値を `MOCK_INPUT` から **空文字**に変更。空欄では `▽ 展開する` が disabled
  - `bf__title` を h2 → **h1**（配線サンプルを消して、これが画面唯一の見出しになったため）。
    キャッチコピーを「ひとつの出来事を、4 人の偏った語り手が同時に解説する。事実は 1 つ、解釈は 4 つ。」に
  - フッターに免責を常設（`bf__disclaimer`）: 「表示される解説は AI が特定の立場を演じたものです。事実ではありません。」
  - `index.html` の `<title>` を `Bias Filter ▽`、`public/favicon.svg` を絵文字 🔻 の SVG に差し替え
  - **配線サンプル（Hackathon App）を撤去**: `App.tsx` から `/api/health` と `/api/chat` の
    2 パネルを削除し、`<main><BiasFilter /></main>` だけにした。
    `src/index.css` からも、そこでしか使っていなかった `.lead` / `.answer` を削除
- **決めたこと**:
  - **`src/shared/api.ts`（`fetchHealth` / `streamChat`）とサーバーの `/api/chat` は残した。**
    画面から呼ばなくなっただけで、疎通確認と事故対応では今も使う（docs/DEPLOY.md の手順が参照している）
  - **`.panel` / `.error` は index.css に残す。** `ErrorBoundary` がまだ使っている
  - ヘッダー・免責は `App.tsx` ではなく `BiasFilter.tsx` に置いた。見た目は
    `src/features/bias-filter/` の中で完結させ、App.tsx は機能を並べるだけに保つため
  - チップは**流し込むだけで自動実行はしない**。`▽` を押す瞬間がデモの見せ場なので潰さない
- **検証済み（ヘッドレス Chrome + CDP で実際にクリックしてスクショ）**:
  - 初期表示: チップ 3 つ・空の textarea・**disabled のボタン**・免責が 1 画面に収まる
  - チップ「新作おにぎり発売」→ `▽` → **ローディング中はチップも disabled**、
    4 件のスケルトンとペルソナ名が出る → 完了後に 4 件すべて展開してもレイアウトが崩れない
  - `POST /api/expand?mock=1` に**サンプル 3 文すべて**を投げて 200 / 4 件 /
    `PERSONA_IDS` と同じ順で返ることを確認
  - `npm run check`（typecheck / oxlint / prettier）は通っている
- **未検証（ここだけ残っている）**:
  - **本番 URL での確認が丸ごと未消化。** 手元に Railway のドメインが無く、
    `docs/DEPLOY.md` にも実URLが書かれていない。`.env.local` も無いので
    **ローカルでは実 Gemini（`?mock=` なし）を一度も叩けていない**。
    → 本番 URL でサンプル 3 つとも結果が出ることの確認は、URL が分かり次第やる
  - 手で操作したときの滑らかさ（チップ → ▽ の一連の流れ）
- **次やること**: 本番 URL でサンプル 3 つの実応答を確認 → デモリハーサル
- **相方への申し送り**:
  - **`App.tsx` を大きく削った**（配線サンプルの 2 パネル）。ここは 2 人が触る唯一の画面ファイルなので、
    未マージのブランチがあるならコンフリクトに注意。今の中身は 3 行だけ
  - `src/shared/types.ts` は**変更なし**。サーバー側も**変更なし**
  - **`/api/health` の `model` フィールドが手元の :3000 の応答に無かった**が、
    これは前のセッションから残っていた古いプロセスが 3000 を掴んでいたため。
    `server/routes/health.ts:27` にはコードが入っているので実装の問題ではない

## 2026-08-22 13:20 — FE-3: 展開アニメーションと「▽」の演出

- **やったこと**（[#6](https://github.com/TakuyaMizukami7/Hackathon/issues/6)）: `PerspectiveItem.tsx` と
  `bias-filter.css` だけを変更。
  - 開閉を **`grid-template-rows: 0fr → 1fr` + transition 240ms** にした。`max-height` のハックは使っていない
  - 結果の 4 件が **80ms ずつずれて**下から浮かびながら現れる（`bf-item--in` + `nth-child` の `animation-delay`）
  - `▽` が開くと **180° 回転**して `△` になる
  - 開閉は排他にしない（4 つ同時に開いて見比べるのがこのアプリの肝）
- **決めたこと**:
  - **閉じている間も本文を DOM に残す。** 条件レンダリング（`{open && ...}`）に戻すと
    閉じるときのトランジションが効かなくなる
  - **`body` を 3 層にした**（`__body`=grid / `__body-clip`=overflow hidden / `__body-inner`=padding）。
    padding を grid item 側に置くと、`border-box` の都合で**閉じきっても下端が 14px ほど残る**
  - `__body-clip` は閉じている間 `visibility: hidden`（`transition-delay: 240ms` で閉じ終わってから消す）。
    こうすると隠れている本文に Tab が入らず、読み上げも拾わない
  - 演出の起点は **`perspective` が来たかどうか**（`ready`）。ローディング → 完了で class が付き、
    アニメーションが 1 回だけ走る
  - `biasLevel` のメーターと `keywords` のタグは FE-1 の時点で既にあったので触っていない
- **検証済み（Chrome ヘッドレスで実物のスクリーンショット）**:
  - **閉**: 4 件が同じ高さで並び、**padding の残りが無い**。入力欄 + 4 件の見出しが
    1920×1080 で**スクロールなしに収まる**（最下端 ≈ 695px）
  - **開**: 4 件すべて同時に開いてもレイアウトが崩れず、caret が △ に回っている
  - `npm run check`（typecheck / oxlint / prettier）は通っている
- **未検証**: **手で操作したときの滑らかさ**（開閉の途中経過とスタガーはスクショでは見えない）。
  ブラウザでの目視は引き続き [#14](https://github.com/TakuyaMizukami7/Hackathon/issues/14)
- **次やること**: #14 のブラウザ目視。BE-2 が入ったら本物の応答で 4 件のスタガーを確認する
- **相方への申し送り**: 触ったのは `src/features/bias-filter/` の 2 ファイルだけ。
  共有ファイル（`types.ts` / `vite.config.ts` / `App.tsx`）は**変更なし**

## 2026-08-22 — proxy を Hono(3000) に戻し、/api/expand と実疎通した

- **やったこと**: `vite.config.ts` の proxy 先を `http://localhost:8000` から
  **`http://localhost:3000` に戻した**。FE-2（#17）で一度 FastAPI 前提の 8000 に変えてしまったが、
  バックエンドは**既存 Hono を拡張する方針で確定**しており、相方の BE-1（#16）が
  `server/routes/expand.ts` として既にマージ済みだった
- **やらかし**: BE の方式が未決だと思い込んで proxy を書き換えた。
  **共有ファイル（`vite.config.ts`）を触る前に `git log` と相方の devlog を見れば防げた。**
  #15 は「FastAPI 採用」として閉じてしまったので、訂正コメントを入れて閉じ直した
- **検証済み（ようやく実物と）**: `npm run dev` の Vite proxy 越しに
  - `POST /api/expand?mock=1` → **200 / 4 件 / PERSONA_IDS と同じ順 / 1.56 秒**（モックの 1.5 秒待ち込み）
  - `?mock=1` なし → **501** `{"error":"モック以外の応答は未実装です(BE-2 で対応予定)"}`
  - 空文字 / 401 文字 → **400** `{"error":"text は 1〜400 文字で入力してください"}`
  - `GET /api/health` → 200
  エラーは全部 `{ error: string }` なので、FE はその文をそのまま赤枠に出せる。契約は一致している
- **環境メモ**: このマシンでは `npm run dev` の `dev:api`（`tsx watch`）が
  何も出さずに listen しないことがある。`npx tsx server/index.ts` なら普通に 3000 で上がる
- **未検証**: **ブラウザでの目視だけが残っている**（[#14](https://github.com/TakuyaMizukami7/Hackathon/issues/14)）。
  API 疎通の分は消化したので #14 はチェックを減らしてある
- **次やること**: FE-3（アコーディオンのアニメーション / #6）
- **相方への申し送り**:
  - **proxy は 3000。`npm run dev` だけで web(5173) と api(3000) が両方上がる。**追加の起動は要らない
  - BE-2 に入ったら `?mock=1` なしの 501 が本物の応答に変わる。FE 側は何も変えなくてよい

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
  - ~~バックエンドは FastAPI に決定。`vite.config.ts` の proxy を 8000 に変えた~~
    → **これは誤り。** 実際は既存 Hono を拡張する方針で確定していた（BE-1 は #16 でマージ済み）。
    proxy は 3000 に戻した。詳細は一番上のエントリを見ること
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
