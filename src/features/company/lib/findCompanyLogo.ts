import { supabase } from '../../../shared/lib/supabase'

/**
 * Ищет логотип компании по её названию (точное совпадение без учёта регистра).
 * Возвращает URL логотипа или null, если компания не найдена / у неё нет логотипа.
 * Используется для авто-подстановки бейджа работодателя в профиль пользователя.
 */
export async function findCompanyLogoByName(name: string): Promise<string | null> {
  const n = name.trim()
  if (!n) return null
  const { data, error } = await supabase
    .from('companies')
    .select('logo_url')
    .ilike('name', n)
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data?.logo_url ?? null
}
