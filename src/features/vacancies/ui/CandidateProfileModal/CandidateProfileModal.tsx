import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Applicant } from '../../model/types'
import type { NetworkPerson } from '../../../network/model/types'
import { CompanyBadge } from '../../../../shared/ui/CompanyBadge/CompanyBadge'
import { CandidateWarmthBadge } from '../CandidateWarmthBadge/CandidateWarmthBadge'
import { Markdown } from '../../../../shared/ui/Markdown/Markdown'
import styles from './CandidateProfileModal.module.css'

/** Нормализованное резюме кандидата — общее для откликов и рекомендаций. */
export type CandidateProfile = {
  /** id профиля для чата и перехода (auth.user.id кандидата). */
  userId: string
  name: string
  jobTitle: string
  location?: string
  avatarInitials: string
  avatar?: string
  /** Текущая компания и её лого (бейдж рядом с именем). */
  company?: string
  companyLogo?: string
  about?: string
  skills: string[]
  /** Подмножество skills, совпавших с вакансией (подсветка). */
  matchedSkills?: string[]
  /** Процент совпадения (мок). null — кольцо не рисуем. */
  score?: number | null
  experience?: {
    role: string
    company: string
    companyLogo?: string
    period: string
    summary?: string
    achievements?: string
    stack?: string[]
  }[]
  /** Если кандидат — отклик: на какую вакансию. */
  appliedFor?: string
  /** Подпись времени отклика («2 ч назад»). */
  appliedAt?: string
  /** Сопроводительное письмо (только у откликов). */
  coverLetter?: string
}

/** Кандидат из реального отклика → нормализованный профиль. */
export function applicantToCandidate(a: Applicant, opts?: { matchedSkills?: string[]; score?: number | null; appliedFor?: string }): CandidateProfile {
  return {
    userId: a.userId,
    name: a.name,
    jobTitle: a.jobTitle || 'Кандидат',
    location: a.location,
    avatarInitials: a.avatarInitials,
    avatar: a.avatar,
    company: a.company,
    companyLogo: a.companyLogo,
    about: a.about,
    skills: a.skills ?? [],
    matchedSkills: opts?.matchedSkills,
    score: opts?.score,
    experience: a.experience,
    appliedFor: opts?.appliedFor,
    coverLetter: a.note,
  }
}

