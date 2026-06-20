import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CITIES, type CityEntry } from '../../lib/cities'
import acss from '../Autocomplete/Autocomplete.module.css'

type Props = {
  city: string
  country: string
  /** Возвращает выбранные город и страну (страна пустая при свободном вводе). */
  onChange: (city: string, country: string) => void
  inputClassName?: string
  placeholder?: string
  ariaLabel?: string
}

const SEP = ' · '

/** Объединённое отображение «Страна · Город» (или только город, если страны нет). */
function combined(country: string, city: string): string {
  return country && city ? `${country}${SEP}${city}` : city || ''
}

/**
 * Поле «Город · Страна» с автодополнением. Ввод фильтрует города по началу
 * названия, в списке и в поле показывается «Страна · Город» (через точку).
 * Свободный ввод (города нет в списке) сохраняется как город без страны.
 */
export function LocationField({ city, country, onChange, inputClassName, placeholder, ariaLabel }: Props) {
  const [query, setQuery] = useState(() => combined(country, city))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const focusedRef = useRef(false)

  // Ресинк при внешнем изменении (подгрузка из стора) — но не во время редактирования.
  useEffect(() => {
    if (!focusedRef.current) setQuery(combined(country, city))
  }, [country, city])

  const q = query.trim().toLowerCase()
  const matches = useMemo<CityEntry[]>(() => {
    // Уже выбрано «Страна · Город» → подсказки не показываем.
    if (!q || q.includes('·')) return []
    return CITIES.filter((c) => c.city.toLowerCase().startsWith(q)).slice(0, 8)
  }, [q])

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  function pick(c: CityEntry) {
    onChange(c.city, c.country)
    setQuery(combined(c.country, c.city))
    setOpen(false)
    setActive(-1)
  }

  function commitFreeText() {
    const t = query.trim()
    if (!t) {
      onChange('', '')
      return
    }
    // Строка вида «Страна · Город» уже зафиксирована выбором — не трогаем модель.
    if (t.includes('·')) return
    onChange(t, '')
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
    <div className={acss.wrap} ref={wrapRef}>
      <input
        className={inputClassName}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => {
          focusedRef.current = true
          setOpen(true)
        }}
        onBlur={() => {
          focusedRef.current = false
          commitFreeText()
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {open && matches.length ? (
        <ul className={acss.menu} role="listbox">
          {matches.map((c, i) => (
            <li
              key={`${c.country}-${c.city}`}
              role="option"
              aria-selected={i === active}
              className={[acss.item, i === active ? acss.itemActive : ''].join(' ')}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              onMouseEnter={() => setActive(i)}
            >
              {combined(c.country, c.city)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
