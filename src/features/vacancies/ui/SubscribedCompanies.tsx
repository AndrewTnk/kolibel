import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { loadNetwork } from '../../network/model/networkThunks'
import { companyInitial } from '../lib/initials'
import { companySubtitle } from '../lib/companyMeta'
import { newVacancyCount } from '../lib/companySeen'
import { CompanyAvatar } from './CompanyAvatar'
import { BlockSkeleton } from '../../../shared/ui/Skeleton/Skeleton'
import rec from '../../../shared/ui/Recommendations/Recommendations.module.css'
import s from './Vacancies.module.css'

/** Левый сайдбар: компании, на которые подписан пользователь, с бейджами новых вакансий. */
export function SubscribedCompanies() {
  const dispatch = useAppDispatch()
  const companies = useAppSelector((st) => st.network.followingCompanies)
  const networkStatus = useAppSelector((st) => st.network.status)
  const vacancies = useAppSelector((st) => st.vacanciesList.items)
  const seen = useAppSelector((st) => st.vacancies.companySeen)

  useEffect(() => {
    if (networkStatus === 'idle') void dispatch(loadNetwork())
  }, [networkStatus, dispatch])

  // Реальное число новых (за неделю, ещё не просмотренных) вакансий компании.
  const newOf = (id: string) => newVacancyCount(id, vacancies, seen[id] ?? 0)

  // Превью — первые 5, по убыванию числа новых вакансий.
  const preview = useMemo(
    () => [...companies].sort((a, b) => newOf(b.id) - newOf(a.id)).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companies, vacancies, seen],
  )

  if ((networkStatus === 'idle' || networkStatus === 'loading') && !companies.length) {
    return <BlockSkeleton height={220} />
  }

  function openCompany(id: string, name: string, sub: string, logo?: string) {
    dispatch(vacanciesActions.openCompany({ id, name, ava: companyInitial(name), sub, logo }))
  }

  return (
    <div className={rec.sideCard}>
      <div className={s.subwHead}>
        <div className={rec.sideTitle}>Компании в подписках</div>
        {companies.length ? (
          <button
            type="button"
            className={s.subwLink}
            onClick={() => dispatch(vacanciesActions.openCompaniesList())}
          >
            Все →
          </button>
        ) : null}
      </div>

      {preview.length ? (
        <div className={s.subwList}>
          {preview.map((c) => {
            const sub = companySubtitle(c)
            const newCount = newOf(c.id)
            return (
              <button
                key={c.id}
                type="button"
                className={s.subwItem}
                onClick={() => openCompany(c.id, c.name, sub, c.logo)}
              >
                <CompanyAvatar initial={companyInitial(c.name)} logo={c.logo} className={s.subwAva} />
                <div className={s.subwMeta}>
                  <div className={s.subwName}>{c.name}</div>
                  <div className={s.subwSub}>{sub}</div>
                </div>
                {newCount > 0 ? <span className={s.newBadge}>+{newCount}</span> : null}
              </button>
            )
          })}
        </div>
      ) : (
        <p className={s.subwSub} style={{ whiteSpace: 'normal' }}>
          Подпишитесь на компании — они появятся здесь с новыми вакансиями.
        </p>
      )}
    </div>
  )
}
