import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadAnalytics } from '../../analytics/model/analyticsThunks'
import { mapBreakdown, type PulseMetric, type BreakdownItem } from '../../profile/lib/useProfilePulse'

export type CompanyPulse = {
  /** Просмотры страницы компании. */
  pageViews: PulseMetric
  /** Просмотры вакансий. */
  vacancyViews: PulseMetric
  /** Полученные отклики за неделю. */
  applications: PulseMetric
  /** Новые подписчики за 7 дней. */
  newFollowers: { count: number }
  /** Просмотры по дням (7 точек) — для sparkline и большого графика. */
  series: number[]
  /** Откуда приходят на страницу (для модалки аналитики). */
  breakdown: BreakdownItem[]
}

const ZERO: PulseMetric = { count: 0, deltaPct: 0 }
const EMPTY_SERIES = [0, 0, 0, 0, 0, 0, 0]

/** Лейблы разбивки «откуда приходят» по source (ключи из RPC). */
const SOURCE_LABELS: Record<string, string> = {
  feed: 'Из ленты Kolibel',
  search: 'Из поиска',
  vacancy: 'Со страниц вакансий',
  network: 'Из раздела «Сеть»',
  direct: 'Прямые заходы',
}

/** Аналитика страницы компании (реальная, из RPC `get_profile_analytics`). */
export function useCompanyPulse(): CompanyPulse {
  const dispatch = useAppDispatch()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const data = useAppSelector((s) => s.analytics.data)

  // Грузим/перезагружаем при смене аккаунта (myId). Дедуп — в condition самого thunk-а.
  useEffect(() => {
    if (myId) void dispatch(loadAnalytics(myId))
  }, [myId, dispatch])

  return {
    pageViews: data?.views ?? ZERO,
    vacancyViews: data?.vacancyViews ?? ZERO,
    applications: data?.applications ?? ZERO,
    newFollowers: { count: data?.newFollowers ?? 0 },
    series: data?.series?.length ? data.series : EMPTY_SERIES,
    breakdown: mapBreakdown(data?.breakdown, SOURCE_LABELS),
  }
}
