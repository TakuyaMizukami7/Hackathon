/**
 * ペルソナのカタログ（表示メタ）。
 *
 * この設計の要。AI にペルソナ名を考えさせず、フロントが id ごとの
 * 表示名・絵文字・色を持つ。おかげで
 *   1. API が無くても UI を完成形まで作れる
 *   2. ローディング中もペルソナ名を先に描ける
 *   3. AI が変な persona 名を返してもレイアウトが崩れない
 */
import type { PersonaId } from '../../shared/types'

export type PersonaMeta = {
  label: string
  emoji: string
  color: string
}

export const PERSONA_META: Record<PersonaId, PersonaMeta> = {
  optimist: { label: '楽観主義者', emoji: '🌞', color: '#f59e0b' },
  conspiracist: { label: '陰謀を疑う人', emoji: '🕶️', color: '#a855f7' },
  historian2125: { label: '100年後の歴史家', emoji: '📜', color: '#38bdf8' },
  realist_investor: { label: '現実主義の投資家', emoji: '📈', color: '#22c55e' },
}

/** 入力の上限。BE 側のバリデーションと同じ値にすること */
export const MAX_TEXT_LENGTH = 400
