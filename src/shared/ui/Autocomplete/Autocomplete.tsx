import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import styles from './Autocomplete.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  /** Выбор подсказки. По умолчанию — onChange. */
  onSelect?: (v: string) => void
  /** Enter без выбранной подсказки. */
  onEnter?: () => void
  suggestions: string[]
  placeholder?: string
  /** Класс для input (обычно f.input). */
  inputClassName?: string
  /** Показывать все подсказки при фокусе с пустым вводом. */
  showAllOnFocus?: boolean
  maxItems?: number
  ariaLabel?: string
}

export function Autocomplete({
  value,
  onChange,
  onSelect,
  onEnter,
  suggestions,
  placeholder,
  inputClassName,
  showAllOnFocus = false,
  maxItems = 8,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const q = value.trim().toLowerCase()
  const matches = (
    q
      ? suggestions.filter((s) => s.toLowerCase().startsWith(q) && s.toLowerCase() !== q)
      : showAllOnFocus
        ? suggestions
        : []
  ).slice(0, maxItems)

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  function pick(s: string) {
    if (onSelect) onSelect(s)
    else onChange(s)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (open && matches.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, matches.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
        return
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault()
        pick(matches[active])
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
    }
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault()
      onEnter()
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        className={inputClassName}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {open && matches.length ? (
        <ul className={styles.menu} role="listbox">
          {matches.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === active}
              className={[styles.item, i === active ? styles.itemActive : ''].join(' ')}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(s)
              }}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
