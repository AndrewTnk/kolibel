import type { ExperienceItem } from '../model/types'
import { SkillsEditor } from './SkillsEditor'
import f from './ProfileFields.module.css'

type Props = {
  value: ExperienceItem[]
  onChange: (items: ExperienceItem[]) => void
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 55 }, (_, i) => CURRENT_YEAR - i)

function monthYear(month?: number, year?: number) {
  if (!year) return ''
  return month ? `${MONTHS[month - 1]} ${year}` : `${year}`
}

/** Собирает строку периода из структурированных полей. */
function composePeriod(item: ExperienceItem): string {
  const start = monthYear(item.startMonth, item.startYear)
  const end = item.current ? 'наст. время' : monthYear(item.endMonth, item.endYear)
  if (start && end) return `${start} — ${end}`
  return start || end
}

function emptyItem(): ExperienceItem {
  return {
    id: `exp-${crypto.randomUUID()}`,
    role: '',
    company: '',
    period: '',
    summary: '',
    achievements: [],
    stack: [],
  }
}

function MonthYear({
  month,
  year,
  onMonth,
  onYear,
}: {
  month?: number
  year?: number
  onMonth: (v?: number) => void
  onYear: (v?: number) => void
}) {
  return (
    <div className={f.row}>
      <select
        className={f.select}
        value={month ?? ''}
        onChange={(e) => onMonth(e.target.value ? Number(e.target.value) : undefined)}
        aria-label="Месяц"
      >
        <option value="">Месяц</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        className={f.select}
        value={year ?? ''}
        onChange={(e) => onYear(e.target.value ? Number(e.target.value) : undefined)}
        aria-label="Год"
      >
        <option value="">Год</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
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
            <MonthYear
              month={item.startMonth}
              year={item.startYear}
              onMonth={(startMonth) => updatePeriod(item.id, { startMonth })}
              onYear={(startYear) => updatePeriod(item.id, { startYear })}
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
            {!item.current ? (
              <MonthYear
                month={item.endMonth}
                year={item.endYear}
                onMonth={(endMonth) => updatePeriod(item.id, { endMonth })}
                onYear={(endYear) => updatePeriod(item.id, { endYear })}
              />
            ) : null}
          </div>

          <textarea
            className={f.textarea}
            value={item.summary}
            onChange={(e) => update(item.id, { summary: e.target.value })}
            placeholder="Кратко о роли"
          />

          <div className={f.field}>
            <span className={f.label}>Достижения (по одному в строке)</span>
            <textarea
              className={f.textarea}
              value={item.achievements.join('\n')}
              onChange={(e) => update(item.id, { achievements: e.target.value.split('\n') })}
              placeholder={'Например:\nСократил время загрузки на 35%\nВнедрил дизайн-систему'}
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
