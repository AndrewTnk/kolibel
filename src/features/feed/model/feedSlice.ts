import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { FeedPost } from './types'
import { addComment, createPost, loadFeed } from './feedThunks'

type FeedState = {
  posts: FeedPost[]
  /** Id своих только что опубликованных постов — закрепляются вверху общей ленты
   *  до следующей загрузки ленты (затем ранжируются на общих основаниях). */
  justPostedIds: string[]
  /** Счётчик «явных перезагрузок» ленты (растёт только на loadFeed.fulfilled).
   *  Маркер для FeedList: порядок ранжированной ленты пересчитывается ТОЛЬКО при
   *  смене feedVersion — лайки/комменты порядок не двигают (позиция стабильна до
   *  перезагрузки страницы/ленты). */
  feedVersion: number
  /** Открытая модалка поста (веб): id поста или null. */
  openPostId: string | null
  loaded: boolean
  status: 'idle' | 'loading'
  error: string | null
}

const initialState: FeedState = {
  posts: [],
  justPostedIds: [],
  feedVersion: 0,
  openPostId: null,
  loaded: false,
  status: 'idle',
  error: null,
}

const slice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    /** Оптимистичное переключение лайка (используется thunk-ом toggleLike). */
    applyLike(state, action: PayloadAction<{ postId: string; liked: boolean }>) {
      const p = state.posts.find((x) => x.id === action.payload.postId)
      if (!p) return
      if (p.likedByMe === action.payload.liked) return
      p.likedByMe = action.payload.liked
      p.likesCount += action.payload.liked ? 1 : -1
      if (p.likesCount < 0) p.likesCount = 0
    },
    /** Удалить пост из ленты (оптимистично при удалении). */
    removePost(state, action: PayloadAction<string>) {
      state.posts = state.posts.filter((p) => p.id !== action.payload)
      if (state.openPostId === action.payload) state.openPostId = null
    },
    /** Открыть модалку поста (веб). */
    openPost(state, action: PayloadAction<string>) {
      state.openPostId = action.payload
    },
    closePost(state) {
      state.openPostId = null
    },
    /** Оптимистичный лайк комментария (используется thunk-ом toggleCommentLike). */
    applyCommentLike(
      state,
      action: PayloadAction<{ postId: string; commentId: string; liked: boolean }>,
    ) {
      const p = state.posts.find((x) => x.id === action.payload.postId)
      const c = p?.comments.find((x) => x.id === action.payload.commentId)
      if (!c) return
      if (c.likedByMe === action.payload.liked) return
      c.likedByMe = action.payload.liked
      c.likesCount += action.payload.liked ? 1 : -1
      if (c.likesCount < 0) c.likesCount = 0
    },
    /** Удалить комментарий (и его ответы) из поста — оптимистично при удалении. */
    removeComment(state, action: PayloadAction<{ postId: string; commentId: string }>) {
      const p = state.posts.find((x) => x.id === action.payload.postId)
      if (!p) return
      const { commentId } = action.payload
      p.comments = p.comments.filter((c) => c.id !== commentId && c.parentId !== commentId)
    },
  },
  extraReducers: (b) => {
    b.addCase(loadFeed.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(loadFeed.fulfilled, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.posts = a.payload
      // Лента перезагружена — свои свежие посты больше не закрепляем, идут в общий алгоритм.
      s.justPostedIds = []
      // Явная перезагрузка ленты → разрешаем FeedList пересчитать замороженный порядок.
      s.feedVersion += 1
    })
    b.addCase(loadFeed.rejected, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.error = a.error.message ?? 'Не удалось загрузить ленту'
    })

    b.addCase(createPost.fulfilled, (s, a) => {
      if (!a.payload) return
      s.posts.unshift(a.payload)
      // Закрепляем свой новый пост вверху общей ленты (новейший — первым).
      s.justPostedIds.unshift(a.payload.id)
    })

    b.addCase(addComment.fulfilled, (s, a) => {
      if (!a.payload) return
      const p = s.posts.find((x) => x.id === a.payload!.postId)
      if (p) p.comments.push(a.payload.comment)
    })
  },
})

export const feedReducer = slice.reducer
export const feedActions = slice.actions
