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
| 2 | サービス > Variables | `GEMINI_API_KEY` を追加 | 無いと `/api/chat` が 500 を返す |
| 3 | サービス > Settings > Deploy > Region | **Southeast Asia (Singapore)** に変更 | 既定は米国西部。日本からはシンガポール（`asia-southeast1`）が最短。**日本リージョンは無い** |
| 4 | サービス > Settings > Deploy > Serverless (App Sleeping) | **必ず OFF のまま** | ON にすると、スリープ復帰時の**最初のリクエストが 502 を返すことがある**。審査員の 1 回目のアクセスが 502 になったら終わり |
| 5 | プロジェクト > Settings > Environments | **PR 環境を有効化** | PR ごとに使い捨ての URL ができ、相方が実機で確認できる。※設定1でベース環境にドメインが付いていることが前提 |

### GEMINI_API_KEY の取り方と入れ方

**1) キーを取得する**（無料枠あり・クレジットカード登録不要）

1. https://aistudio.google.com/apikey を開いて Google アカウントでログイン
2. **Create API key** → プロジェクトを選ぶ（無ければ新規作成）
3. `AIza...` で始まるキーが表示される → **コピー**
4. 無料枠にはレート制限（1分あたり／1日あたりの回数）がある。
   デモ直前に連打すると引っかかることがあるので、**リハーサルは早めの時間帯に**。
   足りなければ Google Cloud 側で課金を有効にすると上限が上がる

**2) Railway に登録する**

1. プロジェクト画面で **サービスのカードをクリック**（プロジェクト設定ではない）
2. **Variables** タブ > **+ New Variable**
3. Name = `GEMINI_API_KEY` / Value = `AIza...`（引用符もスペースも不要）
4. **Add** を押す
5. ★ 画面上部の **Apply changes / Deploy を押す** ← 忘れやすい。押さないと反映されない

**3) 確認する**

`https://<ドメイン>/api/health` の `hasApiKey` が `true` になれば成功。
`false` のままなら、変数名のタイプミスか Apply changes の押し忘れ。

> Raw Editor で `.env` 形式の一括貼り付けもできるが、
> **`.env.example` の中身をそのまま貼らないこと**（`PORT=3000` が混ざって落ちる）。

> PR 環境を有効にしている場合、変数は環境ごとに持つ。PR 環境が作られた時点の
> ベース環境の変数を引き継ぐので、**キーを入れてから PR を立てる**方が確実。

> ⚠️ **`hasApiKey` は「キーが設定されているか」しか見ていない。「有効か」までは分からない。**
> 期限切れ・タイプミス・無効化されたキーでも `hasApiKey: true` のまま。
> その場合 `/api/chat` や `/api/expand` を実際に叩くと、リトライはされず数百ms〜1秒程度で
> 502（`{"error":"...Gemini の呼び出しに失敗しました..."}` 等、詳細に `API key not valid` を含む）が返る。
> 「`hasApiKey: true` なのに毎回 502」＝**キーが無効**、と切り分けられる。

### 予備キーへの切替手順（本番で GEMINI_API_KEY を差し替える）

本番のキーが無効化された／レート上限に達した場合の切替手順（すべて人間が Railway ダッシュボードで行う）。

1. https://aistudio.google.com/apikey で**別の Google アカウント**（または同アカウントの別プロジェクト）で
   予備キーを事前に発行しておく（当日ではなく前日までに準備しておくのが望ましい）
2. Railway > サービス > **Variables** で `GEMINI_API_KEY` の値を予備キーに書き換える
   （削除して作り直す必要はない。既存の行を編集するだけ）
3. ★ **Apply changes / Deploy を押す**（これを忘れると反映されない。上と同じ落とし穴）
4. `https://<ドメイン>/api/health` で `hasApiKey: true` を確認
5. `https://<ドメイン>/api/expand`（`?mock=1` を付けない）または `/api/chat` を実際に叩いて、
   502 が出ないこと（＝新しいキーが有効なこと）を確認する。**`hasApiKey` だけでは有効性は保証されない**（直上の注記参照）ので、この一手が必須

### 触らなくてよい設定

Railway の設定画面には項目が多いが、**当日必要なのは上の 5 つだけ。** 特に以下は触らない。

