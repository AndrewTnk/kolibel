import { useIsOnline } from '../lib/useIsOnline'
import styles from './OnlineDot.module.css'

/**
 * Индикатор присутствия в углу аватара: зелёный — онлайн, серый — офлайн.
 * Позиционируется абсолютно — родитель-обёртка аватара должен быть `position: relative`.
 * Показываем только для людей (у компаний присутствие не отображаем).
 */
export function OnlineDot({
  id,
  size = 11,
  className = '',
}: {
  /** id аккаунта (профиля). Без него индикатор не рендерится. */
  id?: string
  /** Диаметр точки в px. */
  size?: number
  className?: string
}) {
  const online = useIsOnline(id)
  if (!id) return null
  return (
    <span
      className={[styles.dot, online ? styles.on : styles.off, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      title={online ? 'В сети' : 'Не в сети'}
      aria-hidden
    />
  )
}
