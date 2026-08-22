# 作業ログ — @keapla

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

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
