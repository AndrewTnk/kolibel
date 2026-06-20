import { useAppDispatch } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import type { Vacancy } from '../model/types'
import { formatSalary } from '../lib/labels'
import { companyInitial } from '../lib/initials'
import { CompanyAvatar } from './CompanyAvatar'
import { SeekerSheet } from './SeekerSheet'
import { Button } from '../../../shared/ui/Button/Button'
import { IcBriefcase, IcCheck } from './icons'
import s from './Vacancies.module.css'

type Props = {
  vacancy: Vacancy
  onClose: () => void
}

export function ApplySuccessModal({ vacancy, onClose }: Props) {
  const dispatch = useAppDispatch()

  return (
    <SeekerSheet
      onClose={onClose}
      size="sm"
      hideHeader
      footerLeft={
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      }
      footer={
        <Button type="button" onClick={() => dispatch(vacanciesActions.openApplications())}>
          <IcBriefcase /> Мои отклики
        </Button>
      }
    >
      <div className={s.successBody}>
        <div className={s.successIcon}>
          <IcCheck size={32} />
        </div>
        <div className={s.successTitle}>Отклик отправлен!</div>
        <div className={s.successSub}>
          HR команды <b>{vacancy.company}</b> увидит ваш отклик в течение дня. Ответ обычно приходит за
          2–3 рабочих дня.
        </div>
        <div className={s.successCard}>
          <CompanyAvatar initial={companyInitial(vacancy.company)} className={s.applyCtxAva} />
          <div style={{ minWidth: 0 }}>
            <div className={s.applyCtxName}>{vacancy.title}</div>
            <div className={s.applyCtxCo}>
              {vacancy.company} · {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
            </div>
          </div>
        </div>
      </div>
    </SeekerSheet>
  )
}
