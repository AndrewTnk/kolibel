export type ModerationResolution = 'measures' | 'reject'

/**
 * Тип ответа модерации (аудитория):
 *  - report_result  — автору жалобы (решение по его жалобе);
 *  - content_removed — нарушителю (удалён пост/комментарий);
 *  - vacancy_removed — компании (снята вакансия);
 *  - account_blocked — нарушителю (заблокирован аккаунт; на практике показывается
 *    экраном блокировки при входе, но тип поддерживаем).
 */
export type ModerationKind = 'report_result' | 'content_removed' | 'vacancy_removed' | 'account_blocked'

/** Ответ модерации (читается из moderation_responses; одна модалка на все типы). */
export type ModerationResponse = {
  id: string
  kind: ModerationKind
  category: string
  resolution: ModerationResolution
  /** Короткая причина (для удаления/блокировки). */
  reason: string
  comment: string
}
