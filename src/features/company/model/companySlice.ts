import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CompanyProfile } from './companyData'
import { companyProfileMock } from './companyData'
import { loadCompany, saveCompany } from './companyThunks'

type CompanyState = {
  profile: CompanyProfile
  loaded: boolean
  status: 'idle' | 'loading' | 'saving'
  error: string | null
  /** Глобальная модалка аналитики компании (открывается из мобильного хедера) */
  analyticsOpen: boolean
}

const initialState: CompanyState = {
  profile: companyProfileMock,
  loaded: false,
  status: 'idle',
  error: null,
  analyticsOpen: false,
}

const slice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    /** Частичное обновление профиля компании (любые поля верхнего уровня) */
    updateCompany(state, action: PayloadAction<Partial<CompanyProfile>>) {
      state.profile = { ...state.profile, ...action.payload }
    },
    openAnalytics(state) {
      state.analyticsOpen = true
    },
    closeAnalytics(state) {
      state.analyticsOpen = false
    },
  },
  extraReducers: (b) => {
    b.addCase(loadCompany.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(loadCompany.fulfilled, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      if (a.payload) s.profile = a.payload
    })
    b.addCase(loadCompany.rejected, (s, a) => {
      s.status = 'idle'
      s.loaded = true
      s.error = a.error.message ?? 'Не удалось загрузить профиль компании'
    })

    b.addCase(saveCompany.pending, (s) => {
      s.status = 'saving'
      s.error = null
    })
    b.addCase(saveCompany.fulfilled, (s, a) => {
      s.status = 'idle'
      s.profile = a.payload
    })
    b.addCase(saveCompany.rejected, (s, a) => {
      s.status = 'idle'
      s.error = a.error.message ?? 'Не удалось сохранить профиль компании'
    })
  },
})

export const companyReducer = slice.reducer
export const companyActions = slice.actions
