import { supabase } from '../../../shared/lib/supabase'

export type CompanySuggestion = { id: string; name: string; logo?: string }

/**
 * Поиск зарегистрированных компаний по началу названия (для автоподсказки
 * в поле «Компания» редактора профиля). Возвращает id/название/логотип.
 */
export async function searchCompaniesByName(
  query: string,
  limit = 6,
): Promise<CompanySuggestion[]> {
  const q = query.trim()
  if (!q) return []
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, avatar_url')
    .ilike('name', `${q}%`)
    .limit(limit)
  if (error || !data) return []
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    logo: c.logo_url || c.avatar_url || undefined,
  }))
}
