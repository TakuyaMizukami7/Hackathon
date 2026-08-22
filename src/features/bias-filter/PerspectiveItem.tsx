import { useState } from 'react'
import type { CSSProperties } from 'react'
import { PERSONA_IDS } from '../../shared/types'
import type { PersonaId, Perspective } from '../../shared/types'
import { PERSONA_META } from './personas'
import {
  LINE_STAGGER_MS,
  THINKING_LINES,
  usePrefersReducedMotion,
  useRotatingIndex,
} from './thinking'

/**
 * ペルソナ 1 人分のドロップダウン。
 * 中身(perspective)が無いときは、名前と「考え中の独り言」だけを出す。
 * ローディング中もペルソナ名を先に出せるのがこの設計の狙い。
 *
 * 開閉は排他にしない。4 つ同時に開いて見比べるのがこのアプリの見せ場。
 */
export function PerspectiveItem({
  id,
  perspective,
  loading = false,
}: {
  id: PersonaId
  perspective?: Perspective
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const meta = PERSONA_META[id]
  const ready = perspective !== undefined
  const thinking = loading && !ready

  // 4 人が同時に喋り出すと機械っぽいので、並び順ぶんだけ最初の切り替えをずらす
  const order = PERSONA_IDS.indexOf(id)
  const lines = THINKING_LINES[id]
  const reducedMotion = usePrefersReducedMotion()
  const lineIndex = useRotatingIndex(
    lines.length,
    thinking && !reducedMotion,
    order * LINE_STAGGER_MS,
  )

  return (
    // 中身が揃った瞬間に --in が付き、CSS 側の順番待ちアニメーションが 1 回だけ走る。
    // --bf-persona は CSS のアニメーション（左端の明滅・点の色）がペルソナ色を使うため
    <li
      className={ready ? 'bf-item bf-item--in' : thinking ? 'bf-item bf-item--thinking' : 'bf-item'}
      style={{ borderLeftColor: meta.color, '--bf-persona': meta.color } as CSSProperties}
    >
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
          {ready ? (
            <span className="bf-item__headline">{perspective.headline}</span>
          ) : thinking ? (
            // key を付け替えることで、行が変わるたびにフェードインを 1 回だけ流し直す
            <span className="bf-item__headline bf-item__thinking">
              <span key={lineIndex} className="bf-item__thinking-line">
                {lines[lineIndex]}
              </span>
              <span className="bf-item__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
          ) : (
            <span className="bf-item__headline bf-item__headline--empty">
              この視点は返ってきませんでした
            </span>
          )}
        </span>
        <span className="bf-item__caret" aria-hidden="true">
          ▽
        </span>
      </button>

      {/* 開閉のアニメーションのため、閉じている間も DOM に残す（高さは CSS の 0fr → 1fr で動かす）。
          条件レンダリングに戻すと閉じるときのトランジションが効かなくなる */}
      {ready && (
        <div className="bf-item__body" data-open={open}>
          <div className="bf-item__body-clip">
            <div className="bf-item__body-inner">
              <p className="bf-item__text">{perspective.body}</p>
              <div className="bf-item__meta">
                <span
                  className="bf-item__bias"
                  title={`バイアスの強さ ${perspective.biasLevel} / 5`}
                >
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
          </div>
        </div>
      )}
    </li>
  )
}
