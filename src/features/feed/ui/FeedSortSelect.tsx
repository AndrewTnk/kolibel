import { useEffect, useRef, useState } from 'react'
import { FEED_SORT_OPTIONS, type FeedSortMode } from '../lib/feedSort'
import s from './FeedSortSelect.module.css'

/** Выпадающий селектор сортировки ленты (над постами на главной). */
export function FeedSortSelect({
  value,
  onChange,
}: {
  value: FeedSortMode
  onChange: (mode: FeedSortMode) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = FEED_SORT_OPTIONS.find((o) => o.value === value) ?? FEED_SORT_OPTIONS[0]

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
    <div className={s.wrap} ref={ref}>
      <span className={s.line} aria-hidden />
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={s.prefix}>Показать:</span>
        <span className={s.value}>{current.label}</span>
        <svg
          className={[s.chev, open ? s.chevOpen : ''].filter(Boolean).join(' ')}
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className={s.menu} role="listbox">
          {FEED_SORT_OPTIONS.map((o) => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                className={[s.item, active ? s.itemOn : ''].filter(Boolean).join(' ')}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                <span>{o.label}</span>
                {active ? (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
