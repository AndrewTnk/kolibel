const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** Дата статьи: «24 июня 2026». */
export function formatArticleDate(ms?: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Короткая дата для блока/карточек: «24 июня». */
export function formatArticleDateShort(ms?: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** «Просмотрело: N» (только если есть просмотры). */
export function formatViews(n: number): string {
  return `Просмотрело: ${n}`
}