| 設定 | どうするか |
| --- | --- |
| **Under Attack Mode** | **有効にしない。** 全アクセスの手前にブラウザチェック画面が挟まる。審査員の最初のアクセスでこれが出たら終わり。DDoS を受けている時だけの緊急用 |
| Serverless (App Sleeping) | **OFF のまま**（設定4の通り。ON だと復帰時の初回が 502 になりうる） |
| Replicas / Autoscaling | 1 のまま。増やしても審査には効かず、使用量だけ増える |
| **Replica Limits (vCPU / Memory)** | **最大のまま（8 vCPU / 8 GB）。** 上限であって予約ではないので、高くても課金は増えない。絞ると審査中に OOM で落ちるリスクだけが増える |
| Custom Domain / TCP Proxy | 不要。Generate Domain で出た URL をそのまま提出する |

> `LLM_MODEL` を Variables に入れると、モデルをコード変更なしで切り替えられる。
> 未設定なら `gemini-3.7-flash`、速度優先なら `gemini-3.5-flash-lite`。
> **モデルIDが弾かれたときの逃げ道でもある**（コードを触らず変数だけ直せる）。

### モデルの切り替え（`LLM_MODEL` / `LLM_FALLBACK_MODELS`）

`/api/chat`（`server/routes/chat.ts`）は環境変数でモデルを制御する設計になっている。
`/api/expand`（`server/routes/expand.ts`）の実応答部分（BE-2 で実装）も**同じ環境変数を共有する**設計。
どちらか一方だけ差し替える変数は無い＝この 2 つを変えると両エンドポイントに効く。

| 変数 | 未設定時の既定値 | 効果 |
| --- | --- | --- |
| `LLM_MODEL` | `gemini-3.7-flash` | 本命として最初に試すモデル |
| `LLM_FALLBACK_MODELS` | `gemini-3.5-flash-lite,gemini-2.5-flash`（カンマ区切り） | 本命が 429/500/502/503/504（混雑・レート制限等）を返したときに順番に試す逃げ道。空文字にすると無効化 |

- Railway > サービス > Variables で値を書き換えて **Apply changes / Deploy** を押すだけ。コード変更・再ビルド待ちは不要（次回デプロイ時に環境変数として注入される）
- 本命モデルの ID が弾かれた（400/404 等）場合はリトライされず即エラーになる仕様なので、
  **`LLM_MODEL` 自体を動くモデル ID に変更する**のが正しい対処（フォールバックは待たない）
- 混雑（503 など）が続く場合は `LLM_FALLBACK_MODELS` の並び順を見直す、またはデモ直前だけ
  `LLM_MODEL` を `gemini-3.5-flash-lite` のような軽量モデルに変えると当たりにくくなる
- どのモデルが実際に応答したかは、`/api/chat` はレスポンスヘッダ `x-llm-model` で、
  `/api/expand` は BE-2 実装後はレスポンス本文の `model` フィールド（`ExpandResponse.model`）で確認できる

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
{ "ok": true, "hasApiKey": true, "commit": "a1b2c3d", "env": "production", "region": "asia-southeast1-eqsg3a", "model": "gemini-3.7-flash" }
```

`model` は `LLM_MODEL` の値（未設定ならコード側の既定値）。Gemini を実際に呼ばずに確認できるので、
「モデルを切り替えたつもりが反映されていない」（Apply changes 押し忘れ等）にすぐ気づける。

`commit` は**今動いているコミット**。自分の push が本番に反映されたかを、
Railway のダッシュボードを開かずに確認できる（＝相方も確認できる。後述の制約への対策）。

### デプロイ後に確認すべきエンドポイント一覧

push・マージのたびに、上から順に確認する。すべて `https://<ドメイン>` を実際のURLに置き換える。

