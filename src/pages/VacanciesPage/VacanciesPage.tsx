import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader.tsx'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { filterVacancies } from '../../features/vacancies/lib/filterVacancies'
import { loadVacancySeen } from '../../features/vacancies/lib/vacancySeen'
import { computeMatch, resumeToMatchProfile } from '../../features/vacancies/lib/useVacancyMatch'
import { companyInitial } from '../../features/vacancies/lib/initials'
import {
  incrementVacancyView,
  loadMyApplications,
  loadVacancies,
} from '../../features/vacancies/model/vacancyThunks'
import { vacanciesActions } from '../../features/vacancies/model/vacanciesSlice'
import { defaultFilters, type Vacancy } from '../../features/vacancies/model/types'
import { VacancyCard } from '../../features/vacancies/ui/VacancyCard'
import { FiltersModal } from '../../features/vacancies/ui/FiltersModal'
import { SubscribedCompanies } from '../../features/vacancies/ui/SubscribedCompanies'
import { JobTipCard } from '../../widgets/JobTipCard/JobTipCard'
import { ApplicationsTracker } from '../../widgets/ApplicationsTracker/ApplicationsTracker'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import { IcClose, IcFilter, IcSearch } from '../../features/vacancies/ui/icons'
import styles from './VacanciesPage.module.css'

type Sort = 'match' | 'date' | 'salary'
const PAGE_SIZE = 8
const PAGE_STEP = 6

