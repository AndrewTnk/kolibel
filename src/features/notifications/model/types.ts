export type NotificationKind =
  | 'application'
  | 'message'
  | 'follow'
  | 'vacancy'
  | 'system'
  | 'like'
  | 'comment'
  | 'comment_like'
  | 'reply'

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  text: string
  createdAt: number
  read: boolean
  /** Куда вести по клику (напр. /u/:id, /chat, /my-vacancies) */
  link?: string
  /** Кто инициировал — для аватара/ссылки на профиль */
  actorId?: string
  /** Аватар актора (дотягивается из profiles/companies по actorId) */
  avatar?: string
  /** Тип актора (форма аватара: круг — человек, квадрат — компания) */
  actorKind?: 'person' | 'company'
}
