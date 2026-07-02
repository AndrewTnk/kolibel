import { useAppSelector } from '../../../app/store/hooks'
import type { Resume } from '../../profile/model/types'
import type { Applicant, Vacancy } from '../model/types'
import type { NetworkPerson } from '../../network/model/types'
import { computeMatch, estimateYears, type MatchProfile } from './matching/engine'

export type { MatchBreakdown, MatchProfile, VacancyMatch } from './matching/engine'
export { computeMatch } from './matching/engine'

/** Резюме соискателя → профиль для матчинга. */
export function resumeToMatchProfile(resume: Resume): MatchProfile {
  return {
    skills: resume.skills,
    jobTitle: resume.jobTitle || resume.headline,
    about: resume.about,
    experienceText: resume.experience
      .map((e) => [e.role, e.company, e.summary, e.achievements, e.stack.join(' ')].join(' '))
      .join('  '),
    years: estimateYears(resume.experience),
  }
}

/** Отклик (кандидат у HR) → профиль для матчинга. */
export function applicantToMatchProfile(a: Applicant): MatchProfile {
  return {
    skills: a.skills ?? [],
    jobTitle: a.jobTitle,
    about: a.about,
    experienceText: (a.experience ?? []).map((e) => `${e.role} ${e.company}`).join('  '),
  }
}

/** Человек из сети (sourcing) → профиль для матчинга. */
export function personToMatchProfile(p: NetworkPerson): MatchProfile {
  return {
    skills: p.skills ?? [],
    jobTitle: p.jobTitle,
    about: p.about,
  }
}

/** Хук: совпадение вакансии с текущим профилем соискателя (полный профиль, не только навыки). */
export function useVacancyMatch(vacancy: Vacancy) {
  const resume = useAppSelector((s) => s.profile.resume)
  return computeMatch(vacancy, resumeToMatchProfile(resume))
}
