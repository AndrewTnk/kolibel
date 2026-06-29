import { supabase } from '../../../shared/lib/supabase'
import type { ModerationResponse, ModerationResolution, ModerationKind } from '../model/types'

/** Заголовок ответа автору жалобы (по решению). */
export const RESPONSE_TITLE: Record<ModerationResolution, string> = {
  measures: 'Меры приняты',
  reject: 'Жалоба отклонена',
}

/** Текст ответа автору жалобы (шаблоны). */
export const RESPONSE_TEXT: Record<ModerationResolution, string> = {
  measures:
    'Мы рассмотрели вашу жалобу и приняли меры в отношении нарушения. Спасибо, что помогаете поддерживать порядок в сообществе.',
  reject:
    'Мы рассмотрели вашу жалобу, но не нашли нарушения правил сообщества. Решение — отклонить.',
}

/** Заголовок уведомления нарушителю (по типу). */
export const OFFENDER_TITLE: Record<Exclude<ModerationKind, 'report_result'>, string> = {
  content_removed: 'Контент удалён',
  vacancy_removed: 'Вакансия снята',
  account_blocked: 'Аккаунт заблокирован',
}

/** Текст-«шапка» уведомления нарушителю (по типу). Причина/комментарий — ниже. */
export const OFFENDER_TEXT: Record<Exclude<ModerationKind, 'report_result'>, string> = {
  content_removed: 'Ваш контент удалён модерацией за нарушение правил сообщества.',
  vacancy_removed: 'Ваша вакансия снята с публикации модерацией за нарушение правил.',
  account_blocked: 'Ваш аккаунт заблокирован модерацией за нарушение правил сообщества.',
}

/** Загружает ответ модерации по id (RLS: только свой). */
export async function fetchModerationResponse(id: string): Promise<ModerationResponse | null> {
  const { data, error } = await supabase
    .from('moderation_responses')
    .select('id, kind, category, resolution, reason, comment')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    id: data.id as string,
    kind: ((data.kind as string) ?? 'report_result') as ModerationKind,
    category: (data.category as string) ?? '',
    resolution: (data.resolution as ModerationResolution) ?? 'measures',
    reason: (data.reason as string) ?? '',
    comment: (data.comment as string) ?? '',
  }
}
