import { supabase } from '../../../shared/lib/supabase'

/** Данные профиля компании для CompanyPeekModal (баннер/фото/описание). */
export type CompanyPeekData = {
  banner?: string
  /** Фото профиля компании (avatar_url, фолбэк — логотип). */
  avatar?: string
  about?: string
}

/** Тянет баннер/фото/описание компании из таблицы `companies` по id профиля. */
export async function fetchCompanyPeek(id: string): Promise<CompanyPeekData | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('banner_url, avatar_url, logo_url, about')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const row = data as {
    banner_url: string | null
    avatar_url: string | null
    logo_url: string | null
    about: string | null
  }
  return {
    banner: row.banner_url ?? undefined,
    avatar: row.avatar_url ?? row.logo_url ?? undefined,
    about: row.about ?? undefined,
  }
}
