import { useEffect, useRef, useState } from 'react'
import styles from './MoreMenu.module.css'

export type MoreMenuItem = {
  label: string
  onClick?: () => void
}

/**
 * Меню «три точки» (⋯) с выпадающим списком действий.
 * Кнопка-триггер без бордера; закрывается по клику вне и по Escape.
 */
export function MoreMenu({
  items,
  className = '',
  ariaLabel = 'Ещё',
}: {
  items: MoreMenuItem[]
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} ref={ref}>
      <button
        type="button"
        className={styles.btn}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div className={styles.menu} role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => {
                it.onClick?.()
                setOpen(false)
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
