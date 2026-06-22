import type { MouseEvent } from 'react'
import type { Vacancy } from '../model/types'
import { formatPosted, formatSalary, vacancyMetaLine } from '../lib/labels'
import { useVacancyMatch } from '../lib/useVacancyMatch'
import { companyInitial } from '../lib/initials'
import { CompanyAvatar } from './CompanyAvatar'
import s from './Vacancies.module.css'

type Props = {
  vacancy: Vacancy
  applied: boolean
  onOpen: () => void
  /** Клик по названию компании (открыть превью компании). */
  onCompany?: (vacancy: Vacancy) => void
}

export function VacancyCard({ vacancy, applied, onOpen, onCompany }: Props) {
  const { score } = useVacancyMatch(vacancy)
  const visible = vacancy.skills.slice(0, 5)
  const overflow = vacancy.skills.length - visible.length

  function handleCompany(e: MouseEvent) {
    e.stopPropagation()
    onCompany?.(vacancy)
  }

  return (
    <button
      type="button"
      className={[s.vacCard, applied ? s.vacCardApplied : ''].filter(Boolean).join(' ')}
      onClick={onOpen}
    >
      <CompanyAvatar initial={companyInitial(vacancy.company)} logo={vacancy.companyLogo} className={s.vacAva} />

      <div className={s.vacBody}>
        <div className={s.vacTopLine}>
          <div>
            <h3 className={s.vacTitle}>{vacancy.title}</h3>
            <div className={s.vacCardCompany}>
              <span
                className={s.vacCompanyLink}
                onClick={handleCompany}
                role="link"
                tabIndex={-1}
              >
                {vacancy.company}
              </span>
              {vacancy.city ? <span> · {vacancy.city}</span> : null}
            </div>
            <div className={s.vacCardMeta}>{vacancyMetaLine(vacancy)}</div>
          </div>

          <div className={s.vacRight}>
            {applied ? <span className={s.appliedBadgeGreen}>✓ Отклик отправлен</span> : null}
            {score != null ? (
              <span className={s.matchPill}>
                <b>{score}%</b> мэтч
              </span>
            ) : null}
          </div>
        </div>

        <div className={s.vacSalary}>
          {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
        </div>

        {visible.length ? (
          <div className={s.vacSkills}>
            {visible.map((skill) => (
              <span key={skill} className={s.skill}>
                {skill}
              </span>
            ))}
            {overflow > 0 ? <span className={[s.skill, s.skillMore].join(' ')}>+{overflow}</span> : null}
          </div>
        ) : null}

        <div className={s.vacFoot}>
          <span>{formatPosted(vacancy.postedAt)}</span>
        </div>
      </div>
    </button>
  )
}
