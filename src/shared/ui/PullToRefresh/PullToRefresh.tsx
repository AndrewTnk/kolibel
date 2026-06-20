import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useIsMobile } from '../../lib/useMediaQuery'
import styles from './PullToRefresh.module.css'

/** Дистанция тяги (после сопротивления), при которой срабатывает обновление. */
const THRESHOLD = 70
/** Максимальная видимая тяга — дальше индикатор не уезжает. */
const MAX_PULL = 110
/** Коэффициент сопротивления: палец тянет вдвое больше, чем уходит индикатор. */
const RESISTANCE = 0.5

/** Жест начат внутри вложенного скроллера (модалка/тред) → не наш pull-to-refresh. */
function insideScroller(node: EventTarget | null): boolean {
  let el = node as HTMLElement | null
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return true
    el = el.parentElement
  }
  return false
}

/**
 * Глобальный pull-to-refresh для мобильного app-shell (скроллится `document.body`).
 * Тяга вниз от самого верха страницы → кружок-загрузка → `location.reload()`.
 * Отключён на десктопе и на `/chat` (у чата свой фикс. layout с залоченным body).
 */
export function PullToRefresh() {
  const isMobile = useIsMobile()
  const { pathname } = useLocation()
  const enabled = isMobile && pathname !== '/chat'

  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Состояние жеста держим в ref — чтобы не перевешивать слушатели на каждый кадр тяги.
  const g = useRef({ startY: 0, armed: false, pulling: false, pull: 0, refreshing: false })

  useEffect(() => {
    if (!enabled) return
    const s = g.current
    const apply = (v: number) => {
      s.pull = v
      setPull(v)
    }

    const onStart = (e: TouchEvent) => {
      if (s.refreshing || e.touches.length !== 1) {
        s.armed = false
        return
      }
      if (document.body.scrollTop > 0 || insideScroller(e.target)) {
        s.armed = false
        return
      }
      s.startY = e.touches[0].clientY
      s.armed = true
      s.pulling = false
    }

    const reset = () => {
      if (s.pulling) {
        s.pulling = false
        setDragging(false)
        apply(0)
      }
    }

    const onMove = (e: TouchEvent) => {
      if (!s.armed || s.refreshing) return
      // Страница успела прокрутиться вниз — это обычный скролл, не наш жест.
      if (document.body.scrollTop > 0) {
        s.armed = false
        reset()
        return
      }
      const dy = e.touches[0].clientY - s.startY
      if (dy <= 0) {
        reset()
        return
      }
      if (!s.pulling) {
        s.pulling = true
        setDragging(true)
      }
      e.preventDefault() // глушим нативный overscroll-bounce, пока тянем
      apply(Math.min(MAX_PULL, dy * RESISTANCE))
    }

    const onEnd = () => {
      if (!s.armed) return
      s.armed = false
      setDragging(false)
      if (s.pulling && s.pull >= THRESHOLD) {
        s.refreshing = true
        setRefreshing(true)
        apply(THRESHOLD)
        window.setTimeout(() => window.location.reload(), 450)
      } else {
        apply(0)
      }
      s.pulling = false
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled])

  if (!enabled) return null

  const progress = Math.min(1, pull / THRESHOLD)
  const visible = pull > 2 || refreshing

  return (
    <div
      className={styles.root}
      style={{
        transform: `translateX(-50%) translateY(${pull}px)`,
        opacity: visible ? 1 : 0,
        transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.2s ease',
      }}
      aria-hidden
    >
      <div className={styles.bubble}>
        <span
          className={`${styles.spinner} ${refreshing ? styles.spinning : ''}`}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 280}deg)`, opacity: 0.35 + progress * 0.65 }
          }
        />
      </div>
    </div>
  )
}
