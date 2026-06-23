/**
 * Текст активности в стиле VK: «В сети» / «был(а) N минут назад» / «был(а) сегодня в 14:30».
 * `female` влияет на окончание (был/была). Возвращает '' если данных нет.
 */
export function formatLastSeen(
  lastSeenISO: string | undefined,
  online: boolean,
  opts: { female?: boolean; subject?: 'person' | 'company' } = {},
): string {
  if (online) return 'В сети'
  if (!lastSeenISO) return ''

  const seen = new Date(lastSeenISO)
  const now = new Date()
  const diffMs = now.getTime() - seen.getTime()
  if (Number.isNaN(diffMs)) return ''

  const wasWord =
    opts.subject === 'company' ? 'была в сети' : opts.female ? 'была' : 'был'

  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return `${cap(wasWord)} только что`
  if (min < 60) return `${cap(wasWord)} ${min} ${plural(min, 'минуту', 'минуты', 'минут')} назад`

  const hh = String(seen.getHours()).padStart(2, '0')
  const mm = String(seen.getMinutes()).padStart(2, '0')
  const time = `${hh}:${mm}`

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const seenDay = new Date(seen.getFullYear(), seen.getMonth(), seen.getDate())
  const dayDiff = Math.round((startToday.getTime() - seenDay.getTime()) / 86_400_000)

  if (dayDiff <= 0) return `${cap(wasWord)} сегодня в ${time}`
  if (dayDiff === 1) return `${cap(wasWord)} вчера в ${time}`

  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  const dateStr = `${seen.getDate()} ${months[seen.getMonth()]}`
  return `${cap(wasWord)} ${dateStr} в ${time}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
