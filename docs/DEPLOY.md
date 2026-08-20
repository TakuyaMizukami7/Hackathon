# 公開（デプロイ）手順

ホスティングは **Railway（Hobby プラン）**。
**1 つのサービスが API と画面の両方を配信する**常駐サーバー構成。

```
ブラウザ ──> Railway のサービス（Node + Hono）
               ├─ /api/*   … server/routes/*.ts
               └─ それ以外 … vite build した dist/ を配信（SPA フォールバック付き）
```

GitHub の `main` に入ったものが自動でビルド・デプロイされる。

---

## 1. 初回セットアップ（ハッカソン前に済ませる。1回だけ）

Railway アカウントの持ち主が行う。

1. https://railway.com/new を開く
2. **Deploy from GitHub repo** → `TakuyaMizukami7/Hackathon` を選ぶ
3. 初回ビルドが走る（ビルド/起動コマンドは [`railway.json`](../railway.json) の設定が使われる）

### デプロイ後に必ずやる設定（5つ）

| # | 場所 | 設定 | 理由 |
| --- | --- | --- | --- |
| 1 | サービス > Settings > Networking > Public Networking | **Generate Domain を押す**。ターゲットポートは **`8080`**（既定値のまま） | ★Railway は**自動で公開 URL を付けない。** 押すまで外から見られない（Vercel との最大の違い）。ポートは下の「ターゲットポート」を参照 |
| 2 | サービス > Variables | `ANTHROPIC_API_KEY` を追加 | 無いと `/api/chat` が 500 を返す |
| 3 | サービス > Settings > Deploy > Region | **Southeast Asia (Singapore)** に変更 | 既定は米国西部。日本からはシンガポール（`asia-southeast1`）が最短。**日本リージョンは無い** |
| 4 | サービス > Settings > Deploy > Serverless (App Sleeping) | **必ず OFF のまま** | ON にすると、スリープ復帰時の**最初のリクエストが 502 を返すことがある**。審査員の 1 回目のアクセスが 502 になったら終わり |
| 5 | プロジェクト > Settings > Environments | **PR 環境を有効化** | PR ごとに使い捨ての URL ができ、相方が実機で確認できる。※設定1でベース環境にドメインが付いていることが前提 |

> `LLM_MODEL` を Variables に入れると、モデルをコード変更なしで切り替えられる。
> 未設定なら `claude-opus-5`。デモの応答速度を上げたいときは `claude-haiku-4-5`。

### ターゲットポート（ドメイン生成時に聞かれるポート）

「Enter the port your app is listening on」は、**コンテナの中でアプリが listen するポート**。
**443 ではない。**

```
ブラウザ ──443(HTTPS)──> Railway のエッジプロキシ ──8080──> コンテナ
                          ↑ TLS はここで終端される       ↑ ここを聞かれている
```

- **`8080`（既定値）を入れる。** Railway がこの値を `PORT` として注入し、
  [`server/index.ts`](../server/index.ts) が `0.0.0.0:$PORT` で待ち受ける
- 443 を入れるとコンテナ内で誰も listen していないので `Application failed to respond` になる
- 生成後、Variables に `PORT` が見当たらなければ `PORT=8080` を手で足す。
  **ターゲットポートと一致していることだけが条件**
- ⚠️ **`.env.example` の `PORT=3000` を Railway の Variables にコピーしないこと。**
  ターゲットポートと食い違って落ちる。あれはローカル専用の値

### 動作確認

`https://<生成されたドメイン>/api/health` を開いて、こう返れば全開通：

```json
{ "ok": true, "hasApiKey": true, "commit": "a1b2c3d", "env": "production", "region": "asia-southeast1-eqsg3a" }
```

`commit` は**今動いているコミット**。自分の push が本番に反映されたかを、
Railway のダッシュボードを開かずに確認できる（＝相方も確認できる。後述の制約への対策）。

---

## 2. ローカル開発

```bash
npm install
cp .env.example .env.local     # ANTHROPIC_API_KEY を書く
npm run dev
```

