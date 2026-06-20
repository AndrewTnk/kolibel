import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { applyToVacancy } from '../model/vacancyThunks'
import type { Vacancy } from '../model/types'
import { formatSalary, workFormatLabels } from '../lib/labels'
import { useVacancyMatch } from '../lib/useVacancyMatch'
import { companyInitial, nameInitials } from '../lib/initials'
import { CompanyAvatar } from './CompanyAvatar'
import { SeekerSheet } from './SeekerSheet'
import { Button } from '../../../shared/ui/Button/Button'
import { IcCheck } from './icons'
import s from './Vacancies.module.css'

type Props = {
  vacancy: Vacancy
  onClose: () => void
}

export function ApplyModal({ vacancy, onClose }: Props) {
  const dispatch = useAppDispatch()
  const resume = useAppSelector((st) => st.profile.resume)
  const { matchedSkills } = useVacancyMatch(vacancy)

  const [cover, setCover] = useState(
    `Здравствуйте! Меня заинтересовала вакансия «${vacancy.title}» в ${vacancy.company}.\n\n` +
      `Что хочу подсветить: ${matchedSkills.slice(0, 2).join(' / ') || 'мой опыт'} — это основная часть моих последних проектов. С удовольствием расскажу подробнее на созвоне.`,
  )

  function submit() {
    void dispatch(applyToVacancy(vacancy.id))
    dispatch(vacanciesActions.openApplied(vacancy.id))
  }

  const resumeName = resume.fullName || 'Ваше резюме'

  return (
    <SeekerSheet
      onClose={onClose}
      size="sm"
      title="Отклик на вакансию"
      subtitle={`${vacancy.title} · ${vacancy.company}`}
      footerLeft={
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      }
      footer={
        <Button type="button" onClick={submit}>
          <IcCheck /> Отправить отклик
        </Button>
      }
    >
      <div className={s.mBody}>
        <div className={s.applyCtx}>
          <CompanyAvatar initial={companyInitial(vacancy.company)} className={s.applyCtxAva} />
          <div style={{ minWidth: 0 }}>
            <div className={s.applyCtxName}>{vacancy.title}</div>
            <div className={s.applyCtxCo}>
              {vacancy.company} · {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)} ·{' '}
              {vacancy.workFormats.map((f) => workFormatLabels[f]).join('/')}
            </div>
          </div>
        </div>

        <div className={s.applyResume}>
          <div className={[s.coAva, s.applyResumeAva].join(' ')} aria-hidden>
            {resume.avatar ? <img src={resume.avatar} alt="" /> : nameInitials(resumeName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className={s.applyResumeName}>{resumeName}</div>
            <div className={s.applyResumeMeta}>
              {[resume.jobTitle, resume.headline].filter(Boolean).join(' · ') || 'Профиль соискателя'}
            </div>
          </div>
        </div>

        <div className={s.fieldBlock}>
          <label className={s.fieldLabel} htmlFor="apply-cover">
            Сопроводительное письмо
          </label>
          <div className={s.fieldHint}>HR-менеджер увидит это сообщение первым. Можно опустить.</div>
          <textarea
            id="apply-cover"
            className={s.textarea}
            rows={7}
            value={cover}
            onChange={(e) => setCover(e.target.value)}
          />
        </div>
      </div>
    </SeekerSheet>
  )
}
