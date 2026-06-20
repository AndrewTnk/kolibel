import { NavLink } from 'react-router-dom'
import { useAppSelector } from '../../../app/store/hooks'
import styles from './BottomNav.module.css'

type IconProps = { active?: boolean }

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}
function BriefcaseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
function NetworkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2.5 19c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5M15 14.6c2.4.2 4.5 1.6 4.5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

/** Нижний таб-бар (app-стиль) — основная навигация на мобильных (≤980px). */
export function BottomNav() {
  const isCompany = useAppSelector((s) => s.account.type === 'company')

  const items: { to: string; label: string; Icon: (p: IconProps) => React.ReactElement }[] = [
    { to: '/', label: 'Главная', Icon: HomeIcon },
    isCompany
      ? { to: '/my-vacancies', label: 'Вакансии', Icon: BriefcaseIcon }
      : { to: '/vacancies', label: 'Вакансии', Icon: BriefcaseIcon },
    { to: '/profile', label: 'Профиль', Icon: UserIcon },
    { to: '/network', label: 'Сеть', Icon: NetworkIcon },
    { to: '/chat', label: 'Чат', Icon: ChatIcon },
  ]

  return (
    <nav className={styles.bar} aria-label="Основная навигация">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => [styles.item, isActive ? styles.itemActive : ''].join(' ')}
        >
          <span className={styles.icon}>
            <Icon />
          </span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
