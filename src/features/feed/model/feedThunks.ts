import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import type { RootState } from '../../../app/store/store'
import { feedActions } from './feedSlice'
import type { AuthorKind, FeedComment, FeedContent, FeedPost } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

type LikeRow = { user_id: string }
type CommentRow = {
  id: string
  author_id: string | null
  author_name: string
  author_avatar: string | null
  author_kind: string | null
  content: string
  created_at: string
  parent_id?: string | null
  post_comment_likes?: LikeRow[]
}
type PostRow = {
  id: string
  author_id: string
  author_name: string
  author_meta: string | null
  author_avatar: string | null
  author_kind: string | null
  content: FeedContent[]
  created_at: string
  post_likes: LikeRow[]
  post_comments: CommentRow[]
}

function mapComment(c: CommentRow, myId: string | null = null): FeedComment {
  const likes = c.post_comment_likes ?? []
  return {
    id: c.id,
    authorId: c.author_id ?? undefined,
    authorName: c.author_name,
    authorAvatar: c.author_avatar ?? undefined,
    authorKind: (c.author_kind as AuthorKind) ?? undefined,
    text: c.content,
    createdAt: new Date(c.created_at).getTime(),
    parentId: c.parent_id ?? undefined,
    likesCount: likes.length,
    likedByMe: !!myId && likes.some((l) => l.user_id === myId),
  }
}

function mapPost(row: PostRow, myId: string | null): FeedPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorMeta: row.author_meta ?? undefined,
    authorAvatar: row.author_avatar ?? undefined,
    authorKind: (row.author_kind as AuthorKind) ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    content: row.content ?? [],
    likesCount: row.post_likes?.length ?? 0,
    likedByMe: !!myId && (row.post_likes ?? []).some((l) => l.user_id === myId),
    likerIds: (row.post_likes ?? []).map((l) => l.user_id),
    // Храним плоским списком; дерево (корни/ответы) и порядок строит UI.
    comments: (row.post_comments ?? []).map((c) => mapComment(c, myId)),
  }
}

const SELECT =
  'id, author_id, author_name, author_meta, author_avatar, author_kind, content, created_at, post_likes(user_id), post_comments(id, author_id, author_name, author_avatar, author_kind, content, created_at, parent_id, post_comment_likes(user_id))'
const COMMENT_SELECT =
  'id, author_id, author_name, author_avatar, author_kind, content, created_at, parent_id, post_comment_likes(user_id)'
// Запасной select без денормализованных колонок аватара/типа автора —
// на случай, если миграция 0016 ещё не применена (лента продолжит работать).
const SELECT_LEGACY =
  'id, author_id, author_name, author_meta, content, created_at, post_likes(user_id), post_comments(id, author_id, author_name, content, created_at)'

/** Загрузка ленты. */
export const loadFeed = createAsyncThunk<FeedPost[], void>('feed/load', async () => {
  const myId = await currentUserId()
  const primary = await supabase
    .from('posts')
    .select(SELECT)
    .order('created_at', { ascending: false })
  let rows: unknown = primary.data
  if (primary.error) {
    // Колонки author_avatar/author_kind ещё не добавлены — пробуем без них.
    const legacy = await supabase
      .from('posts')
      .select(SELECT_LEGACY)
      .order('created_at', { ascending: false })
    if (legacy.error) throw new Error(legacy.error.message)
    rows = legacy.data
  }
  const posts = (rows as PostRow[]).map((r) => mapPost(r, myId))
  await enrichAuthors(posts)
  await attachFollowerCounts(posts)
  return posts
})

/**
 * Считает число подписчиков каждого автора (один запрос по графу `follows`) и
 * проставляет `authorFollowers` — сигнал «популярный аккаунт» для ранжирования.
 * Граф публичный (RLS select using(true)); ошибки заглушаем — лента важнее.
 */
async function attachFollowerCounts(posts: FeedPost[]) {
  const ids = [...new Set(posts.map((p) => p.authorId))]
  if (!ids.length) return
  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .in('followee_id', ids)
  if (error || !data) return
  const counts = new Map<string, number>()
  for (const r of data as { followee_id: string }[]) {
    counts.set(r.followee_id, (counts.get(r.followee_id) ?? 0) + 1)
  }
  for (const p of posts) p.authorFollowers = counts.get(p.authorId) ?? 0
}

