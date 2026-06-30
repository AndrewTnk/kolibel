import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { incrementVacancyView, loadVacancies } from '../../../features/vacancies/model/vacancyThunks'
import { vacanciesActions } from '../../../features/vacancies/model/vacanciesSlice'
import { formatSalary } from '../../../features/vacancies/lib/labels'
import { isPublicVacancy } from '../../../features/vacancies/lib/vacancyVisibility'
import type { Vacancy } from '../../../features/vacancies/model/types'
import { RecSkeleton } from './RecSkeleton'
import { RecPager } from './RecPager'
import { HScroll } from '../HScroll/HScroll'
import { useIsMobile } from '../../lib/useMediaQuery'
import styles from './Recommendations.module.css'

function VacancyRow({ v }: { v: Vacancy }) {
  const dispatch = useAppDispatch()
  return (
    <button
      type="button"
      className={styles.sideItem}
      onClick={() => {
        dispatch(vacanciesActions.openVacancy(v.id))
        void dispatch(incrementVacancyView(v.id))
      }}
    >
      <div className={styles.sideItemTitle}>{v.title}</div>
      <div className={styles.sideItemSub}>
        {v.company} · {formatSalary(v.salaryFrom, v.salaryTo, v.currency)}
      </div>
    </button>
  )
}

/** Плитка вакансии для мобильной карусели — в стиле статей (коралловый заголовок,
 *  название компании цветом текста, зарплата серым снизу, если указана). */
function VacancyTile({ v }: { v: Vacancy }) {
  const dispatch = useAppDispatch()
  const hasSalary = Boolean(v.salaryFrom || v.salaryTo)
  return (
    <button
      type="button"
      className={styles.vacTile}
      onClick={() => {
        dispatch(vacanciesActions.openVacancy(v.id))
        void dispatch(incrementVacancyView(v.id))
      }}
    >
      <div className={styles.vacLogo} aria-hidden>
        {v.companyLogo ? <img src={v.companyLogo} alt="" /> : v.company.charAt(0) || '?'}
      </div>
      <div className={styles.vacBody}>
        <span className={styles.vacTitle}>{v.title}</span>
        <span className={styles.vacCompany}>{v.company}</span>
        {hasSalary ? (
          <span className={styles.vacSalary}>{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</span>
        ) : null}
      </div>
    </button>
  )
}

export function RecommendedVacancies({ horizontal = false }: { horizontal?: boolean }) {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const hcarousel = horizontal || isMobile
  const vacancies = useAppSelector((s) => s.vacanciesList.items)
  const loaded = useAppSelector((s) => s.vacanciesList.loaded)
  // Рекомендуем только активные (пауза/черновик/закрытая скрыты).
  const list = vacancies.filter(isPublicVacancy)

  useEffect(() => {
    if (!vacancies.length) void dispatch(loadVacancies())
  }, [vacancies.length, dispatch])

  if (!list.length) {
    if (!loaded) return <RecSkeleton />
    return null
  }

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideTitle}>Рекомендованные вакансии</div>

      {hcarousel ? (
        <HScroll>
          {list.slice(0, 10).map((v) => (
            <VacancyTile key={v.id} v={v} />
          ))}
        </HScroll>
      ) : (
        <RecPager items={list} perPage={3} renderItem={(v) => <VacancyRow key={v.id} v={v} />} />
      )}

      {!hcarousel ? (
        <Link className={styles.recShowAll} to="/vacancies">
          Посмотреть все →
        </Link>
      ) : null}
    </div>
  )
}
