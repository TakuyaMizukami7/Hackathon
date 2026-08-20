# Hackathon

AI ハッカソン用のリポジトリ。**当日は「画面とロジック」を書くだけ**で済むよう、
土台と公開の配線だけを先に用意してある。

- **技術構成**: Vite + React + TypeScript（SPA）/ Vercel Functions（`api/`）
- **公開先**: Vercel（`main` にマージすると本番URLが自動更新される）
- **AI 呼び出し**: `POST /api/chat` でサーバー経由。API キーはブラウザに出さない

## 最初にやること

```bash
npm install
cp .env.example .env.local     # ANTHROPIC_API_KEY を書く
npm run dev                    # http://localhost:5173（UIのみ）
npm run dev:api                # http://localhost:3000（/api/* も動く。要 vercel login）
```

## ドキュメント

| ファイル | 中身 |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | **開発ルール。2人でコンフリクトさせないための取り決め** |
| [AGENTS.md](AGENTS.md) | AI エージェントに読ませるルール（`CLAUDE.md` からも参照） |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Vercel の初期設定・当日の運用・無料枠の制約 |
| [docs/HACKATHON_DAY.md](docs/HACKATHON_DAY.md) | 当日のタイムラインと事故対応 |

## ディレクトリ

```
api/                 Vercel Functions（サーバー側）。LLM 呼び出しはここだけ
  health.ts          GET  /api/health  疎通確認
  chat.ts            POST /api/chat    LLM をストリームで中継
src/
  shared/            2人で共有するもの。触る前に一声かける
    types.ts         フロントとサーバーの契約（当日いちばん最初に決める）
    api.ts           /api/* を呼ぶクライアント側ラッパ
    ErrorBoundary.tsx  画面が真っ白になるのを防ぐ保険
  features/          1機能 = 1ディレクトリ = 1人が所有（← コンフリクト対策の要）
  App.tsx            各機能を並べるだけ。ロジックを書かない
  index.css          リセットと共通トークンのみ
```

## コマンド

```bash
npm run dev          # 開発サーバー（UIのみ）
npm run dev:api      # vercel dev（/api/* も動く）
npm run check        # 型 + lint + フォーマット確認（push 前に実行）
npm run format       # フォーマット適用
npm run build        # 本番ビルド
```
