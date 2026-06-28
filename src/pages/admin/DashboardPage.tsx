import { useNavigate } from 'react-router-dom'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, Spinner } from '../../features/admin/ui/components'
import { LineChart, BarChart } from '../../features/admin/ui/charts'
import { useAsync } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtNum, fmtDelta, deltaPct, fmtRelative } from '../../features/admin/lib/format'

type MetricDef = {
  label: string
  value: number
  icon: keyof typeof Ic
  color: string
  bg: string
  deltaPct?: number
  sub?: string
}

function Metric({ m }: { m: MetricDef }) {
  const Icon = Ic[m.icon]
  return (
    <div className={s.metric}>
      <div className={s.metricTop}>
        <div className={s.metricIcon} style={{ background: m.bg, color: m.color }}>
          <Icon />
        </div>
        <div className={s.metricLabel}>{m.label}</div>
      </div>
      <div className={s.metricRow}>
        <div className={s.metricValue}>{fmtNum(m.value)}</div>
        {m.deltaPct !== undefined && (
          <div className={`${s.metricDelta} ${m.deltaPct >= 0 ? s.deltaUp : s.deltaDown}`}>
            {m.deltaPct >= 0 ? '↑' : '↓'} {fmtDelta(m.deltaPct).replace('+', '').replace('−', '')}
          </div>
        )}
      </div>
      {m.sub && <div className={s.metricSub}>{m.sub}</div>}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, loading, error } = useAsync(() => adminApi.overview(), [])

  if (loading) return <Spinner />
  if (error || !data)
    return (
      <>
        <AdminTopbar title="Главная" crumbs="Обзор платформы" />
        <div className={s.content}>
          <div className={s.error}>{error ?? 'Не удалось загрузить данные'}</div>
        </div>
      </>
    )

  const { metrics: mt, realtime: rt } = data

  const metrics: MetricDef[] = [
    {
      label: 'Пользователи',
      value: mt.users,
      icon: 'users',
      color: 'var(--a-primary)',
      bg: 'var(--a-primary-soft)',
      deltaPct: deltaPct(mt.newUsers7d, mt.users - mt.newUsers7d),
      sub: `+${fmtNum(mt.newUsers7d)} за неделю`,
    },
    {
      label: 'Компании',
      value: mt.companies,
      icon: 'company',
      color: 'var(--a-blue)',
      bg: 'var(--a-blue-soft)',
      deltaPct: deltaPct(mt.newCompanies7d, mt.companies - mt.newCompanies7d),
      sub: `+${fmtNum(mt.newCompanies7d)} за неделю`,
    },
    {
      label: 'Вакансии',
      value: mt.vacancies,
      icon: 'briefcase',
      color: 'var(--a-green)',
      bg: 'var(--a-green-soft)',
      sub: `+${fmtNum(rt.newVacanciesToday)} сегодня`,
    },
    {
      label: 'Публикации',
      value: mt.posts,
      icon: 'post',
      color: 'var(--a-purple)',
      bg: 'var(--a-purple-soft)',
      sub: `+${fmtNum(rt.postsToday)} сегодня`,
    },
    {
      label: 'Сообщения',
      value: mt.messages,
      icon: 'message',
      color: 'var(--a-yellow)',
      bg: 'var(--a-yellow-soft)',
      sub: `${fmtNum(mt.activeUsers24h)} активны за 24 ч`,
    },
  ]

  const rtRows: { label: string; value: number; icon: keyof typeof Ic }[] = [
    { label: 'Пользователей онлайн', value: rt.online, icon: 'users' },
    { label: 'Новых пользователей сегодня', value: rt.newUsersToday, icon: 'users' },
    { label: 'Новых компаний сегодня', value: rt.newCompaniesToday, icon: 'company' },
    { label: 'Новых вакансий сегодня', value: rt.newVacanciesToday, icon: 'briefcase' },
    { label: 'Публикаций сегодня', value: rt.postsToday, icon: 'post' },
  ]

  const quick: { label: string; icon: keyof typeof Ic; to: string }[] = [
    { label: 'Управление пользователями', icon: 'users', to: '/admin/users' },
    { label: 'Управление компаниями', icon: 'company', to: '/admin/companies' },
    { label: 'Модерация публикаций', icon: 'post', to: '/admin/content' },
    { label: 'Разбор жалоб', icon: 'flag', to: '/admin/reports' },
  ]

  const system = ['Сервер', 'База данных', 'Хранилище', 'Очереди', 'Почтовый сервис']

  return (
    <>
      <AdminTopbar title="Главная" crumbs="Обзор платформы" />
      <div className={s.content}>
        {/* Метрики */}
        <div className={s.metricGrid}>
          {metrics.map((m) => (
            <Metric key={m.label} m={m} />
          ))}
        </div>

        {/* Графики + realtime */}
        <div className={s.cardCols}>
          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Рост пользователей</div>
            </div>
            <LineChart data={data.userGrowth.map((p) => p.total)} />
          </div>

          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Регистрация и активность</div>
              <div className={s.legend}>
                <span>
                  <span className={s.legendDot} style={{ background: 'var(--a-primary)' }} />
                  Новые
                </span>
                <span>
                  <span className={s.legendDot} style={{ background: 'var(--a-blue)' }} />
                  Активные
                </span>
              </div>
            </div>
            <BarChart data={data.registrations} />
          </div>

          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Активность в реальном времени</div>
            </div>
            {rtRows.map((r) => {
              const Icon = Ic[r.icon]
              return (
                <div key={r.label} className={s.listRow}>
                  <div className={s.entity}>
                    <Icon style={{ width: 18, height: 18, color: 'var(--a-muted)' }} />
                    <span style={{ fontSize: 14 }}>{r.label}</span>
                  </div>
                  <strong>{fmtNum(r.value)}</strong>
                </div>
              )
            })}
          </div>
        </div>

        {/* Последние регистрации / компании / система / быстрые действия */}
        <div className={s.cardCols2}>
          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Последние регистрации</div>
            </div>
            {data.latestUsers.length === 0 && <div className={s.empty}>Пока никого</div>}
            {data.latestUsers.map((u) => (
              <div key={u.id} className={s.listRow}>
                <div className={s.entity}>
                  <Avatar src={u.avatar} name={u.name} />
                  <div style={{ minWidth: 0 }}>
                    <div className={s.entityName}>{u.name}</div>
                    <div className={s.entitySub}>{u.email}</div>
                  </div>
                </div>
                <div className={s.listTime}>{fmtRelative(u.createdAt)}</div>
              </div>
            ))}
          </div>

          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Последние компании</div>
            </div>
            {data.latestCompanies.length === 0 && <div className={s.empty}>Пока пусто</div>}
            {data.latestCompanies.map((c) => (
              <div key={c.id} className={s.listRow}>
                <div className={s.entity}>
                  <Avatar src={c.logo} name={c.name} square />
                  <div style={{ minWidth: 0 }}>
                    <div className={s.entityName}>{c.name}</div>
                    <div className={s.entitySub}>{c.website ?? '—'}</div>
                  </div>
                </div>
                <div className={s.listTime}>{fmtRelative(c.createdAt)}</div>
              </div>
            ))}
          </div>

          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Система</div>
            </div>
            {system.map((name) => (
              <div key={name} className={s.listRow}>
                <div className={s.entity}>
                  <Ic.checkCircle style={{ width: 18, height: 18, color: 'var(--a-green)' }} />
                  <span style={{ fontSize: 14 }}>{name}</span>
                </div>
                <span className={s.badge + ' ' + s.badgeGreen}>Работает</span>
              </div>
            ))}
            <div style={{ marginTop: 12, color: 'var(--a-green)', fontWeight: 700, fontSize: 13 }}>
              Все системы работают нормально
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardTitle}>Быстрые действия</div>
            </div>
            {quick.map((q) => {
              const Icon = Ic[q.icon]
              return (
                <button
                  key={q.to}
                  className={s.btn}
                  style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }}
                  onClick={() => navigate(q.to)}
                >
                  <Icon />
                  {q.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
