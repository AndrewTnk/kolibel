import { supabase } from '../../../shared/lib/supabase'
import { PLATFORM_UPDATE_CATEGORY } from './categories'

let cached: Promise<string | null> | null = null

/**
 * id последней опубликованной Update-статьи (для пункта «Что нового» в футере
 * SupportLinks). Лёгкий точечный запрос вместо загрузки всех статей; кэш на
 * сессию вкладки — футер рендерится в нескольких сайдбарах одновременно.
 * Нет апдейтов / ошибка → null (пункт скрывается).
 */
export function fetchLatestUpdateId(): Promise<string | null> {
  if (!cached) {
    cached = (async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id')
        .eq('category', PLATFORM_UPDATE_CATEGORY)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
      if (error) return null
      return (data?.[0]?.id as string | undefined) ?? null
    })()
  }
  return cached
}
