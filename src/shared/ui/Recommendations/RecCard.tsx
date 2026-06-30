import { type CSSProperties, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import styles from './RecCard.module.css'

type Props = {
  /** Куда ведёт карточка (профиль /u/:id) */
  to: string
  name: string
  /** Должность (человек) / направление (компания) */
  sub: string
  /** Инициалы для заглушки фото */
  initial: string
  avatar?: string
  /** URL баннера/обложки (если нет — градиент по bg) */
  banner?: string
  /** Пара цветов градиента-заглушки баннера */
  bg?: [string, string]
  /** Квадратный логотип (компания) вместо круглого фото */
  square?: boolean
  following: boolean
  onToggle: () => void
}

/**
 * Компактная карточка-рекомендация для ленты (мобилка): баннер + фото + имя +
 * должность + кнопка «Связь». Без города и доп. бейджей — урезанный вид карточки сети.
 */
export function RecCard({ to, name, sub, initial, avatar, banner, bg, square = false, following, onToggle }: Props) {
  function toggle(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <Link to={to} className={styles.card}>
      <div
        className={styles.banner}
        style={{ ['--c1']: bg?.[0] ?? '#fdece2', ['--c2']: bg?.[1] ?? '#f3b89e' } as CSSProperties}
      >
        {banner ? <img className={styles.bannerImg} src={banner} alt="" aria-hidden /> : null}
      </div>

      <div className={styles.body}>
        <div className={[styles.ava, square ? styles.avaSq : ''].join(' ')}>
          {avatar ? <img className={styles.avaImg} src={avatar} alt={name} /> : initial}
        </div>
        <div className={styles.name}>{name}</div>
        <div className={styles.role}>{sub}</div>
        <button
          type="button"
          className={[styles.follow, following ? styles.followDone : styles.followSolid].join(' ')}
          onClick={toggle}
        >
          {following ? '✓ Связь' : '+ Связь'}
        </button>
      </div>
    </Link>
  )
}