export function VacanciesPage() {
  const dispatch = useAppDispatch()
  const isCompany = useAppSelector((st) => st.account.type === 'company')
  const filters = useAppSelector((st) => st.vacancies?.filters) ?? defaultFilters
  const appliedIds = useAppSelector((st) => st.vacancies?.appliedIds ?? [])
  const items = useAppSelector((st) => st.vacanciesList.items)
  const loaded = useAppSelector((st) => st.vacanciesList.loaded)
  const resume = useAppSelector((st) => st.profile.resume)

  const [sort, setSort] = useState<Sort>('match')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [hideViewed, setHideViewed] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => loadVacancySeen())

  useEffect(() => {
    void dispatch(loadVacancies())
    void dispatch(loadMyApplications())
  }, [dispatch])

  // Список просмотренных вакансий (localStorage) — обновляется при открытии вакансии.
  useEffect(() => {
    const refresh = () => setSeen(loadVacancySeen())
    window.addEventListener('kolibel:vacancySeen', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('kolibel:vacancySeen', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const query = filters.query ?? ''

  const activeFiltersCount =
    (filters.city ? 1 : 0) +
    (filters.company ? 1 : 0) +
    (filters.workFormat !== 'all' ? 1 : 0) +
    (filters.employmentType !== 'all' ? 1 : 0) +
    (filters.schedule !== 'all' ? 1 : 0) +
    (filters.salaryMin ? 1 : 0) +
    (filters.salaryMax ? 1 : 0) +
    (filters.postedWithin !== 'any' ? 1 : 0) +
    filters.skills.length

  // Кеш match-скоров для сортировки «по совпадению» (реальный матчинг по профилю).
  const scoreOf = useMemo(() => {
    const profile = resumeToMatchProfile(resume)
    const m = new Map<string, number>()
    for (const v of items) m.set(v.id, computeMatch(v, profile).score ?? -1)
    return m
  }, [items, resume])

  const filtered = useMemo(() => {
    const base = filterVacancies(items, { ...filters, sort: 'date' })
    const arr = [...base]
    if (sort === 'salary') {
      arr.sort((a, b) => (b.salaryTo ?? b.salaryFrom ?? 0) - (a.salaryTo ?? a.salaryFrom ?? 0))
    } else if (sort === 'date') {
      arr.sort((a, b) => b.postedAt - a.postedAt)
    } else {
      arr.sort((a, b) => (scoreOf.get(b.id) ?? -1) - (scoreOf.get(a.id) ?? -1))
    }
    return arr
  }, [items, filters, sort, scoreOf])

  // Чек-бокс «скрыть просмотренные мной» (вне фильтров) убирает вакансии из seen-набора.
  const rest = useMemo(
    () => (hideViewed ? filtered.filter((v) => !seen.has(v.id)) : filtered),
    [filtered, hideViewed, seen],
  )
  const visible = rest.slice(0, visibleCount)

  function openVacancy(id: string) {
    dispatch(vacanciesActions.openVacancy(id))
    void dispatch(incrementVacancyView(id))
  }

  function openCompany(v: Vacancy) {
    dispatch(
      vacanciesActions.openCompany({
        id: v.companyId,
        name: v.company,
        ava: companyInitial(v.company),
        sub: v.city || undefined,
        about: v.companyAbout || undefined,
      }),
    )
  }

  function resetAll() {
    dispatch(vacanciesActions.resetFilters())
    setVisibleCount(PAGE_SIZE)
  }

  const center = (
    <section className={styles.center} aria-label="Поиск и список вакансий">
      <div className={styles.searchRow}>
        <div className={styles.bigSearch}>
          <span className={styles.bigSearchIcon} aria-hidden>
            <IcSearch size={20} />
          </span>
          <input
            className={styles.bigSearchInput}
            value={query}
            onChange={(e) => dispatch(vacanciesActions.setFilters({ query: e.target.value }))}
            placeholder="Должность, навык, компания…"
            aria-label="Поиск вакансий"
          />
          {query ? (
            <button
              type="button"
              className={styles.clearBtn}
              aria-label="Очистить"
              onClick={() => dispatch(vacanciesActions.setFilters({ query: '' }))}
            >
              <IcClose size={16} />
            </button>
          ) : null}
        </div>
        <button type="button" className={styles.filtersBtn} onClick={() => setFiltersOpen(true)} aria-label="Фильтры" title="Фильтры">
          <IcFilter /> <span className={styles.filtersBtnText}>Фильтры</span>
          {activeFiltersCount > 0 ? <span className={styles.filtersCount}>{activeFiltersCount}</span> : null}
        </button>
      </div>

      <div className={styles.resultsHead}>
        <div className={styles.resultsCount}>
          Найдено <b>{rest.length}</b> вакансий
        </div>
        <div className={styles.resultsControls}>
          <label className={styles.hideViewed}>
            <input type="checkbox" checked={hideViewed} onChange={(e) => setHideViewed(e.target.checked)} />
            Скрыть просмотренные мной
          </label>
          <div className={styles.sortTabs} role="tablist">
            {(
              [
                ['match', 'По совпадению'],
                ['date', 'Новые'],
                ['salary', 'По зарплате'],
              ] as [Sort, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={sort === key}
                className={[styles.sortTab, sort === key ? styles.sortTabOn : ''].filter(Boolean).join(' ')}
                onClick={() => setSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }, (_, i) => (
            <BlockSkeleton key={i} height={150} />
          ))}
        </div>
      ) : rest.length === 0 ? (
        <div className={styles.empty}>
          По запросу ничего не нашли. Попробуй убрать пару фильтров.
          <br />
          <button type="button" className={styles.emptyReset} onClick={resetAll}>
            Сбросить фильтры →
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((v) => (
            <VacancyCard
              key={v.id}
              vacancy={v}
              applied={appliedIds.includes(v.id)}
              onOpen={() => openVacancy(v.id)}
              onCompany={openCompany}
            />
          ))}

          {rest.length > visibleCount ? (
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => setVisibleCount((n) => n + PAGE_STEP)}
            >
              Показать ещё {Math.min(PAGE_STEP, rest.length - visibleCount)} вакансий
            </button>
          ) : null}
        </div>
      )}
    </section>
  )

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        {isCompany ? (
          <div className={styles.layout} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            {center}
          </div>
        ) : (
          <div className={styles.layout}>
            <aside className={styles.sidebarLeft} aria-label="Подписки и подсказки">
              <SubscribedCompanies />
              <JobTipCard />
            </aside>

            {center}

            <aside className={styles.sidebarRight} aria-label="Отклики">
              <ApplicationsTracker />
            </aside>
          </div>
        )}
      </main>

      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={() => {
          setFiltersOpen(false)
          dispatch(vacanciesActions.showContactToast('Фильтры применены'))
        }}
      />
    </div>
  )
}
