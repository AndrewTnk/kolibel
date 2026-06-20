export type SectionKey =
  | 'account'
  | 'security'
  | 'notifications'
  | 'analytics'
  | 'billing'
  | 'ads'
  | 'blacklist'

export const menuItems: { key: SectionKey; label: string }[] = [
  { key: 'account', label: 'Аккаунт и оформление' },
  { key: 'security', label: 'Вход и безопасность' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'analytics', label: 'Аналитика' },
  { key: 'billing', label: 'Подписки и оплата' },
  { key: 'ads', label: 'Рекламные данные' },
  { key: 'blacklist', label: 'Чёрный список' },
]

/* ── Уведомления ──────────────────────────────── */
export type NotificationOption = { id: string; label: string; desc: string; enabled: boolean }

export const notificationOptions: NotificationOption[] = [
  { id: 'messages', label: 'Сообщения', desc: 'Новые сообщения в чатах', enabled: true },
  { id: 'applications', label: 'Отклики', desc: 'Ответы на ваши отклики и приглашения', enabled: true },
  { id: 'posts', label: 'Новые посты', desc: 'Публикации тех, на кого вы подписаны', enabled: false },
  { id: 'vacancies', label: 'Рекомендации вакансий', desc: 'Подходящие вам вакансии', enabled: true },
  { id: 'network', label: 'Сеть', desc: 'Новые подписчики и приглашения', enabled: true },
  { id: 'email', label: 'Email-уведомления', desc: 'Дублировать важное на почту', enabled: false },
]

/* ── Устройства ───────────────────────────────── */
export type Device = { id: string; name: string; meta: string; current: boolean }

export const devicesMock: Device[] = [
  { id: 'd1', name: 'Chrome · Windows', meta: 'Москва · активно сейчас', current: true },
  { id: 'd2', name: 'Kolibel iOS', meta: 'iPhone 14 · 2 часа назад', current: false },
  { id: 'd3', name: 'Safari · macOS', meta: 'Санкт-Петербург · 3 дня назад', current: false },
]

/* ── Аналитика ────────────────────────────────── */
export type AnalyticStat = { id: string; label: string; value: string; delta: string; positive: boolean }

export const analyticsMock: AnalyticStat[] = [
  { id: 'views', label: 'Просмотры профиля', value: '1 248', delta: '+18% за неделю', positive: true },
  { id: 'followers', label: 'Новые подписчики', value: '64', delta: '+12 за неделю', positive: true },
  { id: 'applies', label: 'Отклики', value: '9', delta: '+3 за неделю', positive: true },
  { id: 'vacancies', label: 'Вакансий по профессии', value: '320', delta: '+5% за месяц', positive: true },
]

/* ── Подписки и оплата ────────────────────────── */
export type Plan = {
  id: string
  name: string
  price: string
  period: string
  features: string[]
  current: boolean
}

export const plansMock: Plan[] = [
  {
    id: 'free',
    name: 'Базовый',
    price: '0 ₽',
    period: 'навсегда',
    features: ['Профиль и резюме', 'Отклики на вакансии', 'Чат и сеть'],
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '690 ₽',
    period: 'в месяц',
    features: ['Кто смотрел профиль', 'Приоритет в поиске', 'Расширенная аналитика'],
    current: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: '1 990 ₽',
    period: 'в месяц',
    features: ['Размещение вакансий', 'Реклама компании', 'Командный доступ'],
    current: false,
  },
]

export type Transaction = { id: string; date: string; title: string; amount: string }

export const transactionsMock: Transaction[] = [
  { id: 't1', date: '14 мая 2026', title: 'Продвижение резюме · 7 дней', amount: '−490 ₽' },
  { id: 't2', date: '02 мая 2026', title: 'Подписка Pro · месяц', amount: '−690 ₽' },
  { id: 't3', date: '18 апр 2026', title: 'Возврат за рекламу', amount: '+250 ₽' },
]

/* ── Рекламные данные ─────────────────────────── */
export type AdStat = { id: string; label: string; value: string }

export const adStatsMock: AdStat[] = [
  { id: 'impr', label: 'Показы', value: '12 540' },
  { id: 'clicks', label: 'Клики', value: '486' },
  { id: 'ctr', label: 'CTR', value: '3.9%' },
  { id: 'days', label: 'Дней в работе', value: '6 из 14' },
]

/* ── Чёрный список ────────────────────────────── */
export type BlockedEntry = { id: string; name: string; type: 'Пользователь' | 'Компания'; sub: string }

export const blacklistMock: BlockedEntry[] = [
  { id: 'b1', name: 'Спам-рекрутер', type: 'Пользователь', sub: 'Назойливые предложения' },
  { id: 'b2', name: 'FastCash Ltd', type: 'Компания', sub: 'Подозрительные вакансии' },
  { id: 'b3', name: 'Иван Петров', type: 'Пользователь', sub: 'Заблокирован вами' },
  { id: 'b4', name: 'CryptoJobs', type: 'Компания', sub: 'Нерелевантная реклама' },
]
