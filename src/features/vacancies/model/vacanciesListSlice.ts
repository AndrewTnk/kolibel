import { createSlice } from '@reduxjs/toolkit'
import type { Vacancy } from './types'
import {
  createVacancy,
  incrementVacancyView,
  loadVacancies,
  removeVacancy,
  updateVacancy,
  updateVacancyStatus,
} from './vacancyThunks'

type VacanciesListState = {
  items: Vacancy[]
  loaded: boolean
  status: 'idle' | 'loading'
  error: string | null
}

const initialState: VacanciesListState = {
  items: [],
  loaded: false,
  status: 'idle',
  error: null,
}

const slice = createSlice({
  name: 'vacanciesList',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadVacancies.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(loadVacancies.fulfilled, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.items = a.payload
    })
    b.addCase(loadVacancies.rejected, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.error = a.error.message ?? 'Не удалось загрузить вакансии'
    })

    b.addCase(createVacancy.fulfilled, (s, a) => {
      s.items.unshift(a.payload)
    })

    b.addCase(removeVacancy.fulfilled, (s, a) => {
      s.items = s.items.filter((v) => v.id !== a.payload)
    })

    b.addCase(updateVacancy.fulfilled, (s, a) => {
      const i = s.items.findIndex((v) => v.id === a.payload.id)
      if (i !== -1) s.items[i] = a.payload
    })

    b.addCase(updateVacancyStatus.fulfilled, (s, a) => {
      const v = s.items.find((x) => x.id === a.payload.id)
      if (v) v.status = a.payload.status
    })

    b.addCase(incrementVacancyView.fulfilled, (s, a) => {
      if (!a.payload) return
      const v = s.items.find((x) => x.id === a.payload)
      if (v) v.views = (v.views ?? 0) + 1
    })
  },
})

export const vacanciesListReducer = slice.reducer
export const vacanciesListActions = slice.actions
