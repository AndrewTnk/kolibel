/** Общие хелперы периода работы (месяц/год) — для редакторов опыта. */

export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const CURRENT_YEAR = new Date().getFullYear()
export const YEARS = Array.from({ length: 55 }, (_, i) => CURRENT_YEAR - i)

export function monthYear(month?: number, year?: number): string {
  if (!year) return ''
  return month ? `${MONTHS[month - 1]} ${year}` : `${year}`
}

/** Поля периода (подмножество ExperienceItem). */
export type PeriodParts = {
  startMonth?: number
  startYear?: number
  endMonth?: number
  endYear?: number
  current?: boolean
}

/** Собирает строку периода из структурированных полей. */
export function composePeriod(p: PeriodParts): string {
  const start = monthYear(p.startMonth, p.startYear)
  const end = p.current ? 'наст. время' : monthYear(p.endMonth, p.endYear)
  if (start && end) return `${start} — ${end}`
  return start || end
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Суммарный опыт в месяцах по структурированным датам (позиции без дат пропускаются). */
export function totalExperienceMonths(items: PeriodParts[]): number {
  const now = new Date()
  const nowM = now.getFullYear() * 12 + now.getMonth()
  let total = 0
  for (const it of items) {
    if (!it.startYear) continue
    const start = it.startYear * 12 + ((it.startMonth ?? 1) - 1)
    let end: number
    if (it.current) end = nowM
    else if (it.endYear) end = it.endYear * 12 + ((it.endMonth ?? 12) - 1)
    else continue
    if (end > start) total += end - start
  }
  return total
}

/** «4 года 2 месяца» из числа месяцев (пусто, если 0). */
export function formatExperience(months: number): string {
  if (months <= 0) return ''
  const y = Math.floor(months / 12)
  const mo = months % 12
  const parts: string[] = []
  if (y > 0) parts.push(`${y} ${plural(y, 'год', 'года', 'лет')}`)
  if (mo > 0) parts.push(`${mo} ${plural(mo, 'месяц', 'месяца', 'месяцев')}`)
  return parts.join(' ')
}
