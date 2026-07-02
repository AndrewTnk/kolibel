import { createSlice } from '@reduxjs/toolkit'
import {
  createPortfolioItem,
  deletePortfolioItem,
  loadPortfolio,
  updatePortfolioItem,
} from './portfolioThunks'
import type { PortfolioItem } from './types'

type PortfolioState = {
  /** Работы по владельцу (свой профиль и просмотр чужого). */
  byOwner: Record<string, PortfolioItem[]>
  loadedOwners: string[]
}

const initialState: PortfolioState = {
  byOwner: {},
  loadedOwners: [],
}

function upsert(state: PortfolioState, item: PortfolioItem) {
  const list = state.byOwner[item.ownerId] ?? []
  const idx = list.findIndex((i) => i.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  state.byOwner[item.ownerId] = list
}

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadPortfolio.fulfilled, (state, { payload, meta }) => {
      state.byOwner[meta.arg] = payload
      if (!state.loadedOwners.includes(meta.arg)) state.loadedOwners.push(meta.arg)
    })
    b.addCase(createPortfolioItem.fulfilled, (state, { payload }) => {
      upsert(state, payload)
    })
    b.addCase(updatePortfolioItem.fulfilled, (state, { payload }) => {
      upsert(state, payload)
    })
    b.addCase(deletePortfolioItem.fulfilled, (state, { payload: id }) => {
      for (const ownerId of Object.keys(state.byOwner)) {
        state.byOwner[ownerId] = state.byOwner[ownerId].filter((i) => i.id !== id)
      }
    })
  },
})

export const portfolioReducer = portfolioSlice.reducer
