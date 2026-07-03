export type DiscussionCategory = 'question' | 'problem' | 'appeal' | 'other'
export type DiscussionStatus = 'open' | 'closed'

export type Discussion = {
  id: string
  category: DiscussionCategory
  subject: string
  status: DiscussionStatus
  /** От кого последнее сообщение — для бейджа «Есть ответ». */
  lastSender: 'user' | 'staff'
  createdAt: number
  lastMessageAt: number
}

export type DiscussionMessage = {
  id: string
  /** user — моё (справа), staff — ответ поддержки (слева, «Поддержка Kolibel»). */
  kind: 'user' | 'staff'
  body: string
  createdAt: number
}

export const DISCUSSION_CATEGORIES: { key: DiscussionCategory; label: string }[] = [
  { key: 'question', label: 'Вопрос' },
  { key: 'problem', label: 'Проблема' },
  { key: 'appeal', label: 'Оспорить решение' },
  { key: 'other', label: 'Другое' },
]

export function discussionCategoryLabel(c: DiscussionCategory): string {
  return DISCUSSION_CATEGORIES.find((x) => x.key === c)?.label ?? 'Другое'
}
