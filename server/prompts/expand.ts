/**
 * POST /api/expand で Gemini に渡すプロンプト。
 *
 * 中身は BE-3（プロンプトエンジニアリング）が実装する。
 * BE-2（Gemini 組み込み）はこの契約（関数シグネチャ）に対して実装するため、
 * このファイルの中身は BE-2 側からは編集しない。
 */

/** システムプロンプト。4ペルソナの人格・禁止事項を定義する */
export const SYSTEM_PROMPT = ''

/** ユーザープロンプトを組み立てる。text は 1〜400 文字（呼び出し側で検証済み） */
export function buildUserPrompt(text: string): string {
  return text
}
