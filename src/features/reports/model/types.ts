// Тип цели жалобы (на что/кого жалуются). Совпадает с reports.target_type в БД.
export type ReportTargetType = 'post' | 'comment' | 'vacancy' | 'user' | 'company' | 'message'

export type ReportTarget = {
  type: ReportTargetType
  id: string
  /** Название объекта (имя/заголовок) — для подзаголовка модалки. */
  title?: string
}
