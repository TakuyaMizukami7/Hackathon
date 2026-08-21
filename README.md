# Hackathon

AI ハッカソン用のリポジトリ。**当日は「画面とロジック」を書くだけ**で済むよう、
土台と公開の配線だけを先に用意してある。

- **技術構成**: Vite + React + TypeScript（画面） / Hono の常駐サーバー（`server/`）
- **公開先**: Railway（Hobby）。`main` にマージすると本番URLが自動更新される
- **AI 呼び出し**: `POST /api/chat` でサーバー経由。API キーはブラウザに出さない

```
ブラウザ ──> Railway のサービス（1つ）
               ├─ /api/*   … server/routes/*.ts
               └─ それ以外 … vite build した dist/ を配信
```

## 最初にやること

```bash
npm install
cp .env.example .env.local     # GEMINI_API_KEY を書く
npm run dev                    # 画面(5173) と API(3000) が同時に立ち上がる
```

ブラウザは http://localhost:5173 を開く。`/api/*` は Vite が 3000 へ転送する。

## ドキュメント

| ファイル | 中身 |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | **AI が毎回読むファイル。** 現状把握の手順・Git 手順・禁止事項 |
| [AGENTS.md](AGENTS.md) | AI 向けの詳細ルール（Claude Code 以外のエージェント用） |
| [CONTRIBUTING.md](CONTRIBUTING.md) | **人間向けの開発ルール。2人でコンフリクトさせないための取り決め** |
| [docs/devlog/](docs/devlog/) | 作業ログ。チャットをまたいで状況を引き継ぐための場所 |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Railway の初期設定・当日の運用・Hobby プランの制約 |
| [docs/HACKATHON_DAY.md](docs/HACKATHON_DAY.md) | 当日のタイムラインと事故対応 |

## ディレクトリ

```
server/              常駐サーバー（Hono）。LLM 呼び出しはここだけ
  index.ts           起動とルーティング。1行足すだけの場所に保つ
  routes/
    health.ts        GET  /api/health  疎通確認 + 稼働中コミットの確認
    chat.ts          POST /api/chat    LLM をストリームで中継
src/
  shared/            2人で共有するもの。触る前に一声かける
    types.ts         フロントとサーバーの契約（当日いちばん最初に決める）
    api.ts           /api/* を呼ぶクライアント側ラッパ
    ErrorBoundary.tsx  画面が真っ白になるのを防ぐ保険
  features/          1機能 = 1ディレクトリ = 1人が所有（← コンフリクト対策の要）
  App.tsx            各機能を並べるだけ。ロジックを書かない
  index.css          リセットと共通トークンのみ
docs/devlog/         作業ログ（1人1ファイル）。チャットをまたぐ引き継ぎ用
.claude/commands/    Claude Code のスラッシュコマンド
railway.json         ビルド/起動コマンド・ヘルスチェックの設定
```

## AI と開発するときの流れ

チャットを分けて開発する前提。**AI に毎回説明し直さなくて済むようにしてある。**

| タイミング | コマンド | 何をするか |
| --- | --- | --- |
| チャットを開いた直後 | `/catchup` | git log・現在のブランチ・型定義・作業ログを読んで現状を要約する |
| 作業が一段落したら | `/handoff` | `docs/devlog/<自分のID>.md` に作業ログを追記する |
| main に入れるとき | `/ship` | check → commit → push → PR → CI 待ち → squash マージ |

Claude Code 以外のエージェントを使う場合は [AGENTS.md](AGENTS.md) を読ませる。

## コマンド

```bash
npm run dev          # 画面 + API（通常はこれ）
npm run dev:web      # 画面だけ
npm run dev:api      # API だけ
npm run preview      # 本番と同じ形（build して1サーバーで配信）を 3000 で確認
npm run check        # 型 + lint + フォーマット確認（push 前に実行）
npm run format       # フォーマット適用
npm run build        # 本番ビルド
```
