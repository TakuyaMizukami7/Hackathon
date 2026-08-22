import { useState } from 'react'
import type { PersonaId, Perspective } from '../../shared/types'
import { PERSONA_META } from './personas'

/**
 * ペルソナ 1 人分のドロップダウン。
 * 中身(perspective)が無いときは、名前だけ出して「生成中…」を表示する。
 * ローディング中もペルソナ名を先に出せるのがこの設計の狙い。
 */
export function PerspectiveItem({ id, perspective }: { id: PersonaId; perspective?: Perspective }) {
  const [open, setOpen] = useState(false)
  const meta = PERSONA_META[id]
  const ready = perspective !== undefined

  return (
    <li className="bf-item" style={{ borderLeftColor: meta.color }}>
      <button
        type="button"
        className="bf-item__head"
        aria-expanded={open}
        disabled={!ready}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="bf-item__emoji" style={{ color: meta.color }} aria-hidden="true">
          {meta.emoji}
        </span>
        <span className="bf-item__labels">
          <span className="bf-item__persona" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="bf-item__headline">{ready ? perspective.headline : '生成中…'}</span>
        </span>
        <span className="bf-item__caret" aria-hidden="true">
          ▽
        </span>
      </button>

      {open && ready && (
        <div className="bf-item__body">
          <p className="bf-item__text">{perspective.body}</p>
          <div className="bf-item__meta">
            <span className="bf-item__bias" title={`バイアスの強さ ${perspective.biasLevel} / 5`}>
              バイアス
              <span className="bf-item__bars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="bf-item__bar"
                    style={{ background: n <= perspective.biasLevel ? meta.color : undefined }}
                  />
                ))}
              </span>
            </span>
            <span className="bf-item__tags">
              {perspective.keywords.map((word) => (
                <span key={word} className="bf-item__tag">
                  #{word}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
    </li>
  )
}
