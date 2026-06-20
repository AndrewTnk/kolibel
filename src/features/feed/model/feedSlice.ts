import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { FeedPost } from './types'
import { addComment, createPost, loadFeed } from './feedThunks'

type FeedState = {
  posts: FeedPost[]
  loaded: boolean
  status: 'idle' | 'loading'
  error: string | null
}

const initialState: FeedState = {
  posts: [],
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
    })
    b.addCase(loadFeed.rejected, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.error = a.error.message ?? 'Не удалось загрузить ленту'
    })

    b.addCase(createPost.fulfilled, (s, a) => {
      if (a.payload) s.posts.unshift(a.payload)
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
