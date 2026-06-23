import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadBlocks, unblockUser } from './blocksThunks'
import type { BlockedEntry } from './types'

type BlocksState = {
  /** Кого Я заблокировал (с данными — для списка в настройках). */
  mine: BlockedEntry[]
  /** Объединение обеих сторон — кого скрывать в поиске/рекомендациях/чате. */
  hiddenIds: string[]
  status: 'idle' | 'loading' | 'ready' | 'error'
}

const initialState: BlocksState = {
  mine: [],
  hiddenIds: [],
  status: 'idle',
}

const slice = createSlice({
  name: 'blocks',
  initialState,
  reducers: {
    addHidden(state, action: PayloadAction<string>) {
      if (!state.hiddenIds.includes(action.payload)) state.hiddenIds.push(action.payload)
    },
    removeBlocked(state, action: PayloadAction<string>) {
      state.mine = state.mine.filter((b) => b.id !== action.payload)
      state.hiddenIds = state.hiddenIds.filter((id) => id !== action.payload)
    },
  },
  extraReducers: (b) => {
    b.addCase(loadBlocks.pending, (s) => {
      s.status = 'loading'
    })
    b.addCase(loadBlocks.fulfilled, (s, a) => {
      s.status = 'ready'
      s.mine = a.payload.mine
      s.hiddenIds = a.payload.hiddenIds
    })
    b.addCase(loadBlocks.rejected, (s) => {
      s.status = 'error'
    })
    b.addCase(unblockUser.fulfilled, (s, a) => {
      s.mine = s.mine.filter((x) => x.id !== a.payload)
      s.hiddenIds = s.hiddenIds.filter((id) => id !== a.payload)
    })
    // blockUser оптимистичен (addHidden) + перезагрузка для деталей — отдельный case не нужен
  },
})

export const blocksReducer = slice.reducer
export const blocksActions = slice.actions
