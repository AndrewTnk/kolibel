import type { Article } from '../model/types'

/** Денормализованный автор (из profiles), приходящий вложенно в запрос. */
type AuthorRow = {
  full_name?: string | null
  avatar_url?: string | null
  job_status?: { jobTitle?: string; company?: string } | null
} | null

export type ArticleRow = {
  id: string
  author_id: string
  category: string | null
  title: string | null
  subtitle: string | null
  cover_url: string | null
  body: string | null
  reading_minutes: number | null
  status: string | null
  views: number | null
  published_at: string | null
  created_at: string
  updated_at: string
  author?: AuthorRow
}

function authorRole(a: AuthorRow | undefined): string | undefined {
  if (!a?.job_status) return undefined
  return [a.job_status.jobTitle, a.job_status.company].filter(Boolean).join(' · ') || undefined
}

export function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    authorId: row.author_id,
    category: row.category ?? '',
    title: row.title ?? '',
    subtitle: row.subtitle ?? '',
    coverUrl: row.cover_url ?? undefined,
    body: row.body ?? '',
    readingMinutes: row.reading_minutes ?? 1,
    status: (row.status as Article['status']) ?? 'published',
    views: row.views ?? 0,
    publishedAt: row.published_at ? new Date(row.published_at).getTime() : undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    authorName: row.author?.full_name ?? undefined,
    authorAvatar: row.author?.avatar_url ?? undefined,
    authorRole: authorRole(row.author),
  }
}

/** Грубая оценка времени чтения по markdown-телу (~180 слов/мин, минимум 1). */
export function estimateReadingMinutes(markdown: string): number {
  const words = markdown.replace(/[#>*_`~\-[\]()!]/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}
