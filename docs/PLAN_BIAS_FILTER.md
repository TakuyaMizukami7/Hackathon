# Bias Filter ▽ — 実装プラン（3時間・2人）

当日の作戦書。**開始前に 2 人で 5 分読み合わせる。**

- **コンセプト**: 入力した出来事に対し、AI が異なるペルソナ（楽観主義者・陰謀を疑う人・
  100年後の歴史家・現実主義の投資家）の視点で偏った解説を返す
- **コア体験**: テキスト入力 → `▽` → 4 つのドロップダウンが生成 → 開くと各ペルソナの解説
- **制約**: 3 時間 / 2 人（フロント 1・バック 1）/ DB なし・完全ステートレス

---

## 0. 開始 10 分で決める：バックエンドをどちらで作るか

このリポジトリには **Hono(TypeScript) のサーバーが既に動いており**、Gemini 中継・Railway
デプロイ・CI が配線済み（`server/`）。

| 選択肢 | BE-1 の所要 | 備考 |
| --- | --- | --- |
| **既存 Hono に `/api/expand` を追加**（推奨） | 約 15 分 | デプロイ設定・CI・503 リトライが流用できる |
| **FastAPI を新規に立てる** | 約 45〜60 分 | Railway に 2 つ目のサービス or 静的配信の作り直しが必要 |

**API 契約・MVP 仕分け・フロントの Issue は、どちらを選んでも変わらない。**
以下の BE Issue は FastAPI 前提で書いてあるが、Hono を選ぶ場合は
`server/routes/expand.ts` 1 ファイルに読み替える。

---

## 1. アーキテクチャと API 定義

### 1-1. 構成

```
[Browser: Vite + React + TS]
      |  POST /api/expand   (JSON 1往復のみ・ストリーミングなし)
      v
[API on Railway]  -- GEMINI_API_KEY -->  [Gemini API]
                                          response_schema で JSON を強制
```

DB なし・セッションなし・認証なし。

### 1-2. 並行開発の生命線：ペルソナ ID を固定する

**AI にペルソナを考えさせない。** カタログ（id / 表示名 / 絵文字 / 色）は
**フロント側の定数**として持ち、AI は `id` ごとの**中身だけ**を埋める。

これで得られるもの:

1. FE は API 完成前に「ペルソナ名つきの空ドロップダウン」を完成形まで作れる
2. **ローディング中もペルソナ名を先に出せる**（応答 5〜8 秒の体感が激変する = デモで効く）
3. AI が変な名前を返してもレイアウトが崩れない

### 1-3. 共有する型（`src/shared/types.ts` に追記）

**★ 開始 20 分以内に BE 担当が一度だけ追記して PR。以降このファイルは凍結。**

```ts
/** ペルソナの識別子。AI はこの id 以外を返してはいけない */
export type PersonaId =
  | 'optimist'          // 楽観主義者
  | 'conspiracist'      // 陰謀を疑う人
  | 'historian2125'     // 100年後の歴史家
  | 'realist_investor'  // 現実主義の投資家

export const PERSONA_IDS: PersonaId[] = [
  'optimist', 'conspiracist', 'historian2125', 'realist_investor',
]

/** 1ペルソナ分の解説 */
export type Perspective = {
  id: PersonaId
  /** 表示名（AI が返すが、FE 側の定数を優先してよい） */
  persona: string
  /** ドロップダウンの見出し。20文字以内の断言 */
  headline: string
  /** 展開したときの本文。120〜180文字 */
  body: string
  /** バイアスの強さ 1〜5。UI のメーター表示用 */
  biasLevel: number
  /** そのペルソナが好んで使う語 2〜3個。タグ表示用 */
  keywords: string[]
}

/** POST /api/expand のリクエスト */
export type ExpandRequest = {
  /** ユーザーが入力した出来事・ニュース。1〜400文字 */
  text: string
}

/** POST /api/expand のレスポンス */
export type ExpandResponse = {
  /** 入力の中立な一行要約（見出し用） */
  summary: string
  /** PERSONA_IDS と同じ順で返る */
  perspectives: Perspective[]
  /** 応答したモデル名。デモ中の切り分け用 */
  model: string
  elapsedMs: number
}
```

