import { supabase } from '../../../shared/lib/supabase'

/** Источник перехода на профиль (для разбивки «откуда приходят»). */
export type ViewSource = 'feed' | 'search' | 'vacancy' | 'network' | 'direct'

const SOURCES: ViewSource[] = ['feed', 'search', 'vacancy', 'network', 'direct']

/** Нормализует строку из query (?from=...) в допустимый источник. */
export function normalizeSource(raw: string | null | undefined): ViewSource {
  return SOURCES.includes(raw as ViewSource) ? (raw as ViewSource) : 'direct'
}

/**
 * Фиксирует просмотр профиля/страницы компании. Бэкенд сам отбрасывает
 * самопросмотры и дубли (один зритель раз в 30 минут). Ошибки заглушаем —
 * аналитика не должна ломать открытие страницы.
 */
export async function recordProfileView(profileId: string, source: ViewSource = 'direct') {
  try {
    await supabase.rpc('record_profile_view', { p_profile_id: profileId, p_source: source })
  } catch {
    /* no-op */
  }
}
