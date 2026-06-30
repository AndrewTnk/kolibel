import type { NetworkPerson } from '../../network/model/types'

export type CompanyProduct = {
  id: string
  name: string
  desc: string
}

/** Направление «Чем занимаемся». */
export type CompanyDirection = {
  id: string
  /** ключ иконки (card/payout/shield/chart/bolt) */
  icon: string
  title: string
  desc: string
}

/** Ценность/принцип культуры. */
export type CompanyValue = {
  id: string
  title: string
  desc: string
}

/** Фото из «Жизни в компании». */
export type CompanyPhoto = {
  id: string
  url: string
}

/** Контакт компании: основатель или HR. */
export type CompanyContact = {
  id: string
  kind: 'founder' | 'hr'
  name: string
  /** Должность/подпись (необязательно) */
  position?: string
  /** id привязанного реального профиля (для фото и перехода в профиль). */
  userId?: string
  /** Денормализованный аватар привязанного профиля (фолбэк, если не резолвим заново). */
  avatar?: string
}

export type CompanyProfile = {
  name: string
  logoInitial: string
  /** Короткий слоган под именем (hero). */
  tagline?: string
  /** «Чем занимаемся». */
  directions: CompanyDirection[]
  /** «Ценности и культура». */
  cultureValues: CompanyValue[]
  /** «Жизнь в компании» (галерея). */
  gallery: CompanyPhoto[]
  /** Фото профиля компании (большая картинка в шапке). Не равно бейдж-логотипу. */
  avatar?: string
  /** URL логотипа-бейджа компании. Появляется бейджем у имени компании и её сотрудников. */
  logo?: string
  banner: string
  industry: string
  location: string
  country?: string
  isOnline: boolean
  about: string
  website: string
  verifiedDate: string
  size: string
  connectedMembers: string
  headquarters: string
  specialties: string[]
  products: CompanyProduct[]
  people: NetworkPerson[]
  contacts: CompanyContact[]
}

export const companyProfileMock: CompanyProfile = {
  name: 'Kolibel',
  logoInitial: 'K',
  tagline: 'Карьерная сеть: профили, вакансии, лента и чат в одном продукте.',
  directions: [],
  cultureValues: [],
  gallery: [],
  logo: '/logo/kolibel-mark.png',
  banner:
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1400&q=60',
  industry: 'Разработка программного обеспечения',
  location: 'Москва',
  country: 'Россия',
  isOnline: true,
  about:
    'Основанная в 2021 году, Kolibel объединяет специалистов и компании в одной карьерной сети. ' +
    'Мы помогаем людям находить работу и общаться, а работодателям — нанимать и развивать бренд. ' +
    'Продукт объединяет ленту, профили, вакансии и чат, а выручка формируется из подписок, ' +
    'продвижения вакансий и рекламы компаний.',
  website: 'https://kolibel.app',
  verifiedDate: '21 августа 2023 г.',
  size: '120+ сотрудников',
  connectedMembers: '1 248 связанных участников',
  headquarters: 'Москва, Россия',
  specialties: ['Карьера', 'Нетворкинг', 'Вакансии', 'Лента', 'Чат', 'Подбор персонала'],
  products: [
    { id: 'p1', name: 'Лента и сообщество', desc: 'Профессиональная лента, посты и обсуждения.' },
    { id: 'p2', name: 'Вакансии и отклики', desc: 'Публикация вакансий и работа с откликами.' },
    { id: 'p3', name: 'Чат и нетворкинг', desc: 'Общение с кандидатами и коллегами в реальном времени.' },
    { id: 'p4', name: 'Аналитика бренда', desc: 'Статистика просмотров профиля и вакансий компании.' },
  ],
  people: [
    { id: 'cp1', fullName: 'Иван Иванов', jobTitle: 'Frontend-разработчик', company: 'Kolibel', companyLogo: '/logo/kolibel-mark.png', location: 'Москва', avatarInitials: 'ИИ', isOnline: true, tag: 'Работает здесь' },
    { id: 'cp2', fullName: 'Павел Новиков', jobTitle: 'Team Lead', company: 'Kolibel', companyLogo: '/logo/kolibel-mark.png', location: 'Москва', avatarInitials: 'ПН', isOnline: true, tag: 'Работает здесь' },
    { id: 'cp3', fullName: 'Анна Соколова', jobTitle: 'QA Engineer', company: 'Kolibel', companyLogo: '/logo/kolibel-mark.png', location: 'Москва', avatarInitials: 'АС', isOnline: false, tag: 'Работает здесь' },
    { id: 'cp4', fullName: 'Виктория Белова', jobTitle: 'HR Business Partner', company: 'Kolibel', companyLogo: '/logo/kolibel-mark.png', location: 'Москва', avatarInitials: 'ВБ', isOnline: true, tag: 'Работает здесь' },
    { id: 'cp5', fullName: 'Сергей Волков', jobTitle: 'Product Manager', company: 'FinTech Co', location: 'СПб', avatarInitials: 'СВ', isOnline: true, tag: 'Подписан' },
    { id: 'cp6', fullName: 'Ольга Зайцева', jobTitle: 'UX/UI Designer', company: 'Lumen Design', location: 'СПб', avatarInitials: 'ОЗ', isOnline: false, tag: 'Подписан' },
    { id: 'cp7', fullName: 'Дмитрий Лебедев', jobTitle: 'Backend-разработчик', company: 'DataForge', location: 'Москва', avatarInitials: 'ДЛ', isOnline: true, tag: 'Подписан' },
  ],
  contacts: [
    { id: 'ct1', kind: 'founder', name: 'Алексей Кораблёв', position: 'CEO & Co-founder' },
    { id: 'ct2', kind: 'hr', name: 'Виктория Белова', position: 'HR Business Partner' },
  ],
}
