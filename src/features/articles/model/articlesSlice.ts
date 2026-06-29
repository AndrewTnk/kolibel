import { createSlice } from '@reduxjs/toolkit'
import {
  loadAuthorArticles,
  loadAllArticles,
  loadArticle,
  createArticle,
  updateArticle,
  deleteArticle,
} from './articleThunks'
import type { Article } from './types'

type Status = 'idle' | 'loading' | 'loaded' | 'error'

type ArticlesState = {
  /** Списки статей по автору (для блока в профиле и «другие статьи автора»). */
  byAuthor: Record<string, Article[]>
  loadedAuthors: string[]
  /** Общая лента опубликованных статей (блок «Рекомендуем почитать» на главной). */
  all: Article[]
  allStatus: Status
  /** Открытая статья на странице /article/:id. */
  open: Article | null
  openStatus: Status
}

const initialState: ArticlesState = {
  byAuthor: {},
  loadedAuthors: [],
  all: [],
  allStatus: 'idle',
  open: null,
  openStatus: 'idle',
}

function upsertInAuthor(state: ArticlesState, article: Article) {
  const list = state.byAuthor[article.authorId] ?? []
  const idx = list.findIndex((a) => a.id === article.id)
  if (idx >= 0) list[idx] = article
  else list.unshift(article)
  state.byAuthor[article.authorId] = list
}

/** Держим общую ленту в синке: опубликованную — апсертим, черновик/удаление — убираем. */
function syncInAll(state: ArticlesState, article: Article) {
  const idx = state.all.findIndex((a) => a.id === article.id)
  if (article.status === 'published') {
    if (idx >= 0) state.all[idx] = article
    else state.all.unshift(article)
  } else if (idx >= 0) {
    state.all.splice(idx, 1)
  }
}

const articlesSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    clearOpen(state) {
      state.open = null
      state.openStatus = 'idle'
    },
  },
  extraReducers: (b) => {
    b.addCase(loadAuthorArticles.fulfilled, (state, { payload, meta }) => {
      state.byAuthor[meta.arg] = payload
      if (!state.loadedAuthors.includes(meta.arg)) state.loadedAuthors.push(meta.arg)
    })

    b.addCase(loadAllArticles.pending, (state) => {
      state.allStatus = 'loading'
    })
    b.addCase(loadAllArticles.fulfilled, (state, { payload }) => {
      state.all = payload
      state.allStatus = 'loaded'
    })
    b.addCase(loadAllArticles.rejected, (state) => {
      state.allStatus = 'error'
    })

    b.addCase(loadArticle.pending, (state) => {
      state.openStatus = 'loading'
    })
    b.addCase(loadArticle.fulfilled, (state, { payload }) => {
      state.open = payload
      state.openStatus = 'loaded'
      upsertInAuthor(state, payload)
    })
    b.addCase(loadArticle.rejected, (state) => {
      state.openStatus = 'error'
    })

    b.addCase(createArticle.fulfilled, (state, { payload }) => {
      upsertInAuthor(state, payload)
      syncInAll(state, payload)
    })
    b.addCase(updateArticle.fulfilled, (state, { payload }) => {
      upsertInAuthor(state, payload)
      syncInAll(state, payload)
      if (state.open?.id === payload.id) state.open = payload
    })
    b.addCase(deleteArticle.fulfilled, (state, { payload: id }) => {
      for (const authorId of Object.keys(state.byAuthor)) {
        state.byAuthor[authorId] = state.byAuthor[authorId].filter((a) => a.id !== id)
      }
      state.all = state.all.filter((a) => a.id !== id)
      if (state.open?.id === id) state.open = null
    })
  },
})

export const articlesActions = articlesSlice.actions
export const articlesReducer = articlesSlice.reducer
