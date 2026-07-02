import { useAppSelector } from '../../../../app/store/hooks'
import type { ContactLink, ExperienceItem, Resume } from '../../model/types'
import type { ProfileModalState } from './ProfileModals'
import { contactHref } from '../../lib/contactHref'
import { formatExperience, totalExperienceMonths } from '../../lib/period'
import { Markdown } from '../../../../shared/ui/Markdown/Markdown'
import { Ic } from './icons'
import s from './ProfileSheet.module.css'

export type SectionId = 'about' | 'experience' | 'education' | 'skills' | 'languages' | 'contacts'

export const DEFAULT_LAYOUT: SectionId[] = ['about', 'experience', 'education', 'skills', 'languages', 'contacts']

const ASIDE: SectionId[] = ['contacts', 'languages', 'skills']
const MAIN: SectionId[] = ['about', 'experience', 'education']

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}

function contactIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('mail') || l.includes('почт') || l.includes('email')) return <Ic.mail />
  if (l.includes('телефон') || l.includes('phone') || l.includes('тел')) return <Ic.phone />
  if (l.includes('tg') || l.includes('telegram') || l.includes('телеграм')) return <Ic.tg />
  if (l.includes('git')) return <Ic.github />
  if (l.includes('сайт') || l.includes('site') || l.includes('портфол') || l.includes('web')) return <Ic.globe />
  if (l.includes('vk') || l.includes('вконтакте')) return <Ic.vk />
  return <Ic.link />
}

type Props = {
  expanded: boolean
  onToggle: () => void
  layout: SectionId[]
  open: (modal: ProfileModalState) => void
  /** Данные резюме (просмотр чужого). По умолчанию — из стора (свой). */
  resume?: Resume
  /** Режим просмотра: без редактирования; пустые секции скрыты. */
  readOnly?: boolean
}

function SecHead({ title, meta, onEdit, onAdd }: { title: string; meta?: string; onEdit?: () => void; onAdd?: () => void }) {
  return (
    <div className={s.secHead}>
      <span className={s.secTitle}>{title}</span>
      {meta ? <span className={s.secMeta}>{meta}</span> : null}
      {onAdd ? (
        <button type="button" className={s.secEdit} onClick={onAdd} aria-label={`Добавить в «${title}»`}>
          <Ic.plus />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className={s.secEdit} onClick={onEdit} aria-label={`Редактировать «${title}»`}>
          <Ic.pencilSm />
        </button>
      ) : null}
    </div>
  )
}

