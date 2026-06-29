import { useEffect, useRef, useState } from 'react'
import s from './Vacancies.module.css'

/** Закрытие по клику вне контейнера. */
function useOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  })
}

function Caret() {
  return (
    <svg className={s.ddCaret} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// ── Кастомный селект (вместо нативного <select> — единый стиль меню) ──────
export function Select({
  value,
  options,
  onChange,
  placeholder = 'Любой',
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false))
  const current = options.find((o) => o.value === value)

  return (
    <div className={s.ddWrap} ref={ref}>
      <button
        type="button"
        className={[s.control, s.ddControl].join(' ')}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={current ? '' : s.ddPlaceholder}>{current?.label ?? placeholder}</span>
        <Caret />
      </button>
      {open && (
        <div className={s.ddMenu} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={[s.ddOption, o.value === value ? s.ddOptionOn : ''].filter(Boolean).join(' ')}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Комбобокс: ввод + подсказки (город / компания) ──────────────────────
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false))

  const q = value.trim().toLowerCase()
  // Подсказки появляются только при вводе (не пустой запрос).
  const matches = q
    ? options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, 8)
    : []

  return (
    <div className={s.ddWrap} ref={ref}>
      <input
        className={s.control}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {value ? (
        <button
          type="button"
          className={s.ddClear}
          aria-label="Очистить"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange('')}
        >
          ×
        </button>
      ) : null}
      {open && matches.length > 0 && (
        <div className={s.ddMenu}>
          {matches.map((o) => (
            <button
              key={o}
              type="button"
              className={s.ddOption}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o)
                setOpen(false)
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Навыки: чипы выбранных + ввод с подсказками ─────────────────────────
export function SkillsInput({
  values,
  options,
  onAdd,
  onRemove,
  placeholder = 'Введите навык и нажмите Enter',
}: {
  values: string[]
  options: string[]
  onAdd: (skill: string) => void
  onRemove: (skill: string) => void
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false))

  const q = text.trim().toLowerCase()
  const lower = values.map((v) => v.toLowerCase())
  const matches = q
    ? options.filter((o) => o.toLowerCase().includes(q) && !lower.includes(o.toLowerCase())).slice(0, 8)
    : []

  const add = (skill: string) => {
    const t = skill.trim()
    if (t && !lower.includes(t.toLowerCase())) onAdd(t)
    setText('')
    setOpen(false)
  }

  return (
    <div className={s.skillsField}>
      {values.length > 0 && (
        <div className={s.skillChips}>
          {values.map((v) => (
            <span key={v} className={[s.skillChip, s.skillChipActive].join(' ')}>
              {v}
              <button type="button" className={s.skillChipX} onClick={() => onRemove(v)} aria-label={`Убрать ${v}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={s.ddWrap} ref={ref}>
        <input
          className={s.control}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(text)
            }
          }}
          placeholder={placeholder}
        />
        {open && matches.length > 0 && (
          <div className={[s.ddMenu, s.ddMenuUp].join(' ')}>
            {matches.map((o) => (
              <button
                key={o}
                type="button"
                className={s.ddOption}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(o)}
              >
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
