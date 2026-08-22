import { PERSONA_IDS } from '../../shared/types'
import type { Perspective } from '../../shared/types'
import { PerspectiveItem } from './PerspectiveItem'

/**
 * 4 つのドロップダウンを PERSONA_IDS の順に並べる。
 * 並び順は API の返り順ではなく必ずこの定数に従う（AI の返り順を信用しない）。
 */
export function PerspectiveList({ perspectives }: { perspectives: Perspective[] }) {
  const byId = new Map(perspectives.map((p) => [p.id, p]))

  return (
    <ul className="bf-list">
      {PERSONA_IDS.map((id) => (
        <PerspectiveItem key={id} id={id} perspective={byId.get(id)} />
      ))}
    </ul>
  )
}
