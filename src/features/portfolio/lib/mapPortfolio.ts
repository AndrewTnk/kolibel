import type { PortfolioItem, PortfolioKind } from '../model/types'

export type PortfolioRow = {
  id: string
  owner_id: string
  kind: string
  title: string
  url: string
  cover_url: string | null
  created_at: string
}

export function rowToItem(row: PortfolioRow): PortfolioItem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    kind: (row.kind === 'link' ? 'link' : 'image') as PortfolioKind,
    title: row.title,
    url: row.url,
    coverUrl: row.cover_url ?? undefined,
    createdAt: Date.parse(row.created_at),
  }
}
