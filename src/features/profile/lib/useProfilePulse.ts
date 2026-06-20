import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadAnalytics } from '../../analytics/model/analyticsThunks'
import type { AnalyticsBreakdownRow } from '../../analytics/model/types'

export type PulseMetric = { count: number; deltaPct: number }

export type BreakdownItem = { label: string; value: number; ratio: number }

export type ProfilePulse = {
  views: PulseMetric
  applications: PulseMetric
  /** Новые связи за 7 дней. */
  newConnections: { count: number }
  /** Точки для sparkline / большого графика — просмотры по дням (7 точек). */
  series: number[]
  /** Разбивка «кто смотрит профиль» (для модалки). */
  breakdown: BreakdownItem[]
}

const ZERO: PulseMetric = { count: 0, deltaPct: 0 }
const EMPTY_SERIES = [0, 0, 0, 0, 0, 0, 0]

/** Лейблы разбивки «кто смотрит профиль» по типу зрителя (ключи из RPC). */
const VIEWER_LABELS: Record<string, string> = {
  company: 'Компании-работодатели',
  hr: 'HR и рекрутёры',
  specialist: 'Другие специалисты',
  anon: 'Анонимные просмотры',
}

/** Сырые строки разбивки → лейбл + доля (для баров). */
export function mapBreakdown(
  rows: AnalyticsBreakdownRow[] | undefined,
  labels: Record<string, string>,
): BreakdownItem[] {
  if (!rows?.length) return []
  const max = Math.max(...rows.map((r) => r.value), 1)
  return rows.map((r) => ({
    label: labels[r.key] ?? r.key,
    value: r.value,
    ratio: r.value / max,
  }))
}

/** Аналитика профиля (реальная, из RPC `get_profile_analytics`). */
export function useProfilePulse(): ProfilePulse {
  const dispatch = useAppDispatch()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const data = useAppSelector((s) => s.analytics.data)

  // Грузим/перезагружаем при смене аккаунта (myId). Дедуп — в condition самого thunk-а.
  useEffect(() => {
    if (myId) void dispatch(loadAnalytics(myId))
  }, [myId, dispatch])

  return {
    views: data?.views ?? ZERO,
    applications: data?.applications ?? ZERO,
    newConnections: { count: data?.newConnections ?? 0 },
    series: data?.series?.length ? data.series : EMPTY_SERIES,
    breakdown: mapBreakdown(data?.breakdown, VIEWER_LABELS),
  }
}

/** Форматирует прирост: «+27%» / «−12%» / «0%» (без бага «+-100%»). */
export function formatDelta(deltaPct: number): string {
  if (deltaPct > 0) return `+${deltaPct}%`
  if (deltaPct < 0) return `−${Math.abs(deltaPct)}%`
  return '0%'
}

/** Строит SVG-path (линия + площадь под ней) для sparkline. */
export function buildSparkline(series: number[], w: number, h: number, pad = 6) {
  const max = Math.max(...series, 1)
  const stepX = w / (series.length - 1)
  const points = series.map((v, i): [number, number] => [
    i * stepX,
    h - (v / max) * (h - pad * 2) - pad,
  ])
  const line = points
    .map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1))
    .join(' ')
  const area = `${line} L ${w},${h} L 0,${h} Z`
  return { line, area, points }
}