export function ResumeView({ expanded, onToggle, layout, open, resume: propResume, readOnly = false }: Props) {
  const storeResume = useAppSelector((st) => st.profile.resume)
  const resume = propResume ?? storeResume

  const visibleAside = expanded ? ASIDE.filter((id) => layout.includes(id)) : (['contacts'] as SectionId[])
  const visibleMain = expanded ? MAIN.filter((id) => layout.includes(id)) : (['about'] as SectionId[])

  // В режиме просмотра редактор не открываем, пустые секции скрываем.
  const edit = readOnly ? undefined : (m: ProfileModalState) => open(m)

  function renderAside(id: SectionId) {
    switch (id) {
      case 'contacts':
        if (readOnly && !resume.contacts.length) return null
        return (
          <div className={s.sec} key="contacts">
            <SecHead title="Контакты" onEdit={edit && (() => open({ kind: 'contacts' }))} />
            {resume.contacts.length ? (
              <div className={s.contactsList}>
                {resume.contacts.map((c: ContactLink, i) => {
                  const href = contactHref(c.label, c.value)
                  const inner = (
                    <>
                      <span className={s.contactIco}>{contactIcon(c.label)}</span>
                      <span className={s.contactStack}>
                        <span className={s.contactLab}>{c.label}</span>
                        <span className={s.contactVal}>{c.value}</span>
                      </span>
                    </>
                  )
                  return href ? (
                    <a key={i} href={href} className={s.contactRow} target="_blank" rel="noreferrer">
                      {inner}
                    </a>
                  ) : (
                    <span key={i} className={s.contactRow}>
                      {inner}
                    </span>
                  )
                })}
              </div>
            ) : (
              <button type="button" className={s.emptyAdd} onClick={() => open({ kind: 'contacts' })}>
                <Ic.plusSm /> Добавить контакты
              </button>
            )}
          </div>
        )
      case 'languages':
        if (readOnly && !resume.languages.length) return null
        return (
          <div className={s.sec} key="languages">
            <SecHead title="Языки" onEdit={edit && (() => open({ kind: 'languages' }))} />
            {resume.languages.length ? (
              <div className={s.langList}>
                {resume.languages.map((l, i) => (
                  <div key={i} className={s.langRow}>
                    <span className={s.langName}>{l.name}</span>
                    <span className={s.langLevel}>{l.level}</span>
                  </div>
                ))}
              </div>
            ) : (
              <button type="button" className={s.emptyAdd} onClick={() => open({ kind: 'languages' })}>
                <Ic.plusSm /> Добавить язык
              </button>
            )}
          </div>
        )
      case 'skills':
        if (readOnly && !resume.skills.length) return null
        return (
          <div className={s.sec} key="skills">
            <SecHead title="Навыки" onEdit={edit && (() => open({ kind: 'skills' }))} />
            {resume.skills.length ? (
              <div className={s.skillChips}>
                {resume.skills.map((sk) => (
                  <span key={sk} className={s.skillChip} onClick={readOnly ? undefined : () => open({ kind: 'skills' })}>
                    {sk}
                  </span>
                ))}
              </div>
            ) : (
              <button type="button" className={s.emptyAdd} onClick={() => open({ kind: 'skills' })}>
                <Ic.plusSm /> Добавить навыки
              </button>
            )}
          </div>
        )
      default:
        return null
    }
  }

  function renderMain(id: SectionId) {
    switch (id) {
      case 'about':
        if (readOnly && !resume.about.trim()) return null
        return (
          <div className={s.sec} key="about">
            <SecHead title="О себе" onEdit={edit && (() => open({ kind: 'about' }))} />
            {resume.about.trim() ? (
              <div className={s.aboutText}>
                {resume.about.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <button type="button" className={s.emptyAdd} onClick={() => open({ kind: 'about' })}>
                <Ic.plusSm /> Рассказать о себе
              </button>
            )}
          </div>
        )
      case 'experience':
        if (readOnly && !resume.experience.length) return null
        return (
          <div className={s.sec} key="experience">
            <SecHead
              title="Опыт работы"
              meta={formatExperience(totalExperienceMonths(resume.experience))}
              onAdd={edit && (() => open({ kind: 'experience', item: null }))}
            />
            {resume.experience.length ? (
              <div className={s.exp}>
                {resume.experience.map((e: ExperienceItem) => (
                  <button
                    key={e.id}
                    type="button"
                    className={s.expItem}
                    onClick={readOnly ? undefined : () => open({ kind: 'experience', item: e })}
                  >
                    <div className={[s.expLogo, s.grad].join(' ')}>
                      {e.companyLogo ? (
                        <img className={s.expLogoImg} src={e.companyLogo} alt="" />
                      ) : (
                        initials(e.company)
                      )}
                    </div>
                    <div className={s.expMeta}>
                      <div className={s.expRoleRow}>
                        <div className={s.expRole}>{e.role}</div>
                        <div className={s.expPeriod}>{e.period}</div>
                      </div>
                      <div className={s.expCompany}>
                        <span>{e.company}</span>
                      </div>
                      {e.summary ? <div className={s.expSummary}>{e.summary}</div> : null}
                      {e.achievements?.trim() ? (
                        <Markdown className={s.expBullets}>{e.achievements}</Markdown>
                      ) : null}
                      {e.stack.length ? (
                        <div className={s.expStack}>
                          {e.stack.map((st) => (
                            <span key={st} className={s.chip}>
                              {st}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className={s.emptyAdd} onClick={() => open({ kind: 'experience', item: null })}>
                <Ic.plusSm /> Добавить опыт работы
              </button>
            )}
          </div>
        )
      case 'education':
        if (readOnly && !resume.education.length) return null
        return (
          <div className={s.sec} key="education">
            <SecHead title="Образование" onAdd={edit && (() => open({ kind: 'education', item: null }))} />
            {resume.education.length ? (
              <div className={s.eduList}>
                {resume.education.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={s.eduItem}
                    onClick={readOnly ? undefined : () => open({ kind: 'education', item: e })}
                  >
                    <div>
                      <div className={s.eduInst}>{e.institution}</div>
                      <div className={s.eduDegree}>{e.degree}</div>
                    </div>
                    <div className={s.eduPeriod}>{e.period}</div>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className={s.emptyAdd} onClick={() => open({ kind: 'education', item: null })}>
                <Ic.plusSm /> Добавить образование
              </button>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={s.bodyPad}>
      <div className={s.resumeGrid}>
        <div className={s.resumeAside}>{visibleAside.map(renderAside)}</div>
        <div className={s.resumeMain}>{visibleMain.map(renderMain)}</div>
      </div>

      {!expanded ? (
        <div className={s.collapsedHint}>
          <span className={s.collapsedHintIco}>
            <Ic.briefcase />
          </span>
          <div className={s.collapsedHintTx}>
            <div className={s.collapsedHintT}>Развернуть полное резюме</div>
            <div className={s.collapsedHintS}>
              Опыт работы ({resume.experience.length}), Образование ({resume.education.length}), Навыки (
              {resume.skills.length}), Языки ({resume.languages.length})
            </div>
          </div>
          <button type="button" className={[s.btn, s.btnTonal].join(' ')} onClick={onToggle}>
            <Ic.chevronDown /> Развернуть
          </button>
        </div>
      ) : (
        <div className={s.collapseToggleRow}>
          <button type="button" className={s.collapseToggle} onClick={onToggle}>
            <Ic.chevronUp /> Свернуть резюме
          </button>
        </div>
      )}
    </div>
  )
}
