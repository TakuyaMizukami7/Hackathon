# CLAUDE.md

このリポジトリのルールは [AGENTS.md](AGENTS.md) にまとまっている。**作業前に必ず読むこと。**

要点だけ再掲：

- 指示されたディレクトリの中だけを変更する。他人の `src/features/<機能>/` は触らない。
- 一括リファクタ・一括整形・頼まれていない「ついでの改善」は禁止。
- LLM 呼び出しは必ず `server/` 配下（サーバー側）で行う。API キーを `src/` に書かない。
- 作業後に `npm run check` と `git diff --stat` を実行し、担当外のファイルが
  混ざっていないことを確認してから報告する。

人間向けの開発ルールは [CONTRIBUTING.md](CONTRIBUTING.md)。
