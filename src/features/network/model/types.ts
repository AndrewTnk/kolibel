/** Причина рекомендации — почему мы предлагаем этот контакт.
 *  mutual — общие связи; skill — общие навыки; role — похожая профессия;
 *  hr — специалист по найму; popular — популярный в сети;
 *  vacancy — совпадение по вакансиям; industry — общая сфера/направление. */
export type RecommendationReason = {
  kind: 'mutual' | 'skill' | 'role' | 'hr' | 'popular' | 'vacancy' | 'industry'
  text: string
}

/** Компания в разделе «Сеть» */
export type Company = {
  id: string
  /** Название компании */
  name: string
  /** Направление работы */
  field: string
  /** Заглушка лого — буква (если нет картинки) */
  logoInitial: string
  /** URL логотипа (если есть — показываем картинку вместо буквы) */
  logo?: string
  /** URL баннера/обложки компании (для карточки-рекомендации) */
  banner?: string
  /** Короткое описание для модалки */
  about: string
  location: string
  /** Страна (для карточки) */
  country?: string
  /** Размер команды (например «11–50») */
  size?: string
  /** Открытых вакансий */
  openVacancies: number
  /** Новых вакансий за последнюю неделю (для бейджа «+N») */
  newVacancies?: number
  /** Сколько людей из моей сети связаны с компанией */
  fromNetwork?: number
  /** Сколько всего подписчиков у компании (сигнал популярности для рекомендаций) */
  followerCount?: number
  /** Градиент баннера/лого (тёплые пастельные пары) */
  bg?: [string, string]
  /** Причина рекомендации (по сети/навыкам) */
  reason?: RecommendationReason
}

/** Рекомендованный человек в разделе «Сеть» */
export type NetworkPerson = {
  id: string
  fullName: string
  jobTitle: string
  /** Компания (для круглого значка-лого рядом с именем) */
  company?: string
  /** URL логотипа компании — если задан, рядом с именем показывается бейдж компании */
  companyLogo?: string
  /** Город */
  location: string
  /** Инициалы для аватара-заглушки */
  avatarInitials: string
  /** URL аватара (если есть — показываем фото вместо инициалов) */
  avatar?: string
  /** URL баннера профиля (для карточки-рекомендации) */
  banner?: string
  isOnline: boolean
  /** Роль-тег для секции «по скиллам, HR-ы, founder-ы» */
  tag?: string
  /** Навыки (для фильтра «по навыкам» и причины-совпадения) */
  skills?: string[]
  /** Короткое «о себе» (для peek-модалки) */
  about?: string
  /** Сколько общих связей с текущим пользователем */
  mutual?: number
  /** Сколько всего подписчиков (сигнал популярности для рекомендаций) */
  followerCount?: number
  /** Это аккаунт-компания (для квадратного аватара/формы значка) */
  isCompany?: boolean
  /** Градиент баннера карточки (тёплые пастельные пары) */
  bg?: [string, string]
  /** Причина рекомендации (через знакомых / по навыкам) */
  reason?: RecommendationReason
}
