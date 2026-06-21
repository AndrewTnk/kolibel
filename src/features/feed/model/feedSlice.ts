import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { FeedPost } from './types'
import { addComment, createPost, loadFeed } from './feedThunks'

type FeedState = {
  posts: FeedPost[]
  /** Id своих только что опубликованных постов — закрепляются вверху общей ленты
   *  до следующей загрузки ленты (затем ранжируются на общих основаниях). */
  justPostedIds: string[]
  loaded: boolean
  status: 'idle' | 'loading'
  error: string | null
}

const initialState: FeedState = {
  posts: [],
  justPostedIds: [],
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
