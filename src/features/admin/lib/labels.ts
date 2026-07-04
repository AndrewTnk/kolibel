// Лейблы и цвета статусов админ-панели.
import type {
  AccountStatus,
  VacancyModeration,
  ReportStatus,
  ReportPriority,
  ReportTargetType,
  DiscussionStatus,
  DiscussionCategory,
} from '../model/types'

type Tone = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export const accountStatus: Record<AccountStatus, { label: string; tone: Tone }> = {
  active: { label: 'Активен', tone: 'green' },
  blocked: { label: 'Заблокирован', tone: 'red' },
  deleted: { label: 'Удалён', tone: 'gray' },
}

export const vacancyModeration: Record<VacancyModeration, { label: string; tone: Tone }> = {
  visible: { label: 'Активна', tone: 'green' },
  hidden: { label: 'Скрыта', tone: 'yellow' },
  removed: { label: 'Удалена', tone: 'red' },
}

export const reportStatus: Record<ReportStatus, { label: string; tone: Tone }> = {
  new: { label: 'Новая', tone: 'blue' },
  reviewing: { label: 'На рассмотрении', tone: 'yellow' },
  resolved: { label: 'Обработано', tone: 'green' },
  rejected: { label: 'Отклонено', tone: 'gray' },
}

export const reportPriority: Record<ReportPriority, { label: string; tone: Tone }> = {
  high: { label: 'Высокий', tone: 'red' },
  medium: { label: 'Средний', tone: 'yellow' },
  low: { label: 'Низкий', tone: 'gray' },
}

export const targetType: Record<ReportTargetType, string> = {
  user: 'Пользователь',
  company: 'Компания',
  post: 'Публикация',
  comment: 'Комментарий',
  vacancy: 'Вакансия',
  message: 'Сообщение',
}

export const discussionStatus: Record<DiscussionStatus, { label: string; tone: Tone }> = {
  open: { label: 'Открыто', tone: 'green' },
  closed: { label: 'Закрыто', tone: 'gray' },
}

export const discussionCategory: Record<DiscussionCategory, string> = {
  question: 'Вопрос',
  problem: 'Проблема',
  appeal: 'Оспаривание решения',
  other: 'Другое',
}
