# 作業ログ — @keapla

新しいエントリは**この行のすぐ下**に足す（新しい順）。

---

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
