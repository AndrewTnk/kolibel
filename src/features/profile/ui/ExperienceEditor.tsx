import type { ExperienceItem } from '../model/types'
import { composePeriod } from '../lib/period'
import { RichEditor } from '../../../shared/ui/RichEditor/RichEditor'
import { MonthYearSelect } from './MonthYearSelect'
import { SkillsEditor } from './SkillsEditor'
import f from './ProfileFields.module.css'

type Props = {
  value: ExperienceItem[]
  onChange: (items: ExperienceItem[]) => void
}

function emptyItem(): ExperienceItem {
  return {
    id: `exp-${crypto.randomUUID()}`,
    role: '',
    company: '',
    period: '',
    summary: '',
    achievements: '',
    stack: [],
  }
}

export function ExperienceEditor({ value, onChange }: Props) {
  /** Изменение обычных полей — без пересборки периода. */
  function update(id: string, patch: Partial<ExperienceItem>) {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  /** Изменение полей периода — пересобирает строку period. */
  function updatePeriod(id: string, patch: Partial<ExperienceItem>) {
    onChange(
      value.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        return { ...next, period: composePeriod(next) }
      }),
    )
  }

  function remove(id: string) {
    onChange(value.filter((item) => item.id !== id))
  }

  function add() {
    onChange([...value, emptyItem()])
  }

  return (
    <div className={f.field}>
      <span className={f.label}>Где работал</span>

      {value.map((item, idx) => (
        <div key={item.id} className={f.expItem}>
          <div className={f.expItemHead}>
            <span className={f.expItemTitle}>Опыт {idx + 1}</span>
            <button type="button" className={f.expRemove} onClick={() => remove(item.id)}>
              Удалить
            </button>
          </div>

          <div className={f.row}>
            <input
              className={f.input}
              value={item.company}
              onChange={(e) => update(item.id, { company: e.target.value })}
              placeholder="Компания"
            />
            <input
              className={f.input}
              value={item.role}
              onChange={(e) => update(item.id, { role: e.target.value })}
              placeholder="Должность"
            />
          </div>

          <div className={f.field}>
            <span className={f.label}>Начало работы</span>
            <MonthYearSelect
              month={item.startMonth}
              year={item.startYear}
              onMonth={(startMonth) => updatePeriod(item.id, { startMonth })}
              onYear={(startYear) => updatePeriod(item.id, { startYear })}
              rowClassName={f.row}
              selectClassName={f.select}
            />
          </div>

          <div className={f.field}>
            <span className={f.label}>Окончание работы</span>
            <label className={f.checkRow}>
              <input
                type="checkbox"
                checked={!!item.current}
                onChange={(e) =>
                  updatePeriod(item.id, {
                    current: e.target.checked,
                    ...(e.target.checked ? { endMonth: undefined, endYear: undefined } : {}),
                  })
                }
              />
              Работаю в настоящее время
            </label>
            <MonthYearSelect
              month={item.endMonth}
              year={item.endYear}
              onMonth={(endMonth) => updatePeriod(item.id, { endMonth })}
              onYear={(endYear) => updatePeriod(item.id, { endYear })}
              disabled={!!item.current}
              rowClassName={f.row}
              selectClassName={f.select}
            />
          </div>

          <textarea
            className={f.textarea}
            value={item.summary}
            onChange={(e) => update(item.id, { summary: e.target.value })}
            placeholder="Кратко о роли"
          />

          <div className={f.field}>
            <span className={f.label}>Достижения</span>
            <RichEditor
              value={item.achievements}
              onChange={(md) => update(item.id, { achievements: md })}
              placeholder="Сократил время загрузки на 35%"
            />
          </div>

          <SkillsEditor
            label="Стек технологий"
            placeholder="Начните вводить технологию…"
            value={item.stack}
            onChange={(stack) => update(item.id, { stack })}
          />
        </div>
      ))}

      <button type="button" className={f.addExpBtn} onClick={add}>
        + Добавить опыт
      </button>
    </div>
  )
}
