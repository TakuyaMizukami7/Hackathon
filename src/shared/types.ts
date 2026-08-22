/**
 * フロントとサーバー(api/)が共有する「契約」。
 *
 * ここは 2 人が同時に触る最重要ファイル。ルールは 3 つ。
 *   1. ハッカソン開始 30 分以内に 2 人で確定させる
 *   2. 以降は「追加」のみ。既存フィールドの名前変更・削除は口頭合意してから
 *   3. ロジックを書かない（型と定数だけ）。ロジックを書くとコンフリクトする
 */

/**
 * チャット 1 往復のメッセージ。
 * role はフロントで扱いやすい 'user' | 'assistant' で統一する。
 * Gemini 側の 'user' | 'model' への変換は server/routes/chat.ts が行う。
 */
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/** POST /api/chat のリクエストボディ */
export type ChatRequest = {
  messages: ChatMessage[]
  /** 任意。AI の役割を指定する */
  system?: string
}

/** GET /api/health のレスポンス */
export type HealthResponse = {
  ok: boolean
  /** サーバー時刻(ISO8601) */
  time: string
  /** 実行リージョン。asia-southeast1-eqsg3a ならシンガポール */
  region: string
  /** 環境名。production / pr-12 など */
  env: string
  /** 今動いているコミット(短縮SHA)。自分の変更が反映されたか確認できる */
  commit: string
  /** LLM の API キーがサーバーに設定されているか */
  hasApiKey: boolean
}

/** API がエラーを返すときの共通形 */
export type ApiError = {
  error: string
}

/**
 * ペルソナの識別子。AI はこの id 以外を返してはいけない。
 * 表示名・絵文字・色といった見た目のメタはフロント側の定数
 * (src/features/bias-filter/personas.ts) が持つ。
 */
export type PersonaId = 'optimist' | 'conspiracist' | 'historian2125' | 'realist_investor'

/** 表示順。API のレスポンスもこの順で返る */
export const PERSONA_IDS: PersonaId[] = [
  'optimist',
  'conspiracist',
  'historian2125',
  'realist_investor',
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