/**
 * Подтягиваем АКТУАЛЬНЫЕ аватар и тип автора из профилей/компаний по author_id —
 * чтобы фото бралось из профиля даже у старых постов и после смены фото.
 * (Денормализованные author_avatar/author_kind остаются запасным значением.)
 */
async function enrichAuthors(posts: FeedPost[]) {
  const ids = new Set<string>()
  for (const p of posts) {
    ids.add(p.authorId)
    for (const c of p.comments) if (c.authorId) ids.add(c.authorId)
  }
  const idList = [...ids]
  if (!idList.length) return

  const [profs, comps] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, account_type, job_title, headline, job_status, skills')
      .in('id', idList),
    supabase.from('companies').select('id, name, avatar_url, logo_url, industry').in('id', idList),
  ])

  const map = new Map<
    string,
    { name?: string; avatar?: string; kind: AuthorKind; subtitle?: string; interests?: string[]; companyLogo?: string }
  >()
  for (const p of (profs.data ?? []) as {
    id: string
    full_name: string | null
    avatar_url: string | null
    account_type: string | null
    job_title: string | null
    headline: string | null
    job_status: { company?: string; companyLogo?: string } | null
    skills: string[] | null
  }[]) {
    // «Должность · компания»: должность (или headline) + текущая компания из job_status.
    const role = p.job_title || p.headline || ''
    const company = p.job_status?.company || ''
    const subtitle = [role, company].filter(Boolean).join(' · ') || undefined
    // Интересы человека: навыки + должность (как токены для совпадения по сфере).
    const interests = [...(p.skills ?? []), role].filter(Boolean)
    map.set(p.id, {
      name: p.full_name?.trim() || undefined,
      avatar: p.avatar_url ?? undefined,
      kind: p.account_type === 'company' ? 'company' : 'user',
      subtitle,
      interests,
      companyLogo: p.job_status?.companyLogo ?? undefined,
    })
  }
  for (const c of (comps.data ?? []) as {
    id: string
    name: string | null
    avatar_url: string | null
    logo_url: string | null
    industry: string | null
  }[]) {
    const cur = map.get(c.id)
    map.set(c.id, {
      name: c.name?.trim() || cur?.name,
      avatar: c.avatar_url ?? c.logo_url ?? cur?.avatar,
      kind: 'company',
      subtitle: c.industry || 'Компания',
      // Интересы компании: индустрия (как токен для совпадения по сфере).
      interests: c.industry ? [c.industry] : cur?.interests,
    })
  }

  for (const p of posts) {
    const a = map.get(p.authorId)
    if (a) {
      p.authorName = a.name ?? p.authorName
      p.authorAvatar = a.avatar ?? p.authorAvatar
      p.authorKind = a.kind
      p.authorSubtitle = a.subtitle ?? p.authorSubtitle
      p.authorInterests = a.interests ?? p.authorInterests
      p.authorCompanyLogo = a.companyLogo ?? p.authorCompanyLogo
    }
    for (const c of p.comments) {
      if (!c.authorId) continue
      const ca = map.get(c.authorId)
      if (ca) {
        c.authorName = ca.name ?? c.authorName
        c.authorAvatar = ca.avatar ?? c.authorAvatar
        c.authorKind = ca.kind
        c.authorSubtitle = ca.subtitle ?? c.authorSubtitle
        c.authorCompanyLogo = ca.companyLogo ?? c.authorCompanyLogo
      }
    }
  }
}

/** Создание поста. */
export const createPost = createAsyncThunk<
  FeedPost | null,
  {
    authorName: string
    authorMeta?: string
    authorAvatar?: string
    authorKind?: AuthorKind
    content: FeedContent[]
  }
>('feed/create', async ({ authorName, authorMeta, authorAvatar, authorKind, content }) => {
  const uid = await currentUserId()
  if (!uid) throw new Error('Нет активной сессии')
  const clean = content.filter((c) => (c.kind === 'text' ? c.text.trim() : true))
  if (!clean.length) return null
  const base = { author_id: uid, author_name: authorName, author_meta: authorMeta ?? null, content: clean }
  const primary = await supabase
    .from('posts')
    .insert({ ...base, author_avatar: authorAvatar ?? null, author_kind: authorKind ?? null })
    .select(SELECT)
    .single()
  let row: unknown = primary.data
  if (primary.error) {
    // Миграция 0016 не применена — вставляем без денормализованных колонок.
    const legacy = await supabase.from('posts').insert(base).select(SELECT_LEGACY).single()
    if (legacy.error) throw new Error(legacy.error.message)
    row = legacy.data
  }
  return mapPost(row as PostRow, uid)
})

