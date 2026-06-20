import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { defaultFilters, type MyApplication, type VacancyFilters } from './types'
import { loadCompanySeen, saveCompanySeen } from '../lib/companySeen'
import {
  applyToVacancy,
  loadMyApplications,
  loadMyApplicationsDetailed,
  withdrawApplication,
} from './vacancyThunks'

/** Данные карточки компании для CompanyPeekModal (часть полей — мок). */
export type SeekerCompanyPayload = {
  /** id профиля компании (если открыли из реальных данных) — для ссылки на профиль */
  id?: string
  name: string
  /** Инициал для аватара-заглушки */
  ava: string
  /** URL логотипа компании (если есть) */
  logo?: string
  /** Подзаголовок «{отрасль} · {город}» */
  sub?: string
  about?: string
  /** Открытых вакансий (если не задано — считаем из vacanciesList) */
  openVacancies?: number
}

/** Модалки соискателя поверх details (открываются из карточек/сайдбара/деталей). */
export type SeekerModal =
  | null
  | { kind: 'apply'; id: string }
  | { kind: 'applied'; id: string }
  | { kind: 'contact'; id: string }
  | { kind: 'applications' }
  | { kind: 'companies-list' }
  | { kind: 'company'; payload: SeekerCompanyPayload }

type VacanciesState = {
  filters: VacancyFilters
  selectedId: string | null
  modalOpen: boolean
  appliedIds: string[]
  myApplications: MyApplication[]
  seekerModal: SeekerModal
  contactToast: string | null
  /** companyId → когда пользователь в последний раз смотрел вакансии компании (для бейджа «+N новых»). */
  companySeen: Record<string, number>
  /** UI: запрос открыть модалку публикации вакансии (триггерится из хедера на мобилке). */
  createVacancyOpen: boolean
  /** UI: открыта ли полноэкранная модалка «Папки» (хедер на мобилке). */
  foldersModalOpen: boolean
}

const initialState: VacanciesState = {
  filters: defaultFilters,
  selectedId: null,
  modalOpen: false,
  appliedIds: [],
  myApplications: [],
  seekerModal: null,
  contactToast: null,
  companySeen: loadCompanySeen(),
  createVacancyOpen: false,
  foldersModalOpen: false,
}

const slice = createSlice({
  name: 'vacancies',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<VacancyFilters>>) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = defaultFilters
    },
    toggleSkill(state, action: PayloadAction<string>) {
      const skill = action.payload
      const has = state.filters.skills.includes(skill)
      state.filters.skills = has
        ? state.filters.skills.filter((s) => s !== skill)
        : [...state.filters.skills, skill]
    },
    openVacancy(state, action: PayloadAction<string>) {
      state.selectedId = action.payload
      state.modalOpen = true
    },
    closeModal(state) {
      state.modalOpen = false
    },
    // ── Сидер-модалки ────────────────────────────────────────
    openApply(state, action: PayloadAction<string>) {
      state.seekerModal = { kind: 'apply', id: action.payload }
    },
    openApplied(state, action: PayloadAction<string>) {
      state.seekerModal = { kind: 'applied', id: action.payload }
    },
    openContact(state, action: PayloadAction<string>) {
      state.seekerModal = { kind: 'contact', id: action.payload }
    },
    openApplications(state) {
      state.seekerModal = { kind: 'applications' }
    },
    openCompaniesList(state) {
      state.seekerModal = { kind: 'companies-list' }
    },
    openCompany(state, action: PayloadAction<SeekerCompanyPayload>) {
      state.seekerModal = { kind: 'company', payload: action.payload }
      // Открыли компанию (= посмотрели её вакансии) → гасим бейдж «+N новых».
      const id = action.payload.id
      if (id) {
        state.companySeen[id] = Date.now()
        saveCompanySeen({ ...state.companySeen })
      }
    },
    closeSeekerModal(state) {
      state.seekerModal = null
    },
    showContactToast(state, action: PayloadAction<string>) {
      state.contactToast = action.payload
    },
    clearContactToast(state) {
      state.contactToast = null
    },
    openCreateVacancy(state) {
      state.createVacancyOpen = true
    },
    closeCreateVacancy(state) {
      state.createVacancyOpen = false
    },
    openFoldersModal(state) {
      state.foldersModalOpen = true
    },
    closeFoldersModal(state) {
      state.foldersModalOpen = false
    },
  },
  extraReducers: (b) => {
    b.addCase(applyToVacancy.fulfilled, (s, a) => {
      const { vacancyId, application } = a.payload
      if (!s.appliedIds.includes(vacancyId)) s.appliedIds.push(vacancyId)
      // Оптимистично добавляем в «Мои отклики» (сверху, как при загрузке desc).
      if (application && !s.myApplications.some((app) => app.vacancyId === vacancyId)) {
        s.myApplications.unshift(application)
      }
    })
    b.addCase(withdrawApplication.fulfilled, (s, a) => {
      s.appliedIds = s.appliedIds.filter((id) => id !== a.payload)
      s.myApplications = s.myApplications.filter((app) => app.vacancyId !== a.payload)
    })
    b.addCase(loadMyApplications.fulfilled, (s, a) => {
      s.appliedIds = a.payload
    })
    b.addCase(loadMyApplicationsDetailed.fulfilled, (s, a) => {
      s.myApplications = a.payload
    })
  },
})

export const vacanciesReducer = slice.reducer
export const vacanciesActions = slice.actions
