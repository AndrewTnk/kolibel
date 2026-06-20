import { useMemo, useRef } from 'react'
import { useAppSelector } from '../../../app/store/hooks'
import { resumeToMatchProfile, type MatchProfile } from '../../vacancies/lib/useVacancyMatch'
import type { Vacancy } from '../../vacancies/model/types'
import {
  norm,
  tokenize,
  scorePeople,
  scoreCompanies,
  loadRecentlyShown,
  pushRecentlyShown,
  type RecContext,
  type ScoredPerson,
  type ScoredCompany,
} from './recommend'

/**
 * Общий хук рекомендаций сети — собирает `RecContext` из стора и считает score
 * людей/компаний (см. `recommend.ts`). Используется во всех блоках рекомендаций
 * (вкладка «Сеть», главная, профиль), чтобы система была единой.
 *
 * Свежесть: `seedRef` (новый псевдослучайный сид на каждый монтаж компонента =
 * на переход/перезагрузку страницы) + снимок «недавно показанных» из прошлой
 * загрузки. Каждый блок сам решает, что показать (`spread`+`slice`) и что
 * запомнить (`recordShown`).
 */
export function useRecommendations(): {
  scoredPeople: ScoredPerson[]
  scoredCompanies: ScoredCompany[]
  recordShown: (ids: string[]) => void
} {
  const audience = useAppSelector((s) => (s.account.type === 'company' ? 'company' : 'user'))
  const myId = useAppSelector((s) => s.auth.user?.id)
  const resume = useAppSelector((s) => s.profile.resume)
  const companyProfile = useAppSelector((s) => s.company.profile)
  const vacancies = useAppSelector((s) => s.vacanciesList.items)
  const people = useAppSelector((s) => s.network.recommendedPeople)
  const companies = useAppSelector((s) => s.network.recommendedCompanies)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const followingSet = useMemo(() => new Set(followingIds), [followingIds])

  const seedRef = useRef((Math.random() * 2 ** 31) | 0)
  const recentRef = useRef(loadRecentlyShown())

  const ctx = useMemo<RecContext>(() => {
    const mySkills = new Set<string>()
    const myRoleTokens = new Set<string>()
    let myProfile: MatchProfile | undefined
    const myVacancies: Vacancy[] = []
    const vacanciesByCompany = new Map<string, Vacancy[]>()

    if (audience === 'company') {
      tokenize(companyProfile.industry).forEach((t) => myRoleTokens.add(t))
      companyProfile.directions.forEach((d) => tokenize(d.title).forEach((t) => myRoleTokens.add(t)))
      for (const v of vacancies)
        if (v.companyId && myId && v.companyId === myId) {
          myVacancies.push(v)
          v.skills.forEach((s) => mySkills.add(norm(s)))
        }
    } else {
      resume.skills.forEach((s) => mySkills.add(norm(s)))
      tokenize(resume.jobTitle || resume.headline || '').forEach((t) => myRoleTokens.add(t))
      myProfile = resumeToMatchProfile(resume)
      for (const v of vacancies)
        if (v.companyId) {
          const arr = vacanciesByCompany.get(v.companyId) ?? []
          arr.push(v)
          vacanciesByCompany.set(v.companyId, arr)
        }
    }

    return {
      audience,
      myId,
      followingIds: followingSet,
      mySkills,
      myRoleTokens,
      myProfile,
      myVacancies,
      vacanciesByCompany,
      seed: seedRef.current,
      recentlyShown: recentRef.current,
    }
  }, [audience, myId, followingSet, companyProfile, resume, vacancies])

  const scoredPeople = useMemo(() => scorePeople(people, ctx), [people, ctx])
  const scoredCompanies = useMemo(() => scoreCompanies(companies, ctx), [companies, ctx])

  return { scoredPeople, scoredCompanies, recordShown: pushRecentlyShown }
}
