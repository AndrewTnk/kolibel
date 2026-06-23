/** Запись чёрного списка (тот, кого Я заблокировал) с данными для отображения. */
export type BlockedEntry = {
  id: string
  name: string
  kind: 'user' | 'company'
  avatar?: string
  /** ISO-время блокировки. */
  createdAt: string
}
