import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { rowToArticle, estimateReadingMinutes, type ArticleRow } from '../lib/mapArticle'
import type { Article, ArticleDraft } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const AUTHOR_SELECT =
  '*, author:profiles!author_id(full_name, avatar_url, job_status)'

/** Список статей автора (для блока в профиле и «другие статьи автора»). */
export const loadAuthorArticles = createAsyncThunk<Article[], string>(
  'articles/loadByAuthor',
  async (authorId) => {
    const { data, error } = await supabase
      .from('articles')
      .select(AUTHOR_SELECT)
      .eq('author_id', authorId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as ArticleRow[]).map(rowToArticle)
  },
)

/** Все опубликованные статьи (общая лента для блока «Рекомендуем почитать» на главной). */
export const loadAllArticles = createAsyncThunk<Article[], void>(
  'articles/loadAll',
  async () => {
    const { data, error } = await supabase
      .from('articles')
      .select(AUTHOR_SELECT)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(60)
    if (error) throw new Error(error.message)
    return (data as ArticleRow[]).map(rowToArticle)
  },
)

/** Одна статья по id (страница статьи). */
export const loadArticle = createAsyncThunk<Article, string>(
  'articles/loadOne',
  async (id) => {
    const { data, error } = await supabase
      .from('articles')
      .select(AUTHOR_SELECT)
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return rowToArticle(data as ArticleRow)
  },
)

/** Создать статью. */
export const createArticle = createAsyncThunk<Article, ArticleDraft>(
  'articles/create',
  async (draft) => {
    const uid = await currentUserId()
    if (!uid) throw new Error('Не авторизован')
    const payload = {
      author_id: uid,
      category: draft.category,
      title: draft.title,
      subtitle: draft.subtitle,
      cover_url: draft.coverUrl ?? null,
      body: draft.body,
      reading_minutes: estimateReadingMinutes(draft.body),
      status: draft.status,
      published_at: draft.status === 'published' ? new Date().toISOString() : null,
    }
    const { data, error } = await supabase
      .from('articles')
      .insert(payload)
      .select(AUTHOR_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return rowToArticle(data as ArticleRow)
  },
)

/** Обновить статью. */
export const updateArticle = createAsyncThunk<Article, ArticleDraft & { id: string }>(
  'articles/update',
  async (draft) => {
    const payload = {
      category: draft.category,
      title: draft.title,
      subtitle: draft.subtitle,
      cover_url: draft.coverUrl ?? null,
      body: draft.body,
      reading_minutes: estimateReadingMinutes(draft.body),
      status: draft.status,
      // Проставляем дату публикации, если статья публикуется впервые.
      ...(draft.status === 'published' ? { published_at: new Date().toISOString() } : {}),
    }
    const { data, error } = await supabase
      .from('articles')
      .update(payload)
      .eq('id', draft.id)
      .select(AUTHOR_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return rowToArticle(data as ArticleRow)
  },
)

/** Удалить статью. */
export const deleteArticle = createAsyncThunk<string, string>(
  'articles/delete',
  async (id) => {
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return id
  },
)

/** Засчитать просмотр статьи (дедуп/без самопросмотров — на стороне БД). */
export const incrementArticleView = createAsyncThunk<string, string>(
  'articles/view',
  async (id) => {
    const { error } = await supabase.rpc('increment_article_views', { p_id: id })
    if (error) throw new Error(error.message)
    return id
  },
)
