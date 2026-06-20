import styles from './CompanyBadge.module.css'

type Props = {
  /** URL логотипа компании. Если не передан — бейдж не отображается. */
  logo?: string
  /** Размер значка в px */
  size?: number
  /** Подпись/тултип (обычно название компании) */
  title?: string
  className?: string
}

/**
 * Бейдж-логотип компании. Опциональный: рендерится только если задан `logo`.
 * Используется рядом с названием компании и с именем её сотрудников.
 */
export function CompanyBadge({ logo, size = 16, title, className = '' }: Props) {
  if (!logo) return null
  return (
    <img
      src={logo}
      alt={title ?? ''}
      title={title}
      width={size}
      height={size}
      className={[styles.badge, className].join(' ')}
    />
  )
}
