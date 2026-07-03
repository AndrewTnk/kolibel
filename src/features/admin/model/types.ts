// Типы админ-панели. Соответствуют jsonb-выходам RPC из 0037_admin_rpcs.sql.

export type AdminRole = 'admin' | 'moderator'
export type AccountStatus = 'active' | 'blocked' | 'deleted'
export type VacancyModeration = 'visible' | 'hidden' | 'removed'

export type EntityKind = 'user' | 'company' | 'vacancy'

/** Ссылка на сущность (цель жалобы / актор) с именем и аватаром. */
export type EntityRef = {
  id: string
  name: string
  avatar: string | null
  kind: EntityKind
  sub?: string
}

export type ListResult<T> = { rows: T[]; total: number }

// ── Дашборд ────────────────────────────────────────────────
export type OverviewMetrics = {
  users: number
  companies: number
  vacancies: number
  posts: number
  messages: number
  newUsers7d: number
  newCompanies7d: number
  activeUsers24h: number
}
export type OverviewRealtime = {
  online: number
  newUsersToday: number
  newCompaniesToday: number
  newVacanciesToday: number
  postsToday: number
}
export type Overview = {
  metrics: OverviewMetrics
  realtime: OverviewRealtime
  userGrowth: { d: string; total: number }[]
  registrations: { d: string; new: number; active: number }[]
  latestUsers: { id: string; name: string; email: string; avatar: string | null; createdAt: string }[]
  latestCompanies: { id: string; name: string; logo: string | null; website: string | null; createdAt: string }[]
}

// ── Пользователи / Компании / Вакансии ─────────────────────
export type AdminUser = {
  id: string
  name: string
  email: string
  avatar: string | null
  jobTitle: string | null
  createdAt: string
  lastSeen: string | null
  status: AccountStatus
  role: AdminRole | null
}
export type AdminCompany = {
  id: string
  name: string
  logo: string | null
  founder: string
  industry: string | null
  createdAt: string
  status: AccountStatus
  vacancyCount: number
  followerCount: number
}
export type AdminVacancy = {
  id: string
  title: string
  company: string
  companyLogo: string | null
  createdAt: string
  status: string
  moderation: VacancyModeration
  applicationCount: number
}

// ── Модерация контента ─────────────────────────────────────
export type AdminPost = {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  authorKind: string
  excerpt: string
  createdAt: string
  removed: boolean
  likeCount: number
  commentCount: number
}
export type AdminComment = {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  content: string
  createdAt: string
  removed: boolean
}

// ── Жалобы ─────────────────────────────────────────────────
export type ReportPriority = 'low' | 'medium' | 'high'
export type ReportStatus = 'new' | 'reviewing' | 'resolved' | 'rejected'
export type ReportTargetType = 'user' | 'company' | 'post' | 'comment' | 'vacancy'
/** Корзина (таб) списка жалоб. '' = все. */
export type ReportBucket = '' | 'reviewing' | 'attention' | 'resolved' | 'rejected'

export type AdminReportRow = {
  id: string
  category: string
  targetType: ReportTargetType
  target: EntityRef
  reporter: EntityRef | null
  priority: ReportPriority
  status: ReportStatus
  createdAt: string
}
export type ReportCounts = {
  all: number
  reviewing: number
  attention: number
  resolved: number
  rejected: number
  new7d: number
}
export type ReportListResult = { rows: AdminReportRow[]; total: number; counts: ReportCounts }

// ── Обсуждения (обращения в поддержку, миграция 0054) ─────
export type DiscussionCategory = 'question' | 'problem' | 'appeal' | 'other'
export type DiscussionStatus = 'open' | 'closed'
/** Корзина списка: '' — все, waiting — открытые с последним сообщением от пользователя. */
export type DiscussionBucket = '' | 'waiting' | 'open' | 'closed'
export type AdminDiscussionRow = {
  id: string
  user: EntityRef
  category: DiscussionCategory
  subject: string
  status: DiscussionStatus
  /** Ждёт ответа поддержки (открыто + последнее сообщение от пользователя). */
  waiting: boolean
  createdAt: string
  lastMessageAt: string
  lastPreview: string | null
}
export type DiscussionCounts = { all: number; waiting: number; open: number; closed: number }
export type DiscussionListResult = { rows: AdminDiscussionRow[]; total: number; counts: DiscussionCounts }
export type AdminDiscussionMessage = {
  id: string
  kind: 'user' | 'staff'
  body: string
  createdAt: string
  /** Кто из staff ответил — видно только в админке. */
  staff: EntityRef | null
}
export type AdminDiscussionDetail = {
  id: string
  user: EntityRef
  category: DiscussionCategory
  subject: string
  status: DiscussionStatus
  createdAt: string
  messages: AdminDiscussionMessage[]
}

export type ReportHistoryItem = {
  id: string
  action: string
  note: string
  createdAt: string
  actor: EntityRef | null
}
export type AdminReportDetail = {
  id: string
  category: string
  description: string
  targetType: ReportTargetType
  target: EntityRef
  /** Профиль виновника (для кнопки «Перейти»): автор поста/коммента, компания вакансии, либо сам юзер/компания. */
  targetProfileId: string | null
  reporter: EntityRef | null
  assigned: EntityRef | null
  priority: ReportPriority
  status: ReportStatus
  moderatorComment: string
  evidence: string[]
  createdAt: string
  updatedAt: string
  content: {
    kind: 'post' | 'comment'
    text: string
    postId?: string
    commentId?: string
    createdAt: string
    removed: boolean
  } | null
  history: ReportHistoryItem[]
}
/** Резолюция жалобы: «принять меры» (авто по типу цели) или «отклонить». */
export type ReportResolution = 'measures' | 'reject'

// ── Аналитика ──────────────────────────────────────────────
export type AdminAnalytics = {
  applications: number
  applicationsSeen: number
  conversations: number
  connections: number
  profileViews: number
  vacancyViews: number
  applications7d: number
  conversations7d: number
  connections7d: number
  profileViews7d: number
}