| # | エンドポイント | 確認方法 | 期待する結果 |
| --- | --- | --- | --- |
| 1 | `GET /api/health` | ブラウザで開く | `ok: true` / `hasApiKey: true` / `commit` が最新の push と一致 |
| 2 | `POST /api/expand?mock=1` | `curl -X POST "https://<ドメイン>/api/expand?mock=1" -H "Content-Type: application/json" -d "{\"text\":\"テスト\"}"` | 200。固定の 4 ペルソナ JSON が返る（Gemini を呼ばないので API キーの状態に関係なく通る）。**これが失敗するならデプロイ自体かルーティングの問題** |
| 3 | `POST /api/expand`（`?mock=1` なし） | 同上のコマンドから `?mock=1` を外して実行 | BE-2 実装前は 501（`{"error":"モック以外の応答は未実装です..."}`）。BE-2 実装後は 200 で実際の Gemini 応答（`model` フィールドに実モデル名）。502/503 が出たら「モデルの切り替え」節と「事故対応チェックリスト」を参照 |

1 → 2 → 3 の順で確認すると、「そもそもデプロイが生きているか」「Gemini を呼ばない経路が動くか」
「Gemini 呼び出し自体が動くか」を切り分けられる。

---

## 2. ローカル開発

```bash
npm install
cp .env.example .env.local     # GEMINI_API_KEY を書く
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

### 事故対応チェックリスト

当日よくある事故のパターン別。まず `/api/health` を開いて状況を切り分ける
（開ける＝サーバー自体は生きている。開けない＝下の「Railway 自体が落ちている」を見る）。

**A. Gemini API キーが無効・枯渇（レート上限 / 課金停止 / 失効）している**

症状: `/api/health` は `hasApiKey: true` なのに、`/api/expand`（`?mock=1` なし）や `/api/chat` が
502 や 503 を返し続ける。詳細メッセージに `API key not valid` `RESOURCE_EXHAUSTED` 等が出る。

1. まず **`?mock=1` に切り替えてデモを続行する**（フロントの `?mock=` 切替、または BE の
   `/api/expand?mock=1` を使う UI 操作）。これだけで審査は止められる。**一番早い保険**
2. 並行して、上の「予備キーへの切替手順」で `GEMINI_API_KEY` を差し替える
3. レート上限（一時的な 429）なら数分待って `LLM_FALLBACK_MODELS` に任せるだけで直ることもある。
   「モデルの切り替え」節を参照

**B. 特定モデルだけ弾かれる／混雑が続く**

症状: 特定のモデル ID で 400/404、または 503 が長時間続く。

1. 「モデルの切り替え」節の手順で `LLM_MODEL` を動くモデル・軽いモデルに差し替える
2. `x-llm-model` ヘッダ（`/api/chat`）や `ExpandResponse.model`（`/api/expand`、BE-2 実装後）で
   実際にどのモデルが答えたか確認する

**C. Railway 自体が落ちている / ドメインが開かない**

症状: `/api/health` すら開けない、真っ白、`Application failed to respond`。

1. Railway ダッシュボードでデプロイのステータス（Failed / Crashed）を確認
2. 直前の push が原因なら「本番が壊れたときの復旧（30秒）」で 1 つ前のデプロイに Redeploy
3. `Application failed to respond` は大抵ターゲットポート/`PORT` の設定ミス
   （「ターゲットポート」節を参照）。設定を変えていないのに突然出た場合は Railway 側の障害の可能性もあるので、
   その場合は待つ・オーナーが Railway のステータスページを確認する
4. どうしても直らない場合の最終手段として `?mock=1` 系の保険（A-1）に切り替え、
   「サーバーが落ちていること」自体を審査員に見せない工夫をする（例: ローカルで `npm run preview` を
   動かし手元で見せる）

**D. どれか分からない・切り分けが必要**

「デプロイ後に確認すべきエンドポイント一覧」の 1 → 2 → 3 を順に叩く。
1 が失敗＝C。2 が失敗＝ルーティング/デプロイ自体の問題（C に近い）。
1・2 は成功するが 3 だけ失敗＝A か B（Gemini 側）。

---

## 4. Hobby プランの制約と回避策

| 制約 | 影響と回避策 |
| --- | --- |
| **$5/月 + 使用量 $5 分込み** | 超えた分は従量課金。ハッカソン当日の 1 日分なら誤差の範囲 |
| 1 レプリカあたり **8 vCPU / 8 GB** が上限 | **上限であって予約ではない。** 課金は実消費量（vCPU秒・GB秒）に対してかかるので、上限を最大にしても使わなければ課金は増えない。このアプリの実消費はアイドル 100〜200MB、デモ中でも 500MB 程度 |
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
