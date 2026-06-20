import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import { incrementVacancyView } from '../model/vacancyThunks'
import { formatPosted, formatSalary, vacancyMetaLine } from '../lib/labels'
import { useVacancyMatch } from '../lib/useVacancyMatch'
import { companyInitial } from '../lib/initials'
import { CompanyAvatar } from './CompanyAvatar'
import { Button } from '../../../shared/ui/Button/Button'
import { Markdown } from '../../../shared/ui/Markdown/Markdown'
import { IcArrow, IcBriefcase, IcChat, IcCheck, IcClose, IcDoc, IcMail, IcTelegram } from './icons'
import s from './Vacancies.module.css'

type Tab = 'about' | 'match' | 'company' | 'contacts'

export function VacancyModal() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const open = useAppSelector((st) => st.vacancies.modalOpen)
  const selectedId = useAppSelector((st) => st.vacancies.selectedId)
  const appliedIds = useAppSelector((st) => st.vacancies.appliedIds)
  const items = useAppSelector((st) => st.vacanciesList.items)

  const vacancy = items.find((v) => v.id === selectedId)
  const applied = vacancy ? appliedIds.includes(vacancy.id) : false
  const [tab, setTab] = useState<Tab>('about')
  const match = useVacancyMatch(vacancy ?? ({ id: '', skills: [] } as never))

  useEffect(() => {
    if (open) setTab('about')
  }, [open, selectedId])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dispatch(vacanciesActions.closeModal())
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [dispatch, open])

  if (!open || !vacancy) return null

  const close = () => dispatch(vacanciesActions.closeModal())

  const otherVacancies = vacancy.companyId
    ? items.filter((v) => v.companyId === vacancy.companyId && v.id !== vacancy.id).slice(0, 3)
    : []

  function openCompany() {
    if (!vacancy!.companyId) return
    close()
    navigate(`/u/${vacancy!.companyId}?from=vacancy`)
  }

  function openVacancy(id: string) {
    dispatch(vacanciesActions.openVacancy(id))
    void dispatch(incrementVacancyView(id))
  }

  return createPortal(
    <div className={[s.scrim, s.vdScrim].join(' ')} onClick={close}>
      <div
        className={[s.sheet, s.vdSheet].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vacancy-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.vdHead}>
          <button type="button" className={[s.mClose, s.vdClose].join(' ')} aria-label="Закрыть" onClick={close}>
            <IcClose />
          </button>
          <div className={s.vdTopLine}>
            <CompanyAvatar initial={companyInitial(vacancy.company)} className={s.vdAva} />
            <div className={s.vdTitleArea}>
              <div id="vacancy-modal-title" className={s.vdTitle}>
                {vacancy.title}
              </div>
              <span className={s.vdCompany} onClick={openCompany}>
                {vacancy.company}
                {vacancy.city ? ` · ${vacancy.city}` : ''}
              </span>
              <div className={s.vdMetaText}>{vacancyMetaLine(vacancy)}</div>
              <div className={s.vdSalary}>
                {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
              </div>
              <div className={s.vdMetaRow}>
                <span className={s.metaTag}>{formatPosted(vacancy.postedAt)}</span>
              </div>
            </div>
            {match.score != null ? (
              <div className={s.ring} style={{ ['--p' as string]: `${match.score}%` }}>
                <div className={s.ringInner}>
                  <div>
                    <div className={s.ringPct}>{match.score}%</div>
                    <div className={s.ringLab}>мэтч</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={s.vdTabs}>
          {(
            [
              ['about', 'Описание', <IcDoc />],
              ['match', 'Почему подходит', <IcCheck size={16} />],
              ['company', 'Компания', <IcBriefcase size={16} />],
              ['contacts', 'Контакты', <IcMail size={16} />],
            ] as [Tab, string, React.ReactElement][]
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              className={[s.vdTab, tab === key ? s.vdTabOn : ''].filter(Boolean).join(' ')}
              onClick={() => setTab(key)}
              aria-label={label}
              title={label}
            >
              <span className={s.vdTabIco} aria-hidden>{icon}</span>
              <span className={s.vdTabText}>{label}</span>
            </button>
          ))}
        </div>

        <div className={s.mBody} style={{ padding: 0 }}>
          {tab === 'about' ? (
            <>
              <div className={s.vdSection}>
                <div className={s.vdSectionTitle}>Описание</div>
                <Markdown className={s.vdText}>{vacancy.description}</Markdown>
              </div>
              {vacancy.requirements.length ? (
                <div className={s.vdSection}>
                  <div className={s.vdSectionTitle}>Что важно</div>
                  <ul className={s.vdList}>
                    {vacancy.requirements.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {vacancy.conditions.length ? (
                <div className={s.vdSection}>
                  <div className={s.vdSectionTitle}>Условия</div>
                  <ul className={s.vdList}>
                    {vacancy.conditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {vacancy.skills.length ? (
                <div className={s.vdSection}>
                  <div className={s.vdSectionTitle}>Навыки</div>
                  <div className={s.vdSkills}>
                    {vacancy.skills.map((skill) => (
                      <span key={skill} className={s.skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'match' ? (
            <div className={s.vdSection} style={{ borderBottom: 0 }}>
              <div className={s.vdSectionTitle} style={{ marginBottom: 14 }}>
                Совпадение: {match.score ?? '—'}%
              </div>
              <div className={s.vdMatchBreakdown}>
                {(
                  [
                    ['Специальность', match.breakdown.role],
                    ['Навыки', match.breakdown.skills],
                    ['Ключевые слова', match.breakdown.keywords],
                    ['Опыт', match.breakdown.exp],
                  ] as const
                ).map(([label, row]) => (
                  <div key={label} className={s.vdMatchRow}>
                    <div className={s.vdMatchLabel}>{label}</div>
                    <div className={s.vdBar}>
                      <i style={{ width: `${row.pct}%` }} />
                    </div>
                    <div className={s.vdMatchValue}>{row.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'company' ? (
            <>
              <div className={s.vdSection}>
                <div className={s.vdSectionTitle}>О компании</div>
                <p className={s.vdText} style={{ margin: 0 }}>
                  {vacancy.companyAbout || `Профиль компании «${vacancy.company}».`}
                </p>
              </div>
              <div className={s.vdSection}>
                <div className={s.vdSectionTitle}>Другие вакансии</div>
                {otherVacancies.length ? (
                  <div className={s.cpVacList}>
                    {otherVacancies.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={s.cpVacItem}
                        onClick={() => openVacancy(v.id)}
                      >
                        <span className={s.cpVacItemTitle}>{v.title}</span>
                        <span className={s.cpVacItemSalary}>
                          {formatSalary(v.salaryFrom, v.salaryTo, v.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={s.vdText} style={{ margin: 0, color: 'var(--muted)' }}>
                    Других открытых вакансий пока нет.
                  </p>
                )}
              </div>
            </>
          ) : null}

          {tab === 'contacts' ? (
            <div className={s.vdSection} style={{ borderBottom: 0 }}>
              <div className={s.vdSectionTitle}>HR-контакты</div>
              <div className={s.contacts}>
                {vacancy.contactEmail ? (
                  <a className={s.contactChip} href={`mailto:${vacancy.contactEmail}`}>
                    <IcMail /> {vacancy.contactEmail}
                  </a>
                ) : null}
                {vacancy.contactTelegram ? (
                  <a
                    className={s.contactChip}
                    href={`https://t.me/${vacancy.contactTelegram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IcTelegram /> {vacancy.contactTelegram}
                  </a>
                ) : null}
              </div>
              <p className={s.noteText}>Контакты появляются после отклика или подписки на вакансию.</p>
            </div>
          ) : null}
        </div>

        <div className={s.mFoot}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              close()
              dispatch(vacanciesActions.openContact(vacancy.id))
            }}
          >
            <IcChat /> Связаться
          </Button>
          {applied ? (
            <Button type="button" variant="secondary" disabled>
              <IcCheck /> Отклик отправлен
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                close()
                dispatch(vacanciesActions.openApply(vacancy.id))
              }}
            >
              Откликнуться <IcArrow />
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
