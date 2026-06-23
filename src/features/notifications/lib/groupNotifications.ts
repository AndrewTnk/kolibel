import type { AppNotification, NotificationKind } from '../model/types'

/** Группа уведомлений (одинаковое действие по одному объекту). */
export type NotifGroup = {
  /** Ключ группировки (уникален в пределах списка). */
  key: string
  kind: NotificationKind
  /** Элементы группы, новые сверху (как пришли). */
  items: AppNotification[]
  /** Самое свежее уведомление группы (items[0]). */
  latest: AppNotification
  count: number
  /** Есть ли непрочитанные в группе. */
  unread: boolean
}

/** Типы, которые группируются «N сделали одно и то же по объекту». */
const GROUPABLE: ReadonlySet<NotificationKind> = new Set([
  'like',
  'comment',
  'comment_like',
  'reply',
  'follow',
  'application',
])

/**
 * Ключ группировки уведомления:
 *  • like/comment/comment_like/reply/application — по (kind + объект);
 *  • follow — все вместе;
 *  • message — по отправителю (1:1 беседа = собеседник);
 *  • прочее (system/vacancy) — не группируем (уникальный ключ по id).
 */
function groupKey(n: AppNotification): string {
  switch (n.kind) {
    case 'like':
    case 'comment':
    case 'comment_like':
    case 'reply':
    case 'application':
      return n.entityId ? `${n.kind}:${n.entityId}` : `id:${n.id}`
    case 'follow':
      return 'follow'
    case 'message':
      return n.actorId ? `message:${n.actorId}` : `id:${n.id}`
    default:
      return `id:${n.id}`
  }
}

/**
 * Группирует список уведомлений (ожидается отсортированный «новые сверху»).
 * Сохраняет порядок первого вхождения → группы тоже идут новыми сверху.
 * Внутри группы порядок входной (новые сверху).
 */
export function groupNotifications(items: AppNotification[]): NotifGroup[] {
  const map = new Map<string, NotifGroup>()
  for (const n of items) {
    const key = groupKey(n)
    const g = map.get(key)
    if (g) {
      g.items.push(n)
      g.count++
      if (!n.read) g.unread = true
    } else {
      map.set(key, {
        key,
        kind: n.kind,
        items: [n],
        latest: n,
        count: 1,
        unread: !n.read,
      })
    }
  }
  return [...map.values()]
}

/** Группа ли это (можно сворачивать/разворачивать), а не одиночное уведомление. */
export function isGrouped(g: NotifGroup): boolean {
  return g.count > 1 && GROUPABLE.has(g.kind)
}
