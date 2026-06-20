import type { EmploymentType, Vacancy, WorkFormat } from '../model/types'

export const workFormatLabels: Record<WorkFormat, string> = {
  remote: 'Удалёнка',
  hybrid: 'Гибрид',
  office: 'Офис',
}

export const employmentLabels: Record<EmploymentType, string> = {
  full: 'Полная',
  part: 'Частичная',
  contract: 'Контракт',
  internship: 'Стажировка',
}

/** Склонение «год / года / лет». */
export function pluralYears(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'год'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'года'
  return 'лет'
}

/** Требуемый опыт в годах: «2–6 лет», «3 года», «до 5 лет», «Без опыта». null — не задан. */
export function formatExperienceYears(from?: number, to?: number): string | null {
  const f = typeof from === 'number' ? from : undefined
  const t = typeof to === 'number' ? to : undefined
  if (f === undefined && t === undefined) return null
  if ((f ?? 0) === 0 && (t ?? 0) === 0) return 'Без опыта'
  if (f !== undefined && t !== undefined) {
    if (f === 0) return `до ${t} ${pluralYears(t)}`
    if (f === t) return `${f} ${pluralYears(f)}`
    return `${f}–${t} ${pluralYears(t)}`
  }
  if (f !== undefined) return `от ${f} ${pluralYears(f)}`
  return `до ${t} ${pluralYears(t!)}`
}

/**
 * Текстовая мета вакансии через точку: «Удалёнка · Полная · 2–6 лет».
 * Грейд (Junior/Senior) НЕ показываем — только формат, занятость и опыт в годах.
 */
export function vacancyMetaLine(
  v: Pick<Vacancy, 'workFormats' | 'employmentTypes' | 'experienceFrom' | 'experienceTo'>,
): string {
  return [
    v.workFormats.map((f) => workFormatLabels[f]).join('/'),
    v.employmentTypes.map((e) => employmentLabels[e]).join('/'),
    formatExperienceYears(v.experienceFrom, v.experienceTo),
  ]
    .filter((x): x is string => Boolean(x))
    .join(' · ')
}

export function formatSalary(from?: number, to?: number, currency = '₽') {
  if (!from && !to) return 'Зарплата по договорённости'
  const fmt = (n: number) => n.toLocaleString('ru-RU')
  if (from && to) return `${fmt(from)} – ${fmt(to)} ${currency}`
  if (from) return `от ${fmt(from)} ${currency}`
  return `до ${fmt(to!)} ${currency}`
}

export function formatPosted(ts: number) {
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дн. назад`
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}
