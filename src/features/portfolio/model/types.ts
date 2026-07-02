export type PortfolioKind = 'image' | 'link'

export type PortfolioItem = {
  id: string
  ownerId: string
  kind: PortfolioKind
  /** Название карточки (задаёт пользователь). */
  title: string
  /** image: публичный URL файла в Storage; link: внешняя ссылка. */
  url: string
  /** Своя обложка для link (пока без UI — задел на будущее). */
  coverUrl?: string
  createdAt: number
}

export type PortfolioDraft = {
  kind: PortfolioKind
  title: string
  url: string
  coverUrl?: string
}

/** Максимум работ в портфолио (решение владельца). */
export const PORTFOLIO_MAX_ITEMS = 12

/** Лимит длины названия карточки. */
export const PORTFOLIO_TITLE_LIMIT = 60
