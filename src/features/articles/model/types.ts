export type ArticleStatus = 'draft' | 'published'

/** Статья (лонгрид) автора. Тело — markdown. */
export type Article = {
  id: string
  authorId: string
  category: string
  title: string
  subtitle: string
  coverUrl?: string
  /** Markdown-тело статьи. */
  body: string
  readingMinutes: number
  status: ArticleStatus
  views: number
  /** Время публикации (мс) — для сортировки/отображения даты. */
  publishedAt?: number
  createdAt: number
  updatedAt: number
  // Денормализованные данные автора (для шапки/футера статьи; заполняются при загрузке).
  authorName?: string
  authorAvatar?: string
  authorRole?: string
}

/** Данные из редактора при создании/сохранении статьи. */
export type ArticleDraft = {
  id?: string
  category: string
  title: string
  subtitle: string
  coverUrl?: string
  body: string
  status: ArticleStatus
}
