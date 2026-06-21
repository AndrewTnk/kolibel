/** Вложение к сообщению. Файлы (фото/видео/документ) льются в Storage, в jsonb — публичный URL. */
export type ChatAttach = {
  title: string
  subtitle?: string
  kind?: 'photo' | 'video' | 'file' | 'loc' | 'contact' | 'vacancy' | 'voice'
  /** Публичный URL загруженного файла (фото/видео/документ). */
  url?: string
  /** MIME-тип файла. */
  mime?: string
  /** Вакансия (kind === 'vacancy'). */
  vacancyId?: string
  salary?: string
  city?: string
}

/** Реакция на сообщение (агрегат по эмодзи). */
export type ChatReaction = {
  em: string
  count: number
  /** Поставил ли её текущий пользователь */
  mine?: boolean
}

export type ChatMessage = {
  id: string
  text: string
  sender: 'me' | 'them'
  createdAt: number
  /** Время прочтения нашего сообщения собеседником (для двойной галочки) */
  readAt?: number | null
  /** Имя автора (для групповых — пока не используется) */
  author?: string
  /** На какое сообщение отвечаем (снимок) */
  replyTo?: { author?: string; text: string; sender: 'me' | 'them' } | null
  /** Вложение */
  attach?: ChatAttach | null
  /** Реакции */
  reactions?: ChatReaction[]
}

export type ChatConversation = {
  id: string
  title: string
  subtitle?: string
  messages: ChatMessage[]
  updatedAt: number
  /** Количество непрочитанных сообщений */
  unreadCount?: number
  /** Аватар собеседника (для строки списка и шапки треда) */
  avatar?: string
  /** id собеседника (для ссылки на профиль / аватара) */
  otherId?: string
  /** Тип собеседника (для формы аватара / фильтров) */
  type?: 'person' | 'company'
  /** Лого компании-работодателя собеседника (бейдж рядом с именем) */
  companyLogo?: string
  /** Текущая компания собеседника */
  company?: string
  /** Закреплён в списке */
  pinned?: boolean
  /** Уведомления отключены */
  muted?: boolean
  /** Онлайн / последний визит (presence пока не храним) */
  online?: boolean
  lastSeen?: string
  /** Групповой чат (групп пока нет — для совместимости типа) */
  group?: boolean
}
