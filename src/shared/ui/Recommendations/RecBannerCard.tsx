import { Link } from 'react-router-dom'
import styles from './RecBannerCard.module.css'

type Props = {
  /** Куда ведёт карточка (профиль /u/:id) */
  to: string
  name: string
  sub: string
  initial: string
  avatar?: string
  banner?: string
  /** Квадратный логотип (для компаний) вместо круглого фото */
  square?: boolean
  following: boolean
  onToggle: () => void
}

export function RecBannerCard({ to, name, sub, initial, avatar, banner, square = false, following, onToggle }: Props) {
  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <Link to={to} className={styles.card}>
      <div
        className={styles.banner}
        style={banner ? { backgroundImage: `url(${banner})` } : undefined}
      >
        <button
          type="button"
          className={[styles.subBtn, following ? styles.subBtnDone : ''].join(' ')}
          onClick={toggle}
        >
          {following ? 'Вы подписаны' : 'Подписаться'}
        </button>
      </div>
      <div className={styles.body}>
        {avatar ? (
          <img className={[styles.logo, square ? styles.logoSquare : ''].join(' ')} src={avatar} alt="" />
        ) : (
          <div className={[styles.logo, square ? styles.logoSquare : ''].join(' ')} aria-hidden>
            {initial}
          </div>
        )}
        <div className={styles.meta}>
          <div className={styles.name}>{name}</div>
          <div className={styles.sub}>{sub}</div>
        </div>
      </div>
    </Link>
  )
}
