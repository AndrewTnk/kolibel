import { useState } from 'react'
import { useAppSelector } from '../../../../app/store/hooks'
import { useProfilePulse, buildSparkline, formatDelta } from '../../lib/useProfilePulse'
import type { ProfileModalState } from './ProfileModals'
import { Ic } from './icons'
import { RecommendedPeople } from '../../../../shared/ui/Recommendations/RecommendedPeople'
import { ArticlesBlock } from '../../../articles/ui/ArticlesBlock'
import { SupportLinks } from '../../../../shared/ui/Recommendations/SupportLinks'
import s from './ProfileSheet.module.css'

type CompletionItem = { id: string; text: string; done: boolean; modal?: ProfileModalState }

type Props = {
  open: (modal: ProfileModalState) => void
  showToast: (s: string) => void
}

export function SideRail({ open }: Props) {
  const resume = useAppSelector((st) => st.profile.resume)
  const myId = useAppSelector((st) => st.auth.user?.id)
  const pulse = useProfilePulse()
  const [compOpen, setCompOpen] = useState(false)

  // ── Готовность профиля (по факту заполнения) ──
  const items: CompletionItem[] = [
    { id: 'about', text: 'О себе заполнено', done: !!resume.about.trim(), modal: { kind: 'about' } },
    { id: 'exp', text: `Добавлен опыт работы${resume.experience.length ? ` (${resume.experience.length})` : ''}`, done: resume.experience.length > 0, modal: { kind: 'experience', item: null } },
    { id: 'edu', text: 'Образование заполнено', done: resume.education.length > 0, modal: { kind: 'education', item: null } },
    { id: 'skills', text: 'Навыки заполнены', done: resume.skills.length > 0, modal: { kind: 'skills' } },
    { id: 'cover', text: 'Загрузить обложку профиля', done: !!resume.banner, modal: { kind: 'banner' } },
    { id: 'avatar', text: 'Добавить фото профиля', done: !!resume.avatar, modal: { kind: 'avatar' } },
    { id: 'contacts', text: 'Указать контакты', done: resume.contacts.length > 0, modal: { kind: 'contacts' } },
  ]
  const doneCount = items.filter((i) => i.done).length
  const percent = Math.round((doneCount / items.length) * 100)
  const todo = items.length - doneCount

  // ── Sparkline ──
  const sw = 260
  const sh = 54
  const { line, area } = buildSparkline(pulse.series, sw, sh, 6)

  return (
    <>
      {/* Готовность */}
      {percent >= 100 ? null : (
      <div className={[s.card, 'hideOnMobile'].join(' ')}>
        <div className={s.cardLabel}>Готовность профиля</div>
        <div className={s.compRow}>
          <div className={s.compRing} style={{ ['--p' as string]: percent }}>
            <span>{percent}%</span>
          </div>
          <div className={s.compMeta}>
            <div className={s.compMetaT}>Ещё чуть-чуть</div>
            <div className={s.compMetaS}>
              {`Добавь ${todo} штрих${todo === 1 ? '' : 'и'} — и резюме станет «горячим»`}
            </div>
          </div>
        </div>
        {compOpen ? (
          <div className={s.compList}>
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                className={[s.compItem, c.done ? s.compItemDone : ''].filter(Boolean).join(' ')}
                onClick={() => !c.done && c.modal && open(c.modal)}
              >
                <span className={s.compCheck}>{c.done ? <Ic.check size={11} /> : null}</span>
                <span>{c.text}</span>
                {!c.done ? (
                  <span className={s.compArr}>
                    <Ic.arrowRight size={13} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className={s.compToggle} onClick={() => setCompOpen((v) => !v)}>
          {compOpen ? <>Свернуть <Ic.chevronUp size={14} /></> : <>Что заполнить <Ic.chevronDown size={14} /></>}
        </button>
      </div>
      )}

      {/* Аналитика мини */}
      <div className={[s.card, s.analyticsMini, 'hideOnMobile'].join(' ')} onClick={() => open({ kind: 'analytics' })} role="button">
        <div className={s.cardLabel}>Профиль за 7 дней</div>
        <div className={s.analyHead}>
          <div className={s.cardTitle}>Просмотры профиля</div>
          <div className={s.analyDelta} style={{ color: pulse.views.deltaPct > 0 ? undefined : 'var(--muted)' }}>
            {formatDelta(pulse.views.deltaPct)}
          </div>
        </div>
        <div className={s.analySpark}>
          <svg width="100%" height="100%" viewBox={`0 0 ${sw} ${sh}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="railSpark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity=".35" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#railSpark)" />
            <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        <div className={s.analyLeg}>
          <div>
            <div className={s.analyLegN}>{pulse.views.count}</div>
            <div className={s.analyLegL}>просмотров</div>
          </div>
          <div>
            <div className={s.analyLegN}>{pulse.applications.count}</div>
            <div className={s.analyLegL}>откликов</div>
          </div>
          <div>
            <div className={s.analyLegN}>{pulse.newConnections.count}</div>
            <div className={s.analyLegL}>подписчиков</div>
          </div>
        </div>
      </div>

      {/* Статьи автора (свой профиль — можно добавлять/редактировать). На мобилке — отдельной вкладкой в ProfileSheet. */}
      {myId ? (
        <div className="hideOnMobile">
          <ArticlesBlock authorId={myId} canEdit />
        </div>
      ) : null}

      {/* Люди в сфере — единый стиль с главной (RecRow + «+ Связь»/«✓ Связь») */}
      <div className="hideOnMobile">
        <RecommendedPeople title="Люди в твоей сфере" />
      </div>

      <div className="hideOnMobile">
        <SupportLinks />
      </div>
    </>
  )
}
