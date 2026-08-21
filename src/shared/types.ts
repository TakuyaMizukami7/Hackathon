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
