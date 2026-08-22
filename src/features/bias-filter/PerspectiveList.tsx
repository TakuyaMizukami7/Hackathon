import { PERSONA_IDS } from '../../shared/types'
import type { Perspective } from '../../shared/types'
import { PerspectiveItem } from './PerspectiveItem'

/**
 * 5 つのドロップダウンを PERSONA_IDS の順に並べる。
 * 並び順は API の返り順ではなく必ずこの定数に従う（AI の返り順を信用しない）。
 *
 * perspectives が空でも 5 つ描く。生成待ちの間もペルソナ名を見せるため。
 */
export function PerspectiveList({
  perspectives,
  loading = false,
}: {
  perspectives: Perspective[]
  loading?: boolean
}) {
  const byId = new Map(perspectives.map((p) => [p.id, p]))

  return (
    <ul className="bf-list" aria-busy={loading}>
      {PERSONA_IDS.map((id) => (
        <PerspectiveItem key={id} id={id} perspective={byId.get(id)} loading={loading} />
      ))}
    </ul>
  )
}
