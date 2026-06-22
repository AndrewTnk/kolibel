import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { searchCompaniesByName, type CompanySuggestion } from '../lib/searchCompanies'
import styles from './CompanyAutocomplete.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  /** Выбор компании из списка (название уже проставлено через onChange). */
  onSelect?: (c: CompanySuggestion) => void
  placeholder?: string
  /** Класс input (обычно m.input модалки). */
  inputClassName?: string
}

/**
 * Поле «Компания» с автоподсказкой зарегистрированных компаний.
 * Подсказки грузятся из БД по началу названия (дебаунс), строка — лого + название.
 */
export function CompanyAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  inputClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [items, setItems] = useState<CompanySuggestion[]>([])
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Дебаунс-поиск по вводу.
  useEffect(() => {
    const q = value.trim()
    if (!q) {
      setItems([])
      return
    }
    let alive = true
    const t = setTimeout(async () => {
      const res = await searchCompaniesByName(q)
      if (alive) setItems(res)
    }, 200)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [value])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Не показываем подсказку, если введено ровно её название.
  const matches = items.filter((c) => c.name.toLowerCase() !== value.trim().toLowerCase())

  function pick(c: CompanySuggestion) {
    onChange(c.name)
    onSelect?.(c)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || !matches.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(matches[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
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
        autoComplete="off"
      />
      {open && matches.length ? (
        <ul className={styles.menu} role="listbox">
          {matches.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              className={[styles.item, i === active ? styles.itemActive : ''].join(' ')}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className={styles.logo} aria-hidden>
                {c.logo ? <img src={c.logo} alt="" /> : (c.name[0] || '?').toUpperCase()}
              </span>
              <span className={styles.name}>{c.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
