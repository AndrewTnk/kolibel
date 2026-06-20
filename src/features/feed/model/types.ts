export type FeedContent =
  | { kind: 'text'; text: string }
  | { kind: 'image'; url: string; alt?: string }
  | { kind: 'video'; url: string; title?: string }
  | { kind: 'document'; url: string; name: string }
  | { kind: 'vacancy'; vacancyId: string; title: string; salary: string; city: string }

export type AuthorKind = 'user' | 'company'

export type FeedComment = {
  id: string
  authorId?: string
  authorName: string
  authorAvatar?: string
  authorKind?: AuthorKind
  /** «Должность · компания» автора (подтягивается из профиля в enrichAuthors). */
  authorSubtitle?: string
  /** Лого компании-работодателя автора (бейдж рядом с именем). */
  authorCompanyLogo?: string
  text: string
  createdAt: number
}

export type FeedPost = {
  id: string
  authorId: string
  authorName: string
  authorMeta?: string
  authorAvatar?: string
  authorKind?: AuthorKind
  /** «Должность · компания» автора (подтягивается из профиля в enrichAuthors). */
  authorSubtitle?: string
  /** Лого компании-работодателя автора (бейдж рядом с именем). */
  authorCompanyLogo?: string
  createdAt: number
  content: FeedContent[]
  likedByMe: boolean
  likesCount: number
  comments: FeedComment[]
  // ── Сигналы для ранжирования ленты (заполняются в loadFeed/enrichAuthors) ──
  /** id пользователей, лайкнувших пост (для соц-доказательства «лайкнули твои подписки»). */
  likerIds?: string[]
  /** Интересы автора (навыки — у людей, индустрия/направления — у компаний). */
  authorInterests?: string[]
  /** Число подписчиков автора (сигнал «популярный аккаунт»). */
  authorFollowers?: number
}