エラー形は既存の `ApiError = { error: string }` をそのまま使う（新しく作らない）。

### 1-4. エンドポイント

#### `GET /api/health`

FE 担当が「サーバー生きてる？」を自力で確認できるようにする。

```json
{ "ok": true, "time": "2026-08-22T10:00:00Z", "hasApiKey": true, "model": "gemini-2.5-flash" }
```

#### `POST /api/expand` ★本命

リクエスト:

```json
{ "text": "大手SNSが、投稿の表示順を決めるアルゴリズムを全面公開すると発表した。" }
```

レスポンス 200:

```json
{
  "summary": "大手SNSが表示順アルゴリズムの全面公開を発表した。",
  "perspectives": [
    {
      "id": "optimist",
      "persona": "楽観主義者",
      "headline": "透明性の時代がついに来た",
      "body": "素晴らしい決断だ。これで誰もが仕組みを理解し、より良い情報に出会える。他社も追随せざるを得ないだろう。インターネットは確実に良い方向へ進んでいる。私たちはその歴史的な転換点に立ち会っているのだ。",
      "biasLevel": 4,
      "keywords": ["透明性", "歴史的転換点", "進歩"]
    },
    {
      "id": "conspiracist",
      "persona": "陰謀を疑う人",
      "headline": "公開するのは「安全な部分」だけ",
      "body": "なぜ今なのか考えてみてほしい。規制の議論が本格化する直前だ。公開されるのは当たり障りのない部分だけで、本当に効いている仕組みは別にあるに違いない。見せられたものを信じさせることこそ、最も効率的な誘導なのだ。",
      "biasLevel": 5,
      "keywords": ["タイミング", "規制逃れ", "見せかけ"]
    },
    {
      "id": "historian2125",
      "persona": "100年後の歴史家",
      "headline": "21世紀前半のありふれた一幕",
      "body": "当時の人々は「アルゴリズムの公開」に大きな意味を見出していた。しかし2125年の我々から見れば、これは情報統制が個別最適化へ移行する過程の、ごく初期の小さな出来事に過ぎない。当事者がそれを自覚していなかった点だけが興味深い。",
      "biasLevel": 3,
      "keywords": ["過渡期", "相対化", "無自覚"]
    },
    {
      "id": "realist_investor",
      "persona": "現実主義の投資家",
      "headline": "広告単価への影響が全て",
      "body": "感情論は不要だ。論点は一つ、これが広告単価とユーザー滞在時間にどう効くか。公開はブランド毀損リスクのヘッジであり、規制コストの前払いに過ぎない。株価は短期的に反応するだろうが、6ヶ月後には織り込まれて元に戻る。",
      "biasLevel": 4,
      "keywords": ["広告単価", "リスクヘッジ", "織り込み済み"]
    }
  ],
  "model": "gemini-2.5-flash",
  "elapsedMs": 4820
}
```

エラー:

| Status | Body | FE の扱い |
| --- | --- | --- |
| 400 | `{"error":"text は 1〜400 文字で入力してください"}` | そのまま赤文字表示 |
| 502 | `{"error":"AI の応答を解釈できませんでした"}` | 「もう一度」ボタン |
| 503 | `{"error":"AI が混雑しています。10秒後に再試行してください"}` | 同上 |

**FE は `error` 文字列をそのまま出すだけ。分岐しない。**

#### `POST /api/expand?mock=1` ★開発の要

BE-1 で最初に作る。Gemini を呼ばず、上の例を 1.5 秒 sleep して返す。
**FE 担当は開始 40 分後から本番同等の JSON で開発できる。**
本番でも生かしておき、当日 Gemini が落ちたときのデモの保険にする。

### 1-5. 開発時の CORS 回避

CORS 設定で溶ける時間をゼロにする。Vite の proxy を使う。

```ts
// vite.config.ts
server: {
  proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
}
```

FE は常に `fetch('/api/expand')` と書く。dev も本番も同じコード。

---

## 2. MVP と Nice to have

### 作る（3 時間で必ず動かす）

