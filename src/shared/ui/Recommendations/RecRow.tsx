import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { CompanyBadge } from '../CompanyBadge/CompanyBadge'
import styles from './Recommendations.module.css'

type Props = {
  /** Куда ведёт строка (профиль /u/:id) */
  to: string
  name: string
  sub: string
  initial: string
  avatar?: string
  /** Квадратный логотип (для компаний) вместо круглого фото */
  square?: boolean
  /** Лого компании-работодателя рядом с именем (для людей) */
  logo?: string
  /** Подпись/тултип лого (название компании) */
  logoTitle?: string
  following: boolean
  onToggle: () => void
}

/** Компактная строка рекомендации (как в макете главной): аватар + имя/роль + «+ Связь». */
export function RecRow({ to, name, sub, initial, avatar, square = false, logo, logoTitle, following, onToggle }: Props) {
  function toggle(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <Link to={to} className={styles.recRow}>
      {avatar ? (
        <img className={[styles.recRowAva, square ? styles.recRowAvaSq : ''].join(' ')} src={avatar} alt="" />
      ) : (
        <div className={[styles.recRowAva, square ? styles.recRowAvaSq : ''].join(' ')} aria-hidden>
          {initial}
        </div>
      )}
      <div className={styles.recRowMeta}>
        <div className={styles.recRowNameRow}>
          <span className={styles.recRowName}>{name}</span>
          {logo ? <CompanyBadge logo={logo} title={logoTitle} size={14} /> : null}
        </div>
        <div className={styles.recRowRole}>{sub}</div>
      </div>
      <button
        type="button"
        className={[styles.recRowFollow, following ? styles.recRowFollowDone : ''].join(' ')}
        onClick={toggle}
      >
        {following ? '✓ Связь' : '+ Связь'}
      </button>
    </Link>
  )
}
