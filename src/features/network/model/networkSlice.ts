import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Company, NetworkPerson } from './types'
import { loadNetwork } from './networkThunks'

type NetworkStatus = 'idle' | 'loading' | 'ready' | 'error'

type NetworkState = {
  recommendedPeople: NetworkPerson[]
  recommendedCompanies: Company[]
  followingPeople: NetworkPerson[]
  followingCompanies: Company[]
  followers: NetworkPerson[]
  followingIds: string[]
  status: NetworkStatus
  /** UI: открыта ли модалка графа сети (триггерится из хедера на мобилке). */
  graphModalOpen: boolean
  /** UI: открыт ли полноэкранный граф на чужом профиле (триггерится из хедера на мобилке). */
  publicGraphOpen: boolean
  /** UI: поисковый запрос рекомендаций (общий для блока и хедер-поиска на мобилке). */
  recSearch: string
}

const initialState: NetworkState = {
  recommendedPeople: [],
  recommendedCompanies: [],
  followingPeople: [],
  followingCompanies: [],
  followers: [],
  followingIds: [],
  status: 'idle',
  graphModalOpen: false,
  publicGraphOpen: false,
  recSearch: '',
}

const slice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    /** Оптимистичное обновление подписки (используется toggleFollow).
     *  Помимо followingIds поддерживает списки followingPeople/Companies
     *  (для «Моих подписок» и счётчиков), беря данные из recommended-списков. */
    applyFollow(state, action: PayloadAction<{ targetId: string; following: boolean }>) {
      const { targetId, following } = action.payload
      const has = state.followingIds.includes(targetId)
      if (following && !has) {
        state.followingIds.push(targetId)
        const person = state.recommendedPeople.find((p) => p.id === targetId)
        if (person && !state.followingPeople.some((p) => p.id === targetId)) {
          state.followingPeople.push(person)
        }
        const company = state.recommendedCompanies.find((c) => c.id === targetId)
        if (company && !state.followingCompanies.some((c) => c.id === targetId)) {
          state.followingCompanies.push(company)
        }
      }
      if (!following && has) {
        state.followingIds = state.followingIds.filter((id) => id !== targetId)
        state.followingPeople = state.followingPeople.filter((p) => p.id !== targetId)
        state.followingCompanies = state.followingCompanies.filter((c) => c.id !== targetId)
      }
    },
    openGraphModal(state) {
      state.graphModalOpen = true
    },
    closeGraphModal(state) {
      state.graphModalOpen = false
    },
    openPublicGraph(state) {
      state.publicGraphOpen = true
    },
    closePublicGraph(state) {
      state.publicGraphOpen = false
    },
    setRecSearch(state, action: PayloadAction<string>) {
      state.recSearch = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNetwork.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadNetwork.fulfilled, (state, action) => {
        state.status = 'ready'
        state.recommendedPeople = action.payload.recommendedPeople
        state.recommendedCompanies = action.payload.recommendedCompanies
        state.followingPeople = action.payload.followingPeople
        state.followingCompanies = action.payload.followingCompanies
        state.followers = action.payload.followers
        state.followingIds = action.payload.followingIds
      })
      .addCase(loadNetwork.rejected, (state) => {
        state.status = 'error'
      })
  },
})

export const networkReducer = slice.reducer
export const networkActions = slice.actions