| # | 機能 | 判断理由 |
| --- | --- | --- |
| 1 | textarea + `▽` ボタン | コア |
| 2 | `POST /api/expand` 1 本（Gemini 構造化出力） | コア |
| 3 | 4 ペルソナのアコーディオン開閉 | コア。デモの絵になる部分 |
| 4 | ローディング中もペルソナ名とスケルトンを先に出す | 応答 5〜8 秒を退屈にしない |
| 5 | エラーは赤い 1 行 + 「もう一度」ボタンのみ | 分岐を作らない |
| 6 | サンプル入力ボタン 2〜3 個 | 3 分デモで打ち込む時間はない。**必須** |
| 7 | 「これは AI が演じた偏った視点です」の注記 | 審査員の倫理的な懸念を先回りで潰す |
| 8 | Railway に開始 1 時間以内に一度デプロイ（中身は空でよい） | 事故の 9 割はここ |

### 作らない（Nice to have）

- **ストリーミング表示** — 実装 40 分。スケルトン表示で体感は十分カバーできる
- **ペルソナのユーザー選択 UI** — 固定 4 つ。増やすなら定数を足すだけ
- **履歴・共有 URL・OGP 画像生成** — DB もストレージも要らない設計を崩す
- **レスポンシブの作り込み** — デモ画面の解像度 1 つだけで完璧にする
- **サーバー側のリトライ・レート制限** — 「もう一度」ボタンを人間が押す
- **入力バリデーションの作り込み** — FE で `maxLength=400`、BE で長さチェックのみ
- **テストコード** — `npm run check`（型 + lint）だけ通す
- **凝ったローディングアニメーション** — CSS の pulse で十分
- **ダークモード切替** — 最初からダークテーマ 1 本（映える上に工数が減る）

---

## 3. 時間割と同期ポイント

| 時刻 | フロント | バック | 同期 |
| --- | --- | --- | --- |
| 0:00–0:20 | 環境確認・画面の骨組み | **types.ts 追記 PR → 即マージ** | ★ 0:20 **契約確定。types.ts 凍結** |
| 0:20–0:40 | FE-1 モック UI | BE-1 雛形 + `?mock=1` + **Railway デプロイ** | ★ 0:40 **本番 URL で `?mock=1` が叩ける** |
| 0:40–1:30 | FE-2 API 連携 | BE-2 Gemini 組み込み | |
| 1:30–2:15 | FE-3 アニメ・演出 | BE-3 プロンプト調整 | ★ 1:45 **本物の応答で結合** |
| 2:15–2:40 | FE-4 デモ仕上げ | BE-4 本番疎通・予備キー確認 | ★ 2:30 **コードフリーズ** |
| 2:40–3:00 | **2 人でデモリハーサル 2 回** | | |

---

## 4. Issue 一覧

GitHub に登録済み。**担当ディレクトリは重ねない。**

