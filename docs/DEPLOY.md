# 公開（デプロイ）手順

ホスティングは **Vercel**。GitHub の `main` に入ったものが自動で本番に出る。

```
ブランチに push  ->  プレビューURL（使い捨て）が自動で作られる
main にマージ    ->  本番URL が自動で更新される  ← 事務局に提出するのはこれ
```

---

## 1. 初回セットアップ（ハッカソン前に済ませる。1回だけ）

Vercel のアカウント所有者（= GitHub リポジトリのオーナー）が行う。

1. https://vercel.com/new を開く
2. GitHub の `TakuyaMizukami7/Hackathon` を **Import**
3. 設定はそのままでよい（Framework Preset が **Vite** と自動判定される）
4. **Deploy** を押す

### Deploy 後に必ずやる設定（4つ）

| # | 場所 | 設定 | 理由 |
| --- | --- | --- | --- |
| 1 | Settings > Environment Variables | `ANTHROPIC_API_KEY` を追加（Production / Preview / Development すべてにチェック） | これが無いと `/api/chat` が 500 を返す |
| 2 | Settings > Deployment Protection | **Vercel Authentication を Disabled** にする | 既定のままだとプレビューURLに認証がかかり、**相方が開けない**。本番URLは元々公開されるので審査には影響しないが、開発中に困る |
| 3 | Settings > Functions | Region が **Tokyo (hnd1)** になっているか確認 | `vercel.json` で指定済み。既定の米国東部のままだと往復が遅い |
| 4 | Settings > Git | Production Branch が `main` になっているか確認 | |

> `LLM_MODEL` を環境変数に入れると、モデルをコード変更なしで切り替えられる。
> 未設定なら `claude-opus-5`。デモの応答速度を上げたいときは `claude-haiku-4-5`。

### 動作確認

- `https://<プロジェクト名>.vercel.app/api/health` を開いて
  `"ok": true` と `"hasApiKey": true` が返ればサーバー側は完成。
- トップページの「LLM 疎通」で文字が流れてくれば LLM まで開通。

---

## 2. ローカル開発

```bash
npm install
cp .env.example .env.local     # ANTHROPIC_API_KEY を書く
```

### 画面だけ触るとき（速い）

```bash
npm run dev        # http://localhost:5173
```

`/api/*` は動かない。UI の調整だけならこれで十分。

### API も含めて動かすとき

```bash
npm i -g vercel    # 初回のみ
vercel login       # 初回のみ
vercel link        # 初回のみ。既存プロジェクトを選ぶ
npm run dev:api    # = vercel dev。http://localhost:3000
```

`vercel dev` は `.env.local` を読む。API を触る人だけ入れておけばよい。

---

## 3. 当日の運用

- **ブランチを push すると、その PR に Vercel がプレビューURLをコメントしてくれる。**
  スマホからそのURLを開けば実機確認ができる。
- 本番URL（提出するURL）が更新されるのは **`main` にマージした時だけ**。
- デプロイの状況は Vercel ダッシュボード、または：

```bash
vercel ls          # 直近のデプロイ一覧
vercel logs <url>  # 実行時ログ（Hobby プランは1時間しか保持されない）
```

### 本番が壊れたときの復旧（30秒）

Vercel ダッシュボード > Deployments > 動いていたデプロイの「…」> **Promote to Production**。
git を触らずに前の状態へ戻せる。**このやり方だけは 2 人とも覚えておくこと。**

---

## 4. Hobby（無料）プランの制約と回避策

| 制約 | 影響と回避策 |
| --- | --- |
| リクエスト/レスポンス body **4.5MB** | 画像を base64 で `/api/` に送ると簡単に超える。**送る前に canvas で縮小**する |
| Function 実行時間 **最大 300 秒** | ストリーミングなら十分。`vercel.json` では 60 秒に設定済み |
| **同時ビルド 1 本** | 締切直前に 2 人同時に push するとビルド待ちが発生する。**終盤は push を交互に**、最後の 30 分は main への直接のマージ以外を控える |
| デプロイ **100 回/日**、ビルド 100 回/時 | 通常は足りるが無限ではない。無意味な push を減らす |
| **メンバー招待不可（1シート）** | 相方は Vercel に招待できない。**GitHub 経由で開発し、確認はプレビューURLで行う**（＝上の設定2が必須） |
| GitHub Organization のリポジトリは接続不可 | 個人リポジトリのままにする。Organization に移さない |
| ランタイムログの保持 **1時間** | エラーはその場で見る |
| 非商用利用限定 | ハッカソン作品は問題なし |

---

## 5. 提出前チェックリスト

- [ ] **シークレットウィンドウ**で本番URLを開いて動く（＝自分のログイン状態に依存していない）
- [ ] スマホの Chrome でも開ける
- [ ] `/api/health` が `ok: true` / `hasApiKey: true`
- [ ] 初回ロードで真っ白にならない
- [ ] 審査員が触る操作を、自分以外の端末で最初から最後まで通した
- [ ] 提出するのは **本番URL**（`*-git-*.vercel.app` のプレビューURLではない）
