export type SectionKey = 'account' | 'security' | 'notifications' | 'blacklist'

export const menuItems: { key: SectionKey; label: string }[] = [
  { key: 'account', label: 'Аккаунт и оформление' },
  { key: 'security', label: 'Вход и безопасность' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'blacklist', label: 'Чёрный список' },
]

/* ── Уведомления ──────────────────────────────── */
import type { NotificationKind } from '../../notifications/model/types'

/**
 * Группы уведомлений в настройках. Каждая группа управляет одним или несколькими
 * реальными типами (`NotificationKind`). Тип `system` не настраивается (важные
 * системные сообщения приходят всегда).
 */
export type NotificationOption = {
  id: string
  label: string
  desc: string
  kinds: NotificationKind[]
}

export const notificationOptions: NotificationOption[] = [
  { id: 'messages', label: 'Сообщения', desc: 'Новые сообщения в чатах', kinds: ['message'] },
  { id: 'applications', label: 'Отклики', desc: 'Отклики на ваши вакансии и ответы по ним', kinds: ['application'] },
  { id: 'follow', label: 'Подписки', desc: 'Новые подписчики', kinds: ['follow'] },
  { id: 'likes', label: 'Лайки', desc: 'Лайки ваших постов и комментариев', kinds: ['like', 'comment_like'] },
  { id: 'comments', label: 'Комментарии и ответы', desc: 'Комментарии к вашим постам и ответы', kinds: ['comment', 'reply'] },
  { id: 'vacancies', label: 'Рекомендации вакансий', desc: 'Подходящие вам вакансии', kinds: ['vacancy'] },
]
