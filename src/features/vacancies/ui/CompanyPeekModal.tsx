import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions, type SeekerCompanyPayload } from '../model/vacanciesSlice'
import { incrementVacancyView } from '../model/vacancyThunks'
import { toggleFollow } from '../../network/model/networkThunks'
import { formatSalary } from '../lib/labels'
import { fetchCompanyPeek, type CompanyPeekData } from '../lib/companyPeekApi'
import { isPublicVacancy } from '../lib/vacancyVisibility'
import { SeekerSheet } from './SeekerSheet'
import { Button } from '../../../shared/ui/Button/Button'
import { IcCheck, IcClose, IcExternal } from './icons'
import s from './Vacancies.module.css'

type Props = {
  payload: SeekerCompanyPayload
  onClose: () => void
}

const norm = (v: string) => v.trim().toLowerCase()

export function CompanyPeekModal({ payload, onClose }: Props) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const items = useAppSelector((st) => st.vacanciesList.items)
  const followingIds = useAppSelector((st) => st.network.followingIds)
  const followingPeople = useAppSelector((st) => st.network.followingPeople)
  const followers = useAppSelector((st) => st.network.followers)

  const [peek, setPeek] = useState<CompanyPeekData | null>(null)
  const [bannerBroken, setBannerBroken] = useState(false)

  // Баннер/фото/описание тянем из профиля компании (таблица companies).
  useEffect(() => {
    if (!payload.id) return
    let alive = true
    setBannerBroken(false)
    void fetchCompanyPeek(payload.id).then((d) => alive && setPeek(d))
    return () => {
      alive = false
    }
  }, [payload.id])

  const vacancies = items.filter(
    (v) =>
      isPublicVacancy(v) && (payload.id ? v.companyId === payload.id : v.company === payload.name),
  )
  const isFollowing = payload.id ? followingIds.includes(payload.id) : false

  // «Знакомых работают» — кто из моих связей указал эту компанию текущим местом работы.
  const known = useMemo(() => {
    const target = norm(payload.name)
    if (!target) return 0
    const ids = new Set<string>()
    for (const p of [...followingPeople, ...followers]) {
      if (p.company && norm(p.company) === target) ids.add(p.id)
    }
    return ids.size
  }, [followingPeople, followers, payload.name])

  const banner = bannerBroken ? undefined : peek?.banner
  const photo = peek?.avatar ?? payload.logo
  const about = peek?.about || payload.about
  // Актуальное название из companies (payload мог устареть после редактирования профиля).
  const companyName = peek?.name || payload.name

  function openVacancy(id: string) {
    onClose()
    dispatch(vacanciesActions.openVacancy(id))
    void dispatch(incrementVacancyView(id))
  }

  function goProfile() {
    if (!payload.id) return
    onClose()
    navigate(`/u/${payload.id}?from=vacancy`)
  }

  return (
    <SeekerSheet onClose={onClose} size="md" hideHeader>
      <div className={s.cpBody}>
        <div className={s.cpCover}>
          {banner ? (
            <img src={banner} alt="" className={s.cpCoverPic} onError={() => setBannerBroken(true)} />
          ) : null}
          <button type="button" className={s.cpCoverClose} aria-label="Закрыть" onClick={onClose}>
            <IcClose />
          </button>
        </div>

        <div className={[s.coAva, s.cpAva].join(' ')} aria-hidden>
          {photo ? <img src={photo} alt="" /> : payload.ava}
        </div>
        <div className={s.cpName}>{companyName}</div>
        <div className={s.cpRole}>{payload.sub || 'Компания'}</div>

        <div className={s.cpStats}>
          <div className={s.cpStat}>
            <div className={s.cpStatN}>{payload.openVacancies ?? vacancies.length}</div>
            <div className={s.cpStatL}>открытых вакансий</div>
          </div>
          <div className={s.cpStat}>
            <div className={s.cpStatN}>{known}</div>
            <div className={s.cpStatL}>знакомых работают</div>
          </div>
        </div>

        <p className={s.cpAbout}>
          {about ||
            'Компания пока не добавила описание. Откройте профиль, чтобы узнать больше о команде и продуктах.'}
        </p>

        <div className={s.cpActions}>
          <Button
            type="button"
            variant={isFollowing ? 'secondary' : 'primary'}
            fullWidth
            disabled={!payload.id}
            onClick={() => payload.id && dispatch(toggleFollow(payload.id))}
          >
            <IcCheck /> {isFollowing ? 'Вы подписаны' : 'Подписаться'}
          </Button>
          <Button type="button" variant="secondary" fullWidth disabled={!payload.id} onClick={goProfile}>
            <IcExternal /> Профиль компании
          </Button>
        </div>

        <div className={s.cpVacList}>
          <div className={s.cpVacListTitle}>Открытые вакансии</div>
          {vacancies.length ? (
            vacancies.map((v) => (
              <button key={v.id} type="button" className={s.cpVacItem} onClick={() => openVacancy(v.id)}>
                <span className={s.cpVacItemTitle}>{v.title}</span>
                <span className={s.cpVacItemSalary}>
                  {formatSalary(v.salaryFrom, v.salaryTo, v.currency)}
                </span>
              </button>
            ))
          ) : (
            <div className={s.modalEmpty}>Открытых вакансий пока нет</div>
          )}
        </div>
      </div>
    </SeekerSheet>
  )
}
