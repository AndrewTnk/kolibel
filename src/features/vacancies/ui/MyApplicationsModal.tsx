import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { loadMyApplicationsDetailed, incrementVacancyView } from '../model/vacancyThunks'
import type { MyApplicationStatus } from '../model/types'
import { formatPosted } from '../lib/labels'
import { CompanyAvatar } from './CompanyAvatar'
import { SeekerSheet } from './SeekerSheet'
import s from './Vacancies.module.css'

const BADGE: Record<MyApplicationStatus, { label: string; cls: string }> = {
  sent: { label: 'Отклик отправлен', cls: s.appBadgeSent },
  rejected: { label: 'Отказ', cls: s.appBadgeRejected },
  closed: { label: 'Закрыто', cls: s.appBadgeClosed },
}

type Props = {
  onClose: () => void
}

export function MyApplicationsModal({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const apps = useAppSelector((st) => st.vacancies.myApplications)
  const items = useAppSelector((st) => st.vacanciesList.items)

  useEffect(() => {
    void dispatch(loadMyApplicationsDetailed())
  }, [dispatch])

  function openVacancy(vacancyId: string) {
    if (!items.some((v) => v.id === vacancyId)) return // вакансия закрыта — открывать нечего
    onClose()
    dispatch(vacanciesActions.openVacancy(vacancyId))
    void dispatch(incrementVacancyView(vacancyId))
  }

  return (
    <SeekerSheet
      onClose={onClose}
      size="md"
      title="Мои отклики"
      subtitle={`Всего: ${apps.length}`}
      fullScreenMobile
    >
      <div className={s.mBody}>
        {apps.length ? (
          <div className={s.appList}>
            {apps.map((a) => {
              const badge = BADGE[a.status]
              const closed = a.status === 'closed'
              const inner = (
                <>
                  <CompanyAvatar initial={a.companyInitials} logo={a.companyLogo} className={s.appRowAva} />
                  <div className={s.appRowMeta}>
                    <div className={s.appRowTitle}>{a.vacancyTitle}</div>
                    <div className={s.appRowCo}>
                      {a.company} · {formatPosted(a.appliedAt)}
                    </div>
                  </div>
                  <span className={[s.appBadge, badge.cls].join(' ')}>{badge.label}</span>
                </>
              )
              // Закрытая вакансия — неактивная, не кликается.
              return closed ? (
                <div key={a.id} className={[s.appRow, s.appRowClosed].join(' ')} aria-disabled>
                  {inner}
                </div>
              ) : (
                <button
                  key={a.id}
                  type="button"
                  className={s.appRow}
                  onClick={() => openVacancy(a.vacancyId)}
                >
                  {inner}
                </button>
              )
            })}
          </div>
        ) : (
          <div className={s.modalEmpty}>Вы ещё не откликались на вакансии.</div>
        )}
      </div>
    </SeekerSheet>
  )
}
