import type { AppNotification } from '../model/types'

/**
 * ⏸ ВРЕМЕННО: переход по уведомлениям, ведущим на пост (лайк/коммент/ответ/
 * лайк-коммента), отключён — якорь на главной работает плохо. Группировка и
 * пометка прочитанным остаются, просто клик никуда не ведёт. Доделаем механику
 * открытия поста позже и вернём навигацию (через `entityId` → `/?post=:id`).
 */
const NAV_DISABLED = new Set(['like', 'comment', 'comment_like', 'reply'])

/**
 * Куда вести по уведомлению. Для отключённых пост-типов — `undefined` (без перехода).
 * Подписка → `/u/:id`, сообщение → `/chat`, отклик → `/my-vacancies` (из `link`).
 */
export function notifTarget(n: Pick<AppNotification, 'kind' | 'entityId' | 'link'>): string | undefined {
  if (NAV_DISABLED.has(n.kind)) return undefined
  const link = n.link
  if (!link) return undefined
  const m = link.match(/^\/post\/([^/?#]+)/)
  if (m) return `/?post=${m[1]}`
  return link
}
