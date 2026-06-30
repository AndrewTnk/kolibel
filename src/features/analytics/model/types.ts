/** Метрика с приростом в процентах (зелёный «+N%»). */
export type AnalyticsMetric = { count: number; deltaPct: number }

/** Строка разбивки (сырой ключ + значение; лейбл/доля считаются на фронте). */
export type AnalyticsBreakdownRow = { key: string; value: number }

/** Ответ RPC `get_profile_analytics` — общий для пользователя и компании. */
export type Analytics = {
  isCompany: boolean
  /** Просмотры профиля / страницы компании за 7 дней. */
  views: AnalyticsMetric
  /** Перцентиль по просмотрам среди похожих профилей (профиль сильнее, чем у N%). */
  viewsPercentile?: number
  /** Отклики за 7 дней: у пользователя — отправленные, у компании — полученные. */
  applications: AnalyticsMetric
  /** Просмотры вакансий за 7 дней (только компания). */
  vacancyViews?: AnalyticsMetric
  /** Новые связи за 7 дней (только пользователь). */
  newConnections?: number
  /** Новые подписчики за 7 дней (только компания). */
  newFollowers?: number
  /** Просмотры по дням — 7 точек, от старого к новому. */
  series: number[]
  /** Разбивка: «кто смотрит» (пользователь) / «откуда приходят» (компания). */
  breakdown: AnalyticsBreakdownRow[]
}