| # | 担当 | Issue | ディレクトリ |
| --- | --- | --- | --- |
| FE-1 | フロント | [#4 ペルソナ定数とモック駆動の UI 骨組み](https://github.com/TakuyaMizukami7/Hackathon/issues/4) | `src/features/bias-filter/` |
| FE-2 | フロント | [#5 API 連携と状態管理](https://github.com/TakuyaMizukami7/Hackathon/issues/5) | 同上 |
| FE-3 | フロント | [#6 展開の演出とアニメーション](https://github.com/TakuyaMizukami7/Hackathon/issues/6) | 同上 |
| FE-4 | フロント | [#7 デモ用の仕上げ](https://github.com/TakuyaMizukami7/Hackathon/issues/7) | 同上 + `index.html` |
| BE-1 | バック | [#8 サーバー雛形 + モック応答 + デプロイ【最優先】](https://github.com/TakuyaMizukami7/Hackathon/issues/8) | `api/` or `server/routes/` |
| BE-2 | バック | [#9 Gemini 組み込みと JSON 構造化出力](https://github.com/TakuyaMizukami7/Hackathon/issues/9) | 同上 |
| BE-3 | バック | [#10 プロンプトエンジニアリング](https://github.com/TakuyaMizukami7/Hackathon/issues/10) | 同上 |
| BE-4 | バック | [#11 本番デプロイと事故対策](https://github.com/TakuyaMizukami7/Hackathon/issues/11) | 同上 |

---

## 5. プロンプト設計（BE-3 の中核）

素直に書くと Gemini は 4 ペルソナ全員を「バランスの取れた常識人」にしてしまう。
それではデモが死ぬ。**説明を増やすのではなく、禁止事項を増やすのが効く。**

### システムプロンプト

```
あなたは「Bias Filter」のエンジンです。
入力された出来事について、指定された各ペルソナに完全になりきり、
そのペルソナ特有の偏った解釈を書いてください。

【最重要ルール】
- 各ペルソナは自分の世界観を1ミリも疑いません。中立に寄せてはいけません。
- 「一方で」「とはいえ」「しかし別の見方も」といった両論併記は禁止です。
  1つのペルソナの解説の中に、複数の立場を書いてはいけません。
- 4つの解説は、同じ出来事について書いたとは思えないほど互いに食い違わせてください。
- 入力に書かれていない固有名詞・数字を、事実として断定しないでください。
  推測は「〜だろう」「〜に違いない」という語尾で、推測とわかるように書いてください。

【書式】
- headline: そのペルソナの結論を20文字以内で言い切る。体言止め可。
- body: 日本語で120〜180文字。そのペルソナの口調・語彙で書く。
- biasLevel: 1〜5。そのペルソナの主観の強さ。
- keywords: そのペルソナが好んで使う語を2〜3個。

【安全のための線引き】
- 実在の個人・団体への誹謗中傷、差別的表現は書かない。
- 医療・選挙・投資について、読者への具体的な行動指示は書かない。
- 「陰謀を疑う人」は、特定集団への攻撃ではなく
  「利害関係とタイミングへの疑い」の範囲にとどめる。風刺として書く。
```

### ユーザープロンプト

```
# 出来事
{text}

# summary
上の出来事を、感情を排して1文（40文字以内）で要約してください。

# perspectives（この4つを、この順番・このidで返す）

1. id="optimist" / persona="楽観主義者"
   あらゆる出来事を進歩とチャンスとして読む。リスクの話が出ても
   「乗り越えられる課題」に変換する。語尾は明るく力強い。

2. id="conspiracist" / persona="陰謀を疑う人"
   「なぜ今なのか」「誰が得をするのか」から入る。表向きの説明を
   カバーストーリーとして扱い、背後の利害を推測する。読者に問いかける口調。

3. id="historian2125" / persona="100年後の歴史家"
   2125年から2026年を振り返る。当時の人々の反応を「〜と考えられていた」と
   過去形で相対化し、この出来事を大きな流れの中の小さな一点として位置づける。
   淡々とした学術的な文体。

4. id="realist_investor" / persona="現実主義の投資家"
   感情論を切り捨て、損得・インセンティブ・数字だけで語る。
   「論点は一つ」「織り込み済み」のような断定的で短い文を好む。
```

### JSON を壊さないための実装（最重要）

「JSON で返して」とプロンプトで頼むだけの実装は、コードフェンスや前置きの挨拶で
**必ず壊れる**。`response_schema` を使ってスキーマ側から強制する。

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

res = client.models.generate_content(
    model=os.getenv("LLM_MODEL", "gemini-2.5-flash"),
    contents=USER_PROMPT.format(text=text),
    config=types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=ExpandResponse,   # Pydantic モデルをそのまま渡せる
        temperature=1.0,                  # 個性を出したいので高め
        max_output_tokens=2048,
        safety_settings=[                 # 陰謀論ペルソナがブロックされるのを防ぐ
            types.SafetySetting(category=c, threshold="BLOCK_ONLY_HIGH")
            for c in ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
                      "HARM_CATEGORY_DANGEROUS_CONTENT",
                      "HARM_CATEGORY_SEXUALLY_EXPLICIT"]
        ],
    ),
)
data = res.parsed   # Pydantic インスタンスが直接返る
```

Hono（`@google/genai`）の場合も同じ考え方で、`responseMimeType` と `responseSchema` を指定する。

---

## 6. 2 人で守る 3 つの約束

1. **`src/shared/types.ts` は 0:20 に凍結。** 追記が必要なら口頭で合意してから、追加のみ。
2. **`?mock=1` を最初に作る。** これがある限り、片方が詰まってももう片方は止まらない。
3. **2:30 コードフリーズ → 残り 30 分はデモリハーサル。**
   「あと 5 分で直る」は 3 時間ハッカソンで最も高くつく言葉。
