// Форматтеры для админ-панели (ru-RU).

const nf = new Intl.NumberFormat('ru-RU')

/** 128245 → "128 245" */
export function fmtNum(n: number | null | undefined): string {
  return nf.format(Math.round(n ?? 0))
}

/** Дельта в процентах с знаком: 12 → "+12%". */
export function fmtDelta(pct: number): string {
  if (pct > 0) return `+${pct}%`
  if (pct < 0) return `−${Math.abs(pct)}%`
  return '0%'
}

/** Прирост в процентах между двумя числами (для метрик без серверной дельты). */
export function deltaPct(cur: number, base: number): number {
  if (!base) return cur > 0 ? 100 : 0
  return Math.round(((cur - base) / base) * 100)
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** "25.06.2024" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** "25.06.2024 14:30" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "2 мин назад" / "вчера" / дата. */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч назад`
  const days = Math.floor(h / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн назад`
  return fmtDate(iso)
}

/** Инициалы для заглушки аватара. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
