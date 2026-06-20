import { useRef, useState, type ReactNode } from 'react'
import styles from './Recommendations.module.css'

/**
 * Постраничный «свайп»-листатель рекомендаций: показывает по `perPage` элементов,
 * снизу — точки-пагинация. Листается перетаскиванием (свайп) и кликом по точкам.
 */
export function RecPager<T>({
  items,
  perPage = 3,
  renderItem,
}: {
  items: T[]
  perPage?: number
  renderItem: (item: T) => ReactNode
}) {
  const [page, setPage] = useState(0)
  const [dx, setDx] = useState(0)
  const drag = useRef<{ x: number; w: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)
  const winRef = useRef<HTMLDivElement | null>(null)

  const pages: T[][] = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))
  const count = pages.length
  const cur = Math.min(page, Math.max(0, count - 1))

  if (count <= 1) {
    return <div className={styles.pagerPage}>{(pages[0] ?? []).map(renderItem)}</div>
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, w: e.currentTarget.offsetWidth || 1, moved: false }
    // ВАЖНО: не захватываем указатель здесь — иначе Chrome ретаргетит click на
    // контейнер пейджера, и клик не доходит до карточки/ссылки. Захватываем
    // только когда действительно начался свайп (в onMove).
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    let d = e.clientX - drag.current.x
    if (Math.abs(d) > 5 && !drag.current.moved) {
      drag.current.moved = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    // сопротивление на крайних страницах
    if ((cur === 0 && d > 0) || (cur === count - 1 && d < 0)) d *= 0.35
    setDx(d)
  }
  function onUp() {
    if (!drag.current) return
    const threshold = drag.current.w * 0.18
    if (dx < -threshold) setPage(Math.min(count - 1, cur + 1))
    else if (dx > threshold) setPage(Math.max(0, cur - 1))
    if (drag.current.moved) swallowClick.current = true // не открывать карточку после свайпа
    setDx(0)
    drag.current = null
  }

  return (
    <div className={styles.pager}>
      <div
        className={styles.pagerWindow}
        ref={winRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.preventDefault()
            e.stopPropagation()
            swallowClick.current = false
          }
        }}
      >
        <div
          className={styles.pagerTrack}
          style={{
            transform: `translateX(calc(${-cur * 100}% + ${dx}px))`,
            transition: drag.current ? 'none' : 'transform 0.28s ease',
          }}
        >
          {pages.map((pg, i) => (
            <div className={styles.pagerPage} key={i}>
              {pg.map(renderItem)}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.pagerDots} role="tablist" aria-label="Страницы рекомендаций">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            className={[styles.pagerDot, i === cur ? styles.pagerDotActive : ''].join(' ')}
            onClick={() => setPage(i)}
            aria-label={`Страница ${i + 1}`}
            aria-selected={i === cur}
          />
        ))}
      </div>
    </div>
  )
}
