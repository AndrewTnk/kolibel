import type { EducationItem } from '../model/types'
import f from './ProfileFields.module.css'

type Props = {
  value: EducationItem[]
  onChange: (items: EducationItem[]) => void
}

function emptyItem(): EducationItem {
  return { id: `edu-${crypto.randomUUID()}`, institution: '', degree: '', period: '' }
}

export function EducationEditor({ value, onChange }: Props) {
  function update(id: string, patch: Partial<EducationItem>) {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }
  function remove(id: string) {
    onChange(value.filter((item) => item.id !== id))
  }
  function add() {
    onChange([...value, emptyItem()])
  }

  return (
    <div className={f.field}>
      {value.map((item, idx) => (
        <div key={item.id} className={f.expItem}>
          <div className={f.expItemHead}>
            <span className={f.expItemTitle}>Образование {idx + 1}</span>
            <button type="button" className={f.expRemove} onClick={() => remove(item.id)}>
              Удалить
            </button>
          </div>
          <input
            className={f.input}
            value={item.institution}
            onChange={(e) => update(item.id, { institution: e.target.value })}
            placeholder="Учебное заведение"
          />
          <div className={f.row}>
            <input
              className={f.input}
              value={item.degree}
              onChange={(e) => update(item.id, { degree: e.target.value })}
              placeholder="Степень / специальность"
            />
            <input
              className={f.input}
              value={item.period}
              onChange={(e) => update(item.id, { period: e.target.value })}
              placeholder="Период (напр. 2016 — 2020)"
            />
          </div>
        </div>
      ))}

      <button type="button" className={f.addExpBtn} onClick={add}>
        + Добавить образование
      </button>
    </div>
  )
}