/** Удаление своего поста (RLS posts_delete_own). Оптимистично убираем из ленты. */
export const deletePost = createAsyncThunk<string, string>(
  'feed/delete',
  async (postId, { dispatch }) => {
    dispatch(feedActions.removePost(postId))
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) {
      await dispatch(loadFeed()) // откат — вернуть актуальную ленту
      throw new Error(error.message)
    }
    return postId
  },
)

/** Лайк/снятие лайка (оптимистично, с откатом при ошибке). */
export const toggleLike = createAsyncThunk<void, string>(
  'feed/toggleLike',
  async (postId, { getState, dispatch }) => {
    const state = getState() as RootState
    const post = state.feed.posts.find((p) => p.id === postId)
    if (!post) return
    const uid = await currentUserId()
    if (!uid) throw new Error('Нет активной сессии')

    const willLike = !post.likedByMe
    dispatch(feedActions.applyLike({ postId, liked: willLike }))
    try {
      if (willLike) {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: uid })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', uid)
        if (error) throw error
      }
    } catch (e) {
      dispatch(feedActions.applyLike({ postId, liked: !willLike })) // откат
      throw e
    }
  },
)

/** Добавление комментария (или ответа на комментарий — через parentId). */
export const addComment = createAsyncThunk<
  { postId: string; comment: FeedComment } | null,
  {
    postId: string
    authorName: string
    authorAvatar?: string
    authorKind?: AuthorKind
    text: string
    /** id корневого комментария, если это ответ (один уровень вложенности). */
    parentId?: string
  }
>('feed/addComment', async ({ postId, authorName, authorAvatar, authorKind, text, parentId }) => {
  const t = text.trim()
  if (!t) return null
  const uid = await currentUserId()
  if (!uid) throw new Error('Нет активной сессии')
  const base = { post_id: postId, author_id: uid, author_name: authorName, content: t }
  const primary = await supabase
    .from('post_comments')
    .insert({
      ...base,
      author_avatar: authorAvatar ?? null,
      author_kind: authorKind ?? null,
      parent_id: parentId ?? null,
    })
    .select(COMMENT_SELECT)
    .single()
  let row: unknown = primary.data
  if (primary.error) {
    // Миграция 0016/0029 не применена — вставляем без денормализованных колонок и parent_id.
    const legacy = await supabase
      .from('post_comments')
      .insert(base)
      .select('id, author_id, author_name, content, created_at')
      .single()
    if (legacy.error) throw new Error(legacy.error.message)
    row = legacy.data
  }
  return { postId, comment: mapComment(row as CommentRow, uid) }
})

/** Лайк/снятие лайка комментария (оптимистично, с откатом при ошибке). */
export const toggleCommentLike = createAsyncThunk<
  void,
  { postId: string; commentId: string }
>('feed/toggleCommentLike', async ({ postId, commentId }, { getState, dispatch }) => {
  const state = getState() as RootState
  const post = state.feed.posts.find((p) => p.id === postId)
  const comment = post?.comments.find((c) => c.id === commentId)
  if (!comment) return
  const uid = await currentUserId()
  if (!uid) throw new Error('Нет активной сессии')

  const willLike = !comment.likedByMe
  dispatch(feedActions.applyCommentLike({ postId, commentId, liked: willLike }))
  try {
    if (willLike) {
      const { error } = await supabase
        .from('post_comment_likes')
        .insert({ comment_id: commentId, user_id: uid })
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('post_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', uid)
      if (error) throw error
    }
  } catch (e) {
    dispatch(feedActions.applyCommentLike({ postId, commentId, liked: !willLike })) // откат
    throw e
  }
})

/** Удаление своего комментария (RLS post_comments_delete_own). Каскад уносит ответы. */
export const deleteComment = createAsyncThunk<
  void,
  { postId: string; commentId: string }
>('feed/deleteComment', async ({ postId, commentId }, { dispatch }) => {
  dispatch(feedActions.removeComment({ postId, commentId }))
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (error) {
    await dispatch(loadFeed()) // откат — вернуть актуальную ленту
    throw new Error(error.message)
  }
})