/** Рекомендованный человек → нормализованный профиль кандидата. */
export function personToCandidate(p: NetworkPerson, opts?: { matchedSkills?: string[]; score?: number | null }): CandidateProfile {
  return {
    userId: p.id,
    name: p.fullName,
    jobTitle: [p.jobTitle, p.company].filter(Boolean).join(' · ') || 'Специалист',
    location: p.location,
    avatarInitials: p.avatarInitials,
    avatar: p.avatar,
    company: p.company,
    companyLogo: p.companyLogo,
    about: p.about,
    skills: p.skills ?? [],
    matchedSkills: opts?.matchedSkills,
    score: opts?.score,
  }
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function RejectIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/** Строка опыта с раскрытием «чем занимался» (summary/достижения/стек из профиля). */
function ExpRow({ e }: { e: NonNullable<CandidateProfile['experience']>[number] }) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!(e.summary?.trim() || e.achievements?.trim() || e.stack?.length)
  return (
    <div className={styles.expItem}>
      <div className={styles.expDot} aria-hidden>
        {e.companyLogo ? (
          <img className={styles.expDotImg} src={e.companyLogo} alt="" />
        ) : (
          (e.company || '?').slice(0, 1).toUpperCase()
        )}
      </div>
      <div>
        <div className={styles.expRole}>{e.role}</div>
        <div className={styles.expCo}>{[e.company, e.period].filter(Boolean).join(' · ')}</div>

        {hasDetail && open ? (
          <div className={styles.expDetail}>
            {e.summary?.trim() ? <div className={styles.expSummary}>{e.summary}</div> : null}
            {e.achievements?.trim() ? (
              <Markdown className={styles.expAch}>{e.achievements}</Markdown>
            ) : null}
            {e.stack?.length ? (
              <div className={styles.expStack}>
                {e.stack.map((s) => (
                  <span key={s} className={styles.expChip}>
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasDetail ? (
          <button
            type="button"
            className={[styles.expToggle, open ? styles.expToggleOpen : ''].filter(Boolean).join(' ')}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Свернуть' : 'Чем занимался'} <ChevronIcon />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function CandidateProfileModal({
  candidate,
  onWrite,
  onReject,
  onClose,
}: {
  candidate: CandidateProfile
  /** Открыть WriteModal для этого кандидата. */
  onWrite: (c: CandidateProfile) => void
  /** Отклонить кандидата (контекст ATS — открывает RejectModal). Не задан — кнопка не показывается. */
  onReject?: (c: CandidateProfile) => void
  onClose: () => void
}) {
  const c = candidate
  const nav = useNavigate()
  const isApplication = !!c.appliedFor
  const matched = new Set((c.matchedSkills ?? []).map((s) => s.toLowerCase()))

  function openProfile() {
    onClose()
    nav(`/u/${c.userId}?from=vacancy`)
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className={styles.scrim} onClick={onClose} role="dialog" aria-modal aria-label={`Резюме · ${c.name}`}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div>
            <div className={styles.headTitle}>{isApplication ? 'Отклик на вакансию' : 'Профиль кандидата'}</div>
            <div className={styles.headSub}>
              {isApplication ? `На «${c.appliedFor}»` : 'Рекомендован под твою вакансию'}
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.hero}>
            {c.avatar ? (
              <img className={styles.ava} src={c.avatar} alt="" />
            ) : (
              <div className={styles.ava}>{c.avatarInitials}</div>
            )}
            <div className={styles.heroMeta}>
              <div className={styles.name}>
                {c.name}
                <CompanyBadge logo={c.companyLogo} title={c.company} size={16} />
              </div>
              <div className={styles.role}>{c.jobTitle}</div>
              {c.location ? <div className={styles.loc}>{c.location}</div> : null}
            </div>
            {c.score != null ? (
              <div className={styles.scoreBox}>
                <div className={styles.scoreRing} style={{ '--p': `${c.score}%` } as React.CSSProperties}>
                  <span>{c.score}%</span>
                </div>
                <div className={styles.scoreLab}>совпадение</div>
              </div>
            ) : null}
          </div>

          <div className={styles.metaRow}>
            {c.appliedAt ? (
              <span className={styles.metaPill}>
                <span className={styles.metaIco}><ClockIcon /></span> {c.appliedAt}
              </span>
            ) : null}
            {c.location ? (
              <span className={styles.metaPill}>
                <span className={styles.metaIco}><PinIcon /></span> {c.location.split(' · ')[0]}
              </span>
            ) : null}
            <CandidateWarmthBadge candidateId={c.userId} />
          </div>

          {isApplication && c.coverLetter?.trim() ? (
            <div className={styles.section}>
              <div className={styles.secTitle}>Сопроводительное письмо</div>
              <div className={styles.cover}>{c.coverLetter}</div>
            </div>
          ) : null}

          {c.about ? (
            <div className={styles.section}>
              <div className={styles.secTitle}>О кандидате</div>
              <div className={styles.about}>{c.about}</div>
            </div>
          ) : null}

          {c.skills.length ? (
            <div className={styles.section}>
              <div className={styles.secTitle}>
                Навыки
                {c.matchedSkills?.length ? ` · ${c.matchedSkills.length} совпали` : ''}
              </div>
              <div className={styles.skills}>
                {c.skills.map((s) => (
                  <span key={s} className={[styles.chip, matched.has(s.toLowerCase()) ? styles.chipMatch : ''].filter(Boolean).join(' ')}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {c.experience?.length ? (
            <div className={styles.section}>
              <div className={styles.secTitle}>Опыт работы</div>
              <div className={styles.exp}>
                {c.experience.map((e, i) => (
                  <ExpRow key={i} e={e} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.foot}>
          {onReject ? (
            <button type="button" className={styles.danger} onClick={() => onReject(c)} aria-label="Отклонить" title="Отклонить">
              <RejectIcon /> <span className={styles.btnLabel}>Отклонить</span>
            </button>
          ) : null}
          <button type="button" className={styles.ghost} onClick={openProfile} aria-label="Открыть профиль" title="Открыть профиль">
            <ProfileIcon /> <span className={styles.btnLabel}>Открыть профиль</span>
          </button>
          <button type="button" className={styles.primary} onClick={() => onWrite(c)} aria-label="Написать кандидату" title="Написать кандидату">
            <SendIcon /> <span className={styles.btnLabel}>Написать кандидату</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
