import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import s from './admin.module.css'
import { Ic } from './icons'
import { Avatar } from './components'
import { useAppSelector } from '../../../app/store/hooks'

type NavDef = { to: string; label: string; icon: keyof typeof Ic; end?: boolean; adminOnly?: boolean }

// adminOnly — раздел виден только роли admin. Остальное доступно и модератору.
const NAV: NavDef[] = [
  { to: '/admin', label: 'Главная', icon: 'home', end: true },
  { to: '/admin/users', label: 'Пользователи', icon: 'users' },
  { to: '/admin/companies', label: 'Компании', icon: 'company' },
  { to: '/admin/vacancies', label: 'Вакансии', icon: 'briefcase' },
  { to: '/admin/content', label: 'Публикации', icon: 'post' },
  { to: '/admin/reports', label: 'Жалобы', icon: 'flag' },
  { to: '/admin/analytics', label: 'Аналитика', icon: 'chart', adminOnly: true },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const role = useAppSelector((st) => st.admin.role)
  const name = useAppSelector((st) => st.profile.resume.fullName)
  const avatar = useAppSelector((st) => st.profile.resume.avatar)
  const email = useAppSelector((st) => st.auth.user?.email)

  // Не разлогиниваем аккаунт — просто выходим из админки на главную Kolibel.
  const onLogout = () => {
    navigate('/', { replace: true })
  }

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <img className={s.brandMark} src="/logo/kolibel-mark.png" alt="" />
          <div>
            <div className={s.brandName}>Kolibel</div>
            <div className={s.brandSub}>Админ-панель</div>
          </div>
        </div>

        <nav className={s.nav}>
          {NAV.filter((n) => !n.adminOnly || role === 'admin').map((n) => {
            const Icon = Ic[n.icon]
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `${s.navItem} ${isActive ? s.navItemActive : ''}`}
              >
                <Icon className={s.navIcon} />
                <span>{n.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className={s.sideUser}>
          <div className={s.sideUserRow}>
            <Avatar src={avatar} name={name || email || 'A'} size={38} />
            <div style={{ minWidth: 0 }}>
              <div className={s.sideUserName}>{name || email || 'Администратор'}</div>
              <div className={s.sideUserRole}>{role === 'admin' ? 'Super Admin' : 'Модератор'}</div>
            </div>
          </div>
          <button className={s.logout} onClick={onLogout}>
            <Ic.logout className={s.navIcon} />
            <span>Выйти из админки</span>
          </button>
        </div>
      </aside>

      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}

/** Шапка страницы внутри админки (заголовок + крошки + действия справа). */
export function AdminTopbar({
  title,
  crumbs,
  actions,
}: {
  title: string
  crumbs?: string
  actions?: React.ReactNode
}) {
  return (
    <div className={s.topbar}>
      <div>
        <div className={s.pageTitle}>{title}</div>
        {crumbs && <div className={s.crumbs}>{crumbs}</div>}
      </div>
      <div className={s.topActions}>
        {actions}
        <div className={s.datePill}>
          <Ic.calendar style={{ width: 16, height: 16 }} />
          Последние 30 дней
        </div>
      </div>
    </div>
  )
}
