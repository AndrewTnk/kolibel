import { PLATFORM_UPDATE_CATEGORY } from '../lib/categories'
import s from './UpdateChip.module.css'

/**
 * Бейдж категории «Update» (статья-обновление платформы).
 * `unread` — яркий градиентный чип с пульсирующей точкой (пока статью не читали);
 * по умолчанию — спокойный outline-вариант (виден, но не кричит).
 */
export function UpdateChip({ unread = false }: { unread?: boolean }) {
  return (
    <span className={[s.chip, unread ? s.chipNew : ''].filter(Boolean).join(' ')}>
      {unread ? <span className={s.dot} aria-hidden /> : null}
      {PLATFORM_UPDATE_CATEGORY}
    </span>
  )
}
