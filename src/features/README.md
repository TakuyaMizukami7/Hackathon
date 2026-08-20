# src/features/ — 機能ディレクトリ

**1 機能 = 1 ディレクトリ = 1 人が所有** する。コンフリクトを防ぐ最大の仕掛け。

```
src/features/
  photo-upload/     <- 担当: @person-a  … @person-b は開かない
    PhotoUpload.tsx
    usePhoto.ts
    photo-upload.css
  result-board/     <- 担当: @person-b  … @person-a は開かない
    ResultBoard.tsx
```

ルール:

- 自分の機能に必要なものは、多少重複しても自分のディレクトリの中に書く。
  共通化は「動いてから」でよい。ハッカソンでは重複 > 共有によるコンフリクト。
- 他人のディレクトリのファイルは読んでよいが、**書き換えない**。
  直したい所があれば本人に言う。
- 共有したくなったものだけ `src/shared/` に上げる（上げるときは一声かける）。
- `index.ts` で re-export をまとめない。全員が同じ行を触ることになる。

担当表は [../../CONTRIBUTING.md](../../CONTRIBUTING.md) に書く。
