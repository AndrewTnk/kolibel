import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Spinner } from '../../features/admin/ui/components'
import { useAsync } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtNum } from '../../features/admin/lib/format'

export function AnalyticsPage() {
  const { data, loading, error } = useAsync(() => adminApi.analytics(), [])

  if (loading) return <Spinner />
  if (error || !data)
    return (
      <>
        <AdminTopbar title="Аналитика платформы" crumbs="Главная / Аналитика" />
        <div className={s.content}>
          <div className={s.error}>{error ?? 'Не удалось загрузить'}</div>
        </div>
      </>
    )

  const cards: { label: string; value: number; week: number; icon: keyof typeof Ic; color: string; bg: string }[] = [
    { label: 'Откликов', value: data.applications, week: data.applications7d, icon: 'briefcase', color: 'var(--a-primary)', bg: 'var(--a-primary-soft)' },
    { label: 'Просмотрено откликов', value: data.applicationsSeen, week: 0, icon: 'eye', color: 'var(--a-blue)', bg: 'var(--a-blue-soft)' },
    { label: 'Начато диалогов', value: data.conversations, week: data.conversations7d, icon: 'message', color: 'var(--a-green)', bg: 'var(--a-green-soft)' },
    { label: 'Новых связей', value: data.connections, week: data.connections7d, icon: 'users', color: 'var(--a-purple)', bg: 'var(--a-purple-soft)' },
    { label: 'Просмотров профилей', value: data.profileViews, week: data.profileViews7d, icon: 'eye', color: 'var(--a-yellow)', bg: 'var(--a-yellow-soft)' },
    { label: 'Просмотров вакансий', value: data.vacancyViews, week: 0, icon: 'chart', color: 'var(--a-blue)', bg: 'var(--a-blue-soft)' },
  ]

  return (
    <>
      <AdminTopbar title="Аналитика платформы" crumbs="Главная / Аналитика" />
      <div className={s.content}>
        <div className={s.metricGrid}>
          {cards.map((c) => {
            const Icon = Ic[c.icon]
            return (
              <div key={c.label} className={s.metric}>
                <div className={s.metricTop}>
                  <div className={s.metricIcon} style={{ background: c.bg, color: c.color }}>
                    <Icon />
                  </div>
                  <div className={s.metricLabel}>{c.label}</div>
                </div>
                <div className={s.metricRow}>
                  <div className={s.metricValue}>{fmtNum(c.value)}</div>
                </div>
                {c.week > 0 && <div className={s.metricSub}>+{fmtNum(c.week)} за неделю</div>}
              </div>
            )
          })}
        </div>
        <div className={s.card}>
          <div className={s.metricSub}>
            Будущие показатели (после запуска MVP): подтверждённые наймы, среднее время до первого контакта,
            конверсия из отклика в диалог и из диалога в найм.
          </div>
        </div>
      </div>
    </>
  )
}
