import type { Highlight } from '../model/types'
import f from './ProfileFields.module.css'

type Props = {
  value: Highlight[]
  onChange: (items: Highlight[]) => void
}

export function HighlightsEditor({ value, onChange }: Props) {
  function update(idx: number, patch: Partial<Highlight>) {
    onChange(value.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }
  function add() {
    onChange([...value, { label: '', value: '' }])
  }

  return (
    <div className={f.field}>
      {value.map((item, idx) => (
        <div key={idx} className={f.row}>
          <input
            className={f.input}
            value={item.value}
            onChange={(e) => update(idx, { value: e.target.value })}
            placeholder="Значение (напр. 4 года)"
          />
          <div className={f.skillAdd}>
            <input
              className={f.input}
              value={item.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              placeholder="Подпись (напр. Опыт)"
            />
            <button type="button" className={f.expRemove} onClick={() => remove(idx)} aria-label="Удалить">
              ✕
            </button>
          </div>
        </div>
      ))}

      <button type="button" className={f.addExpBtn} onClick={add}>
        + Добавить факт
      </button>
    </div>
  )
}