`npm run dev` で**画面(5173)と API サーバー(3000)が同時に立ち上がる。**
ブラウザは http://localhost:5173 を開く。`/api/*` は Vite が 3000 に転送するので、
コード側は本番と同じ相対パス（`fetch('/api/chat')`）のままでよい。

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 通常の開発。画面 + API |
| `npm run dev:web` | 画面だけ（API を触らない人向け） |
| `npm run dev:api` | API だけ |
| `npm run preview` | **本番と同じ形**（build して 1 サーバーで配信）を http://localhost:3000 で確認 |

デモ前は一度 `npm run preview` を通しておくと、本番だけで壊れる事故を防げる。

---

## 3. 当日の運用

- ブランチを push → **PR 環境の URL**（設定5を有効にした場合）
- `main` にマージ → **本番 URL が更新される**（提出するのはこれ）
- ログはダッシュボードの Deployments、または CLI：

```bash
npm i -g @railway/cli
railway login
railway link              # 既存プロジェクトに紐付け
railway logs              # 実行時ログ
railway variables         # 環境変数の確認
railway run npm run dev:api   # 本番の環境変数を使ってローカル実行
```

### 本番が壊れたときの復旧（30秒）

Railway ダッシュボード > サービス > **Deployments** > 動いていたデプロイの「⋮」> **Redeploy**。
git を触らずに前の状態へ戻せる。**このやり方だけは 2 人とも覚えておくこと。**

---

## 4. Hobby プランの制約と回避策

| 制約 | 影響と回避策 |
| --- | --- |
| **$5/月 + 使用量 $5 分込み** | 超えた分は従量課金。ハッカソン当日の 1 日分なら誤差の範囲 |
| 1 サービスあたり 48GB RAM / 48 vCPU / 6 レプリカ | 上限は十分すぎる。課金は実際に使った分だけ |
| **チームメンバーを招待できない（Pro 以上）** | 相方は Railway ダッシュボードを見られない。**ログ確認・環境変数の変更・ロールバックはオーナーしかできない。** 当日オーナーが必ず在席すること。状態確認は `/api/health` で代替できるようにしてある |
| **日本リージョンが無い** | シンガポールが最短（東京から往復およそ 70〜90ms）。体感で困ることはほぼ無い |
| **公開ドメインが自動で付かない** | 上の設定1。忘れると「デプロイ成功しているのに開けない」で 10 分溶かす |
| **Serverless(App Sleeping) の 502** | 上の設定4。OFF のままにする |
| PR 環境も使用量を消費する | PR をマージ／クローズすると自動削除される。**開きっぱなしの PR を放置しない** |
| ボリューム 5GB / イメージ保持 72 時間 | ロールバック先は 3 日以内のデプロイまで |
| コンテナ内のファイルは再デプロイで消える | 永続化が必要なら Volume か DB を足す（下記） |

### サーバーレスと違って「できること」

Railway は常駐サーバーなので、Vercel Functions では詰まる以下が制限なく使える。
当日サービスが大きくなっても壁にぶつからない。

- **リクエスト/レスポンスのサイズ上限が無い**（画像アップロードで 4.5MB の壁を踏まない）
- **WebSocket / SSE の常時接続**が張れる
- **実行時間の上限が無い**（長い処理、バックグラウンドジョブ）
- **サーバー内にメモリ状態を持てる**（部屋・セッション・キャッシュなど）

### あとから足せるもの（各2分）

- **PostgreSQL / Redis**: プロジェクト画面で `+ New` > Database。
  `DATABASE_URL` などが同じプロジェクト内のサービスに自動で入る
- **Cron**: サービス > Settings > Cron Schedule

---

## 5. 提出前チェックリスト

- [ ] **シークレットウィンドウ**で本番URLを開いて動く（＝自分のログイン状態に依存していない）
- [ ] スマホの Chrome でも開ける
- [ ] `/api/health` が `ok: true` / `hasApiKey: true` / `commit` が最新
- [ ] 初回ロードで真っ白にならない
- [ ] 審査員が触る操作を、自分以外の端末で最初から最後まで通した
- [ ] 提出するのは **本番URL**（PR 環境の使い捨て URL ではない）
