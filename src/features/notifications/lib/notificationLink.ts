import type { AppNotification, NotificationKind } from '../model/types'

/** Уведомления, относящиеся к посту — открываются модалкой поста (веб), не маршрутом. */
const POST_KINDS = new Set<NotificationKind>(['like', 'comment', 'comment_like', 'reply'])

export function isPostKind(kind: NotificationKind): boolean {
  return POST_KINDS.has(kind)
}

/**
 * Маршрут перехода по уведомлению (для НЕ-пост типов): подписка → `/u/:id`,
 * сообщение → `/chat`, отклик → `/my-vacancies`. Пост-типы возвращают `undefined`
 * — их открывает модалка поста (см. `isPostKind` + `feedActions.openPost`).
 */
export function notifTarget(n: Pick<AppNotification, 'kind' | 'entityId' | 'link'>): string | undefined {
  if (POST_KINDS.has(n.kind)) return undefined
  return n.link ?? undefined
}
