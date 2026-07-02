import { supabase } from '../../../shared/lib/supabase'

/**
 * «Читал ли текущий пользователь эту статью» — RPC `has_viewed_article`
 * (миграция 0051, по `article_views`; своя статья считается прочитанной).
 * Отметка прочтения отдельно не нужна: страница статьи уже пишет просмотр
 * через `increment_article_views`. При ошибке (миграция не применена) — true,
 * чтобы бейдж «непрочитано» не подсвечивался зря.
 */
export async function hasViewedArticle(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_viewed_article', { p_id: id })
  if (error) return true
  return !!data
}
