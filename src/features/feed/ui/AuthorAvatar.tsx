import { Link } from 'react-router-dom'
import type { AuthorKind } from '../model/types'
import { CompanyBadge } from '../../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './Feed.module.css'

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/**
 * Аватар автора (поста/комментария): фото из профиля или инициал-заглушка.
 * Форма: круг — пользователь, квадрат — компания. Кликабелен → профиль `/u/:id`.
 */
export function AuthorAvatar({
  id,
  name,
  avatar,
  kind,
  size = 40,
  className = '',
}: {
  id?: string
  name: string
  avatar?: string
  kind?: AuthorKind
  size?: number
  className?: string
}) {
  const shapeCls = kind === 'company' ? styles.avatarSquare : styles.avatarRound
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  const inner = avatar ? (
    <img className={[styles.avatarImg, shapeCls].join(' ')} style={style} src={avatar} alt="" />
  ) : (
    <span className={[styles.avatarFallback, shapeCls].join(' ')} style={style} aria-hidden>
      {initialOf(name)}
    </span>
  )
  if (id) {
    return (
      <Link to={`/u/${id}?from=feed`} className={[styles.avatarLink, className].filter(Boolean).join(' ')} aria-label={name}>
        {inner}
      </Link>
    )
  }
  return <span className={className}>{inner}</span>
}

/** Имя автора как ссылка на профиль (или просто текст, если id нет). + лого работодателя. */
export function AuthorName({
  id,
  name,
  logo,
  logoTitle,
  className = '',
}: {
  id?: string
  name: string
  /** Лого компании-работодателя (бейдж рядом с именем). */
  logo?: string
  logoTitle?: string
  className?: string
}) {
  const badge = logo ? <CompanyBadge logo={logo} title={logoTitle} size={14} /> : null
  if (id) {
    return (
      <>
        <Link to={`/u/${id}?from=feed`} className={[styles.authorLink, className].filter(Boolean).join(' ')}>
          {name}
        </Link>
        {badge}
      </>
    )
  }
  return (
    <>
      <span className={className}>{name}</span>
      {badge}
    </>
  )
}
