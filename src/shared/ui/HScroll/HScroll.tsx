import styles from './HScroll.module.css'

/**
 * Горизонтальный scroll-snap контейнер (нативный свайп без зависимостей).
 * Прямые дети становятся «слайдами» фиксированной ширины с привязкой к началу.
 * Используется для горизонтальных каруселей рекомендаций на мобильных.
 */
export function HScroll({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={[styles.row, className].join(' ')}>{children}</div>
}
