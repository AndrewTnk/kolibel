import { useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { companyInitial } from '../lib/initials'
import { companySubtitle } from '../lib/companyMeta'
import { newVacancyCount } from '../lib/companySeen'
import { CompanyAvatar } from './CompanyAvatar'
import { SeekerSheet } from './SeekerSheet'
import { IcSearch } from './icons'
import s from './Vacancies.module.css'

type Props = {
  onClose: () => void
}

export function SubscribedCompaniesListModal({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const companies = useAppSelector((st) => st.network.followingCompanies)
  const vacancies = useAppSelector((st) => st.vacanciesList.items)
  const seen = useAppSelector((st) => st.vacancies.companySeen)
  const [q, setQ] = useState('')

  const newOf = (id: string) => newVacancyCount(id, vacancies, seen[id] ?? 0)
  const totalNew = useMemo(
    () => companies.reduce((n, c) => n + newOf(c.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companies, vacancies, seen],
  )

  const filtered = companies.filter((c) =>
    !q.trim() ? true : `${c.name} ${c.field} ${c.location}`.toLowerCase().includes(q.toLowerCase()),
  )

  function openCompany(id: string, name: string, sub: string, logo?: string) {
    onClose()
    dispatch(
      vacanciesActions.openCompany({ id, name, ava: companyInitial(name), sub, logo }),
    )
  }

  return (
    <SeekerSheet
      onClose={onClose}
      size="md"
      title="Компании в подписках"
      subtitle={`Всего ${companies.length} · ${totalNew} новых вакансий за неделю`}
    >
      <div className={s.mBody}>
        <div className={s.subSearch}>
          <span className={s.subSearchIcon} aria-hidden>
            <IcSearch size={16} />
          </span>
          <input
            className={[s.control, s.subSearchInput].join(' ')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по подпискам…"
          />
        </div>

        {filtered.length ? (
          <div className={s.subRowList}>
            {filtered.map((c) => {
              const sub = companySubtitle(c)
              const newCount = newOf(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={s.subRow}
                  onClick={() => openCompany(c.id, c.name, sub, c.logo)}
                >
                  <CompanyAvatar initial={companyInitial(c.name)} logo={c.logo} className={s.subRowAva} />
                  <div className={s.subRowMeta}>
                    <div className={s.subRowName}>{c.name}</div>
                    <div className={s.subRowSub}>{sub}</div>
                  </div>
                  {newCount > 0 ? (
                    <span className={s.newBadge}>+{newCount} новых</span>
                  ) : (
                    <span className={s.newBadgeMuted}>нет новых</span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className={s.modalEmpty}>
            {companies.length ? 'По запросу ничего не нашли' : 'Вы пока не подписаны на компании.'}
          </div>
        )}
      </div>
    </SeekerSheet>
  )
}
