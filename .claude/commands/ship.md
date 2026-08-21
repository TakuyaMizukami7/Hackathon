---
description: 変更をコミットして PR を作り、CI が通ったらマージするところまで進める
---

今の変更を main に入れるところまで進めてほしい。**次の手順を飛ばさずに実行する。**

1. **担当外の混入チェック**

   ```bash
   git status
   git diff --stat
   ```

   頼まれていないファイル、担当外の `src/features/<他人の機能>/` が入っていたら
   **止まってユーザーに報告する。** 勝手にコミットしない。

2. **ブランチの確認**

   `main` にいる場合は、ここでブランチを切る。

   ```bash
   git switch -c feat/<github-id>/<topic>
   ```

3. **検査を通す**

   ```bash
   npm run check
   ```

   落ちたら直す。**通らないまま push しない。**

4. **コミットと push**

   ```bash
   git add -A
   git commit -m "<feat|fix|chore>: 変更内容（日本語でよい）"
   git push -u origin HEAD
   ```

5. **PR を作る**

   ```bash
   gh pr create --fill
   ```

   共有ファイル（`src/shared/types.ts` / `src/App.tsx` / `server/index.ts` /
   `package.json`）を触った場合は、PR 本文の「相方に知らせること」に必ず書く。

6. **CI を待ってマージ**

   ```bash
   gh pr checks --watch
   gh pr merge --squash --delete-branch
   git switch main && git pull
   ```

   CI が落ちたら**マージせずに**原因を報告する。

7. 最後に、PR の URL と、本番に反映されたかの確認方法
   （`https://<ドメイン>/api/health` の `commit` を見る）をユーザーに伝える。

**禁止**: `git push --force`、`git reset --hard`、CI が赤いままのマージ。
どうしても必要ならユーザーに確認を取る。
