import type { ContactLink } from '../model/types'
import f from './ProfileFields.module.css'

type Props = {
  value: ContactLink[]
  onChange: (items: ContactLink[]) => void
}

/** Превращает введённое значение в ссылку: email → mailto, телефон → tel, иначе как есть. */
function deriveHref(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`
  if (/^[+\d][\d\s()-]{5,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, '')}`
  if (v.includes('.') && !v.includes(' ')) return `https://${v}`
  return v
}

export function LinksEditor({ value, onChange }: Props) {
  function update(idx: number, patch: Partial<ContactLink>) {
    onChange(
      value.map((item, i) => {
        if (i !== idx) return item
        const next = { ...item, ...patch }
        if ('value' in patch) next.href = deriveHref(next.value)
        return next
      }),
    )
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }
  function add() {
    onChange([...value, { label: '', value: '', href: '' }])
  }

  return (
    <div className={f.field}>
      {value.map((item, idx) => (
        <div key={idx} className={f.row}>
          <input
            className={f.input}
            value={item.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            placeholder="Тип (напр. Email, Telegram, GitHub)"
          />
          <div className={f.skillAdd}>
            <input
              className={f.input}
              value={item.value}
              onChange={(e) => update(idx, { value: e.target.value })}
              placeholder="Значение или ссылка"
            />
            <button type="button" className={f.expRemove} onClick={() => remove(idx)} aria-label="Удалить контакт">
              ✕
            </button>
          </div>
        </div>
      ))}

      <button type="button" className={f.addExpBtn} onClick={add}>
        + Добавить контакт
      </button>
    </div>
  )
}
