import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ChatModalRect = {
  x: number
  y: number
  w: number
  h: number
}

type ChatUiState = {
  modalOpen: boolean
  miniOpen: boolean
  miniView: 'list' | 'chat'
  activeConversationId: string | null
  modalRect: ChatModalRect
}

const defaultRect = (): ChatModalRect => ({
  x: Math.max(24, window.innerWidth - 720),
  y: Math.max(80, window.innerHeight * 0.1),
  w: 680,
  h: Math.min(560, window.innerHeight - 120),
})

const initialState: ChatUiState = {
  modalOpen: false,
  miniOpen: false,
  miniView: 'list',
  activeConversationId: null,
  modalRect: typeof window !== 'undefined' ? defaultRect() : { x: 80, y: 80, w: 680, h: 520 },
}

const slice = createSlice({
  name: 'chatUi',
  initialState,
  reducers: {
    openModal(state) {
      state.modalOpen = true
    },
    closeModal(state) {
      state.modalOpen = false
    },
    toggleMini(state) {
      state.miniOpen = !state.miniOpen
      if (state.miniOpen) state.miniView = 'list'
    },
    openMini(state) {
      state.miniOpen = true
      state.miniView = 'list'
    },
    closeMini(state) {
      state.miniOpen = false
      state.miniView = 'list'
    },
    setActiveConversation(state, action: PayloadAction<string>) {
      state.activeConversationId = action.payload
    },
    setMiniView(state, action: PayloadAction<'list' | 'chat'>) {
      state.miniView = action.payload
    },
    setModalRect(state, action: PayloadAction<ChatModalRect>) {
      state.modalRect = action.payload
    },
    openConversationInMini(state, action: PayloadAction<string>) {
      state.activeConversationId = action.payload
      state.miniView = 'chat'
      state.miniOpen = true
    },
  },
})

export const chatUiReducer = slice.reducer
export const chatUiActions = slice.actions
