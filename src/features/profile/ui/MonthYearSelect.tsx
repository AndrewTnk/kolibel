import { MONTHS, YEARS } from '../lib/period'

type Props = {
  month?: number
  year?: number
  onMonth: (v?: number) => void
  onYear: (v?: number) => void
  /** Неактивные селекты (напр. когда «работаю сейчас»). */
  disabled?: boolean
  /** Класс контейнера-ряда (обычно row из CSS-модуля редактора). */
  rowClassName?: string
  /** Класс селектов (обычно select из CSS-модуля редактора). */
  selectClassName?: string
}

/** Пара селектов «Месяц / Год» для периода работы. */
export function MonthYearSelect({
  month,
  year,
  onMonth,
  onYear,
  disabled,
  rowClassName,
  selectClassName,
}: Props) {
  return (
    <div className={rowClassName}>
      <select
        className={selectClassName}
        value={month ?? ''}
        disabled={disabled}
        onChange={(e) => onMonth(e.target.value ? Number(e.target.value) : undefined)}
        aria-label="Месяц"
      >
        <option value="">Месяц</option>
        {MONTHS.map((mo, i) => (
          <option key={mo} value={i + 1}>
            {mo}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        value={year ?? ''}
        disabled={disabled}
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
