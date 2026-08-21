# CLAUDE.md

このファイルは**新しいチャットを開くたびに毎回読み込まれる**。ここに書いてあることは必ず守る。

---

## 0. 作業を始める前に必ずやること（最優先）

新しいチャットでは、あなたはこのプロジェクトの状況を知らない。
**ユーザーの依頼に取りかかる前に、次の 4 つを実行して現状を把握すること。**

```bash
git log --oneline -20          # 1. これまでの開発の流れ
git status && git branch       # 2. 今どのブランチにいるか、未コミットの変更があるか
cat src/shared/types.ts        # 3. フロントとサーバーの契約（今の設計の中心）
cat docs/devlog/*.md           # 4. 2人それぞれの直近の作業ログと申し送り
```

そのうえで [AGENTS.md](AGENTS.md) を読む。**`/catchup` と打てばこの手順をまとめて実行できる。**

なお 1〜4 はセッション開始時に自動で読み込まれる（`.claude/settings.json` の SessionStart フックが
`.claude/hooks/catchup.mjs` を実行する）。手元に情報が既にある場合、同じコマンドを打ち直す必要はない。

把握した内容を 3〜5 行でユーザーに要約してから、依頼に取りかかること。
（例：「今 main にいて未コミットの変更なし。直近は写真アップロードのUIまで完成、
`/api/photo` は未着手。相方が types.ts に PhotoResult 型を追加済み」）

---

## 1. このプロジェクトは何か

AI ハッカソン（当日テーマ発表・3分デモ審査）用のリポジトリ。**2 人で同時に開発する。**

- **画面**: Vite + React + TypeScript（`src/`）
- **サーバー**: Hono の常駐サーバー（`server/`）。`/api/*` の処理と `dist/` の配信
- **LLM**: Gemini（`server/routes/chat.ts` でストリーミング中継）
- **公開先**: Railway。`main` にマージすると本番URLが自動更新される

審査基準に「**事前の作り込みは評価しない**」があるため、当日までは土台と配線だけ。
機能は当日ゼロから作る。詳細は [docs/HACKATHON_DAY.md](docs/HACKATHON_DAY.md)。

---

## 2. 絶対に守るルール（違反すると相方の作業が壊れる）

1. **`main` で直接作業しない。** 必ずブランチを切る（後述の手順）
2. **担当ディレクトリの外を触らない。** 他人の `src/features/<機能>/` は読むだけ
3. **一括リファクタ・一括整形・「ついでの改善」をしない。** 頼まれた差分だけを出す
4. **`src/shared/types.ts` の既存フィールドをリネーム/削除しない。** 追加のみ
5. **API キーを `src/` 配下に書かない。** 秘密情報はサーバー側の環境変数だけ
6. **`git push --force` と `git reset --hard` を勝手に実行しない。** 必ずユーザーに確認する

---

## 3. Git の手順（この通りに進める）

### 作業を始めるとき

```bash
git switch main && git pull
git switch -c feat/<github-id>/<topic>    # 例: feat/takuya/photo-upload
```

**すでに main 以外のブランチにいる場合は、勝手に切り替えない。** ユーザーに確認する。

### 作業中

```bash
git add -A
git status                                 # ★担当外のファイルが入っていないか必ず確認
git commit -m "feat: 写真アップロードのUIを追加"
```

担当外のファイルが混ざっていたら `git restore --staged <file>` で外す。
コミットは小さく、頭に `feat:` / `fix:` / `chore:` / `wip:` を付ける（日本語でよい）。

### 出来たら

```bash
npm run check                              # 型 + lint + フォーマット。通してから push
git push -u origin HEAD
gh pr create --fill
```

PR 本文には「相方への申し送り」を書く（共有ファイルを触ったなら必ず）。

### マージ

**レビュー待ちはしない。** CI が緑になり、プレビューURLで動作を確認できたらセルフマージしてよい。

```bash
gh pr checks --watch                       # CI の完了を待つ
gh pr merge --squash --delete-branch
git switch main && git pull
```

### コンフリクトしたとき

```bash
git fetch origin
git rebase origin/main                     # 自分のブランチ上で解決する
```

10 分かかっても解けないなら、**自分の変更を捨てて作り直す方が速い**ことが多い。
その判断はユーザーに確認してから行う。

---

## 4. 作業を終えるとき（次のチャットへの引き継ぎ）

**キリのいい所まで進んだら、必ず自分の作業ログを更新する。**
これをやらないと、次のチャットのあなたと相方が状況を追えない。

`docs/devlog/<github-id>.md` の**一番上**に 1 エントリ追記する（`/handoff` でもできる）。
他人のログファイルは絶対に触らない。

```markdown
## 2026-11-07 15:30 — 写真アップロードのUI

- **やったこと**: `src/features/photo-upload/` に PhotoUpload.tsx を追加。プレビュー表示まで動く
- **決めたこと**: 画像はクライアント側で長辺 1024px に縮小してから送る（4.5MB 制限の回避ではなく速度のため）
- **次やること**: `server/routes/photo.ts` を作る
- **相方への申し送り**: `src/shared/types.ts` に `PhotoResult` 型を追加した
```

---

## 5. もっと詳しく

| ファイル | 中身 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | AI 向けの詳細ルール（触ってよい場所・禁止事項） |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 人間向けの開発ルール・担当表 |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Railway の設定と当日の運用 |
| [docs/HACKATHON_DAY.md](docs/HACKATHON_DAY.md) | 当日のタイムラインと事故対応 |
