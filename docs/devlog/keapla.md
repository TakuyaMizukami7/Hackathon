# 作業ログ — @keapla

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

## 2026-08-22 — プロンプト改修 + 偏り強調表示 + 5人目「過激派宇宙人」追加

- **やったこと**:
  - `server/prompts/expand.ts` の `SYSTEM_PROMPT`/`buildUserPrompt()` を全面書き直し。読みにくかった箇所に改行を入れ、「〜してください」調をやめて言い切り調にし、両論併記禁止などの核心ルールを強めに書いた。「不自然な文・尻切れの文を書くな」というルールも追加
  - body の中でもっとも偏りが強い一文をMarkdown太字(`**...**`)で囲むようプロンプトに指示を追加。表示側は太字を強調表示するだけの最小変更にする方針にした
  - 5人目のペルソナ「過激派宇宙人」(id: `alien_invader`)を追加。`src/shared/types.ts`(`PersonaId`/`PERSONA_IDS`、追加のみ)、`server/lib/gemini.ts`(`EXPAND_SCHEMA` の `minItems`/`maxItems` を5に)、`server/routes/expand.ts`(`MOCK_RESPONSE` に5人目を追加)を対応
  - 太字→`<strong>`変換の表示ロジック、`personas.ts`のペルソナメタ、`thinking.ts`の独り言も含め、本来 `src/features/bias-filter/` はtakuya担当だが、今回はユーザー指示で担当領域を区切らず自分が一括で実装した
- **決めたこと**: フロント側に正規表現ハイライトの新規ロジックを書く代わりに、Markdown太字をプロンプト側で出させて`<strong>`に変換するだけの最小差分にした(`dangerouslySetInnerHTML`は使っていない)
- **検証済み**: `npm run check` 通過。ローカルで `POST /api/expand?mock=1` を実行し、5人分の`perspectives`(`alien_invader`含む)が返ること、太字部分が`<strong class="bf-item__emphasis">`として分離レンダリングされ`font-weight:700`・ペルソナ色が効いていることをブラウザで確認。既存4ペルソナのアコーディオン開閉・エントランスアニメーションが壊れていないことも確認
- **未検証**: `GEMINI_API_KEY`を使った実際のGemini呼び出しでの5人分・スキーマ検証(ローカルにキー未設定のため未実施)
- **相方への申し送り**: `src/features/bias-filter/personas.ts`・`PerspectiveItem.tsx`・`bias-filter.css`・`BiasFilter.tsx`・`PerspectiveList.tsx`・`thinking.ts` に手を入れた(5人目ペルソナ対応・太字強調表示・「4人」→「5人」表記修正)。担当外だが今回はユーザー指示で一括実装した

## 2026-08-22 — BE-2/BE-3/BE-4: Gemini組み込み・プロンプト・デプロイ堅牢化(並行実装)

- **やったこと**: BE-2/BE-3/BE-4(Issue #9/#10/#11)を、3つのgit worktree+並行AIエージェントで同時実装した。
  - **事前準備**: `server/prompts/expand.ts` を空の契約(`SYSTEM_PROMPT` / `buildUserPrompt()`)だけ先にmainへマージし、BE-2とBE-3が同じファイルで待ち合わせずに並行実装できるようにした(#19)
  - **BE-3**: `server/prompts/expand.ts` の中身を実装。両論併記を禁止し4ペルソナが矛盾するようにする禁止事項ベースのシステムプロンプトと、`text`/`summary`/`perspectives` を組み立てるユーザープロンプトを実装(#20)
  - **BE-2**: `server/lib/gemini.ts` を新規作成。`chat.ts` の503リトライ・モデルフォールバックのパターンを非ストリーミング版として移植し、`responseSchema` でJSON構造化出力を強制。`server/routes/expand.ts` の未実装(501)部分をこの呼び出しに置き換えた(#21)
  - **BE-4**: `docs/DEPLOY.md` に予備キー切替手順・事故対応チェックリストを追記。`GET /api/health` に `model` フィールドを追加(`HealthResponse` に追記のみ、既存フィールドは無変更)(#22)
- **決めたこと**: 並行開発でのコンフリクトを避けるため、BE-2は`server/routes/expand.ts`+`server/lib/gemini.ts`、BE-3は`server/prompts/expand.ts`の中身のみ、BE-4はコードにほぼ触れずRailway運用ドキュメントを中心に担当を分割した。3ブランチとも `main` に対してほぼコンフリクトなくrebase・マージできた
- **検証済み**: ローカルで実際にGemini APIを呼び出し `POST /api/expand`(mockなし)を確認。4ペルソナ(optimist/conspiracist/historian2125/realist_investor)が明確に矛盾する内容を返すことを確認。`GET /api/health` に `model` フィールドが反映されていることも確認
- **未検証**: Railway本番URLでの `/api/expand`(実応答)の疎通確認。`GEMINI_API_KEY` の予備キーは未発行
- **次やること**: 本番デプロイ後に `docs/DEPLOY.md` のチェックリストに沿って本番疎通確認を行う
- **相方への申し送り**: `src/shared/types.ts` の `HealthResponse` に `model: string` を追加した(既存フィールドの変更・削除はなし)。フロント側で `HealthResponse` を型キャストのみで使っている箇所は影響なしのはず

## 2026-08-22 — BE-1: サーバー雛形 + モック応答

- **やったこと**: `server/routes/expand.ts` を新規作成し `server/index.ts` に1行だけ登録。
  `POST /api/expand?mock=1` が固定JSON(FEの `mock.ts` と同一内容)を1.5秒待って返す。
  `text` が空 or 401文字以上なら 400。CORS は全オリジン許可
- **決めたこと**: 既存の Hono サーバーを拡張する方針を採用(Issue #8 の推奨案)。
  `?mock=1` 以外(実際の Gemini 呼び出し)は BE-2 の範囲として今回は 501 を返すだけにした
- **検証済み**: ローカルで `GET /api/health`(200)、`POST /api/expand?mock=1`(200・本文はFEのモックと一致)、
  空文字/401文字での400、`?mock=1` なしでの501 を確認
- **未検証**: Railway へのデプロイ(本番URLでの疎通確認はこれから)
- **次やること**: PR を出して CI 確認 → マージ → Railway 本番URLで `/api/health` と `/api/expand?mock=1` を確認してフロント担当に共有
- **相方への申し送り**: `src/shared/types.ts` は FE-1 で既にマージ済みの内容をそのまま使っている(重複追加はしていない)
