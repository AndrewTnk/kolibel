export type NotificationKind = 'application' | 'message' | 'follow' | 'vacancy' | 'system'

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  text: string
  createdAt: number
  read: boolean
  /** Куда вести по клику (напр. /u/:id, /chat, /my-vacancies) */
  link?: string
}
