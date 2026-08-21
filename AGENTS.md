# AGENTS.md — AI エージェント向けの作業ルール

このリポジトリは **2 人が同時に、それぞれ AI エージェントを使って**開発する。
最大のリスクはコンフリクトと、担当外ファイルの巻き込み事故。以下を必ず守ること。

## 作業を始める前に必ずやること

新しいチャットのあなたは、このプロジェクトの現状を知らない。
**依頼に取りかかる前に**、次を実行して現状を把握し、3〜5 行で要約して報告すること。

```bash
git log --oneline -20          # これまでの開発の流れ
git status && git branch       # 今どのブランチか、未コミットの変更があるか
cat src/shared/types.ts        # フロントとサーバーの契約（設計の中心）
cat docs/devlog/*.md           # 2人それぞれの直近の作業ログと申し送り
```

Claude Code なら `/catchup` でこの手順をまとめて実行できる。

## このプロジェクト

- Vite + React + TypeScript の SPA。ホスティングは **Railway**。
- `server/` 配下は Hono の常駐サーバー。`/api/*` を処理し、ビルド済みの `dist/` も配信する。
  LLM の呼び出しは**必ずここ**（サーバー側）を経由する。
- 詳しい開発ルールは [CONTRIBUTING.md](CONTRIBUTING.md)。

## 触ってよい場所 / いけない場所

**指示されたディレクトリの中だけを変更する。** 担当は CONTRIBUTING.md の担当表を見る。

| 場所 | 扱い |
| --- | --- |
| `src/features/<担当機能>/` | 自由に書いてよい |
| `server/routes/<自分が作ったファイル>.ts` | 自由に書いてよい |
| `src/shared/`, `src/App.tsx`, `src/index.css`, `server/index.ts` | **共有。指示された変更だけを最小差分で。** |
| `package.json`, `railway.json`, `tsconfig*.json`, `.github/` | **明示的に頼まれた時だけ触る** |
| `docs/devlog/<自分のID>.md` | 自分の作業ログ。作業のたびに追記する |
| `src/features/<他人の機能>/`, `docs/devlog/<他人のID>.md` | **絶対に触らない**（読むのは可） |

## 禁止事項

- **一括リファクタ・一括整形・import の並べ替え。** 頼まれていない変更を混ぜない。
- 「ついでに改善しておきました」。差分が増えるほどコンフリクトが増える。
- 動いているコードの書き換え（リネーム含む）を、頼まれていないのに行うこと。
- 既存の共有型（`src/shared/types.ts`）のフィールドをリネーム／削除すること。
  **追加は可。変更は人間の合意が要る。**
- API キーをクライアント側（`src/` 配下）に書くこと。`VITE_` 付きの環境変数は
  ブラウザにそのまま埋め込まれる。秘密情報は `VITE_` を付けない。

## 書き方の方針

- **重複を許す。** 共通化のために他人のファイルへ手を伸ばすより、自分の機能内にコピーする。
- 新しいコンポーネントは `src/features/<機能>/` の中に作る。`src/components/` を新設しない。
- 新しい API は `server/routes/<名前>.ts` を新規作成し、`server/index.ts` に 1 行だけ足す。
- CSS は機能ディレクトリの中に置く。`src/index.css` に追記しない。
- `index.ts` による re-export のまとめを作らない。
- 3 分のデモ審査で動くことが最優先。抽象化・汎用化・将来の拡張性は考えない。

## Git の手順（この通りに進める）

### 作業を始めるとき

```bash
git switch main && git pull
git switch -c feat/<github-id>/<topic>    # 例: feat/takuya/photo-upload
```

- **`main` で直接作業・コミットしない。** 必ずブランチを切る
- すでに main 以外のブランチにいる場合、**勝手に切り替えない。** ユーザーに確認する

### コミットするとき

```bash
git add -A
git status                                 # ★担当外のファイルが入っていないか必ず確認
git commit -m "feat: 写真アップロードのUIを追加"
```

- 担当外が混ざっていたら `git restore --staged <file>` で外す
- 小さく刻む。頭に `feat:` / `fix:` / `chore:` / `wip:` を付ける（日本語でよい）

### PR を出してマージするまで

```bash
npm run check                              # 通してから push する
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch                       # CI の完了を待つ
gh pr merge --squash --delete-branch       # CI が緑ならセルフマージしてよい
git switch main && git pull
```

- **レビュー待ちはしない。** PR の目的はコンフリクトの早期検知とプレビューURLの取得
- **CI が赤いままマージしない**
- 共有ファイルを触ったら、PR 本文の「相方に知らせること」に必ず書く
- Claude Code なら `/ship` で 1〜7 をまとめて実行できる

### コンフリクトしたとき

```bash
git fetch origin
git rebase origin/main                     # 自分のブランチ上で解決する
```

10 分かけて解けないなら、変更を捨てて作り直す方が速いことが多い。
その判断は**ユーザーに確認してから**行う。

### 絶対にやらないこと

- `git push --force`（相方の履歴を壊す）
- `git reset --hard`（相方の作業を消しうる）
- `main` への直 push
- 相方のブランチへの push

どうしても必要な場面では、実行せずユーザーに確認する。

## 作業の終わり方

1. `npm run check` を通す（型 + lint + フォーマット）
2. `git diff --stat` で担当外のファイルが混ざっていないか確認する
3. **`docs/devlog/<自分のID>.md` の一番上に作業ログを 1 エントリ追記する**
   （Claude Code なら `/handoff`）。他人のログファイルには絶対に書かない

3 を飛ばすと、次のチャットのあなたと相方が状況を追えなくなる。**必ずやること。**

```markdown
## 2026-11-07 15:30 — 写真アップロードのUI

- **やったこと**: `src/features/photo-upload/` に PhotoUpload.tsx を追加。プレビューまで動く
- **決めたこと**: 画像はクライアント側で長辺 1024px に縮小してから送る
- **次やること**: `server/routes/photo.ts` を作る
- **相方への申し送り**: `src/shared/types.ts` に `PhotoResult` 型を追加した
```

**事実だけを書く。** 動いていないものを「完成」と書かない。未検証は「未検証」と書く。

## 環境変数

- サーバー専用（秘密）: `GEMINI_API_KEY` など。`server/` からのみ `process.env` で読む。
- ブラウザ公開: `VITE_` プレフィックス必須。**秘密情報を入れない。**
- ローカルは `.env.local`（git 管理外）、本番は Railway の Variables。
