import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../../../app/store/hooks'
import type { JobStatus, Resume } from '../../model/types'
import type { ProfileModalState } from './ProfileModals'
import { CompanyBadge } from '../../../../shared/ui/CompanyBadge/CompanyBadge'
import { Ic } from './icons'
import s from './ProfileSheet.module.css'

function statusLabel(kind: JobStatus['kind']): string {
  switch (kind) {
    case 'seeking':
      return 'В поиске работы'
    case 'open':
      return 'Рассматриваю предложения'
    case 'not_seeking':
      return 'Не ищу работу'
  }
}

type Props = {
  open: (modal: ProfileModalState) => void
  showToast: (s: string) => void
  /** Данные резюме (для просмотра чужого профиля). По умолчанию — из стора (свой). */
  resume?: Resume
  /** Режим просмотра: без редактирования, своя строка действий. */
  readOnly?: boolean
  /** Заменяет строку действий владельца (для публичного: +Связь / Написать / ⋯). */
  actions?: ReactNode
  /** id просматриваемого профиля (для публичной ссылки). */
  viewedId?: string
  /** Кнопка «назад» в углу баннера (мобилка, просмотр чужого профиля). */
  onBack?: () => void
}

export function Hero({ open, showToast, resume: propResume, readOnly = false, actions, viewedId, onBack }: Props) {
  const navigate = useNavigate()
  const storeResume = useAppSelector((st) => st.profile.resume)
  const resume = propResume ?? storeResume
  const myId = useAppSelector((st) => st.auth.user?.id)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const publicUrl = `kolibel.ru/u/${viewedId ?? myId ?? ''}`

  const moreItems = [
    { id: 'guest', t: 'Открыть как гость', ico: <Ic.eye />, run: () => myId && navigate(`/u/${myId}?guest=1`) },
    { id: 'sep' },
    { id: 'privacy', t: 'Настройки приватности', ico: <Ic.settings />, run: () => navigate('/settings') },
    { id: 'report', t: 'Сообщить об ошибке', ico: <Ic.flag />, danger: true, run: () => showToast('Спасибо! Передадим команде.') },
  ]

  return (
    <div className={s.hero}>
      <div
        className={[s.heroBanner, resume.banner ? s.heroBannerWithImage : ''].filter(Boolean).join(' ')}
        style={resume.banner ? { backgroundImage: `url(${resume.banner})` } : undefined}
        role={readOnly ? undefined : 'button'}
        aria-label={readOnly ? undefined : 'Сменить обложку'}
        onClick={readOnly ? undefined : () => open({ kind: 'banner' })}
      >
        {onBack ? (
          <button
            type="button"
            className={s.heroBackBtn}
            aria-label="Назад"
            onClick={(e) => {
              e.stopPropagation()
              onBack()
            }}
          >
            <Ic.arrowLeft size={18} />
          </button>
        ) : null}
        {readOnly ? null : (
          <button
            type="button"
            className={s.heroBannerEdit}
            onClick={(e) => {
              e.stopPropagation()
              open({ kind: 'banner' })
            }}
          >
            <Ic.pencilSm /> <span className={s.heroBannerEditLabel}>Сменить обложку</span>
          </button>
        )}
      </div>

      <div className={s.heroBody}>
        <div className={s.heroTop}>
          <div
            className={s.avatarWrap}
            role={readOnly ? undefined : 'button'}
            aria-label={readOnly ? undefined : 'Сменить фото'}
            onClick={readOnly ? undefined : () => open({ kind: 'avatar' })}
          >
            <div className={[s.avatar, s.grad].join(' ')}>
              {resume.avatar ? <img src={resume.avatar} alt={resume.fullName} /> : resume.avatarInitials}
            </div>
            {resume.isOnline ? <span className={s.onlineDot} /> : null}
          </div>

          <div className={s.heroIdent}>
            <h1 className={s.heroName}>
              {resume.fullName || 'Без имени'}
              <CompanyBadge logo={resume.jobStatus.companyLogo} title={resume.jobStatus.company} size={24} />
              {readOnly ? (
                <span className={[s.heroBadge, s.heroBadgeRight].join(' ')}>
                  <span className={s.heroBadgeDot} /> {statusLabel(resume.jobStatus.kind)}
                </span>
              ) : (
                <button
                  type="button"
                  className={[s.heroBadge, s.heroBadgeRight].join(' ')}
                  onClick={() => open({ kind: 'status' })}
                  title="Изменить статус поиска"
                >
                  <span className={s.heroBadgeDot} /> {statusLabel(resume.jobStatus.kind)}
                </button>
              )}
            </h1>
            <div className={s.heroHeadline}>
              {[resume.jobTitle, resume.jobStatus.company].filter(Boolean).join(' · ') || (readOnly ? '' : 'Добавьте должность и компанию')}
            </div>
            <div className={s.heroMeta}>
              {resume.location ? (
                <span className={s.heroMetaItem}>
                  <Ic.mapPin /> {resume.location}
                  {resume.country ? `, ${resume.country}` : ''}
                </span>
              ) : null}
              {resume.workFormat ? (
                <span className={s.heroMetaItem}>
                  <Ic.briefcase /> {resume.workFormat}
                </span>
              ) : null}
              <span className={s.heroMetaItem}>
                <Ic.globe /> {publicUrl}
              </span>
            </div>
          </div>
        </div>

        <div className={[s.heroActions, readOnly ? s.heroActionsView : s.heroActionsOwner].join(' ')}>
          {readOnly ? (
            actions
          ) : (
            <>
              <button type="button" className={[s.btn, s.btnPrimary].join(' ')} onClick={() => open({ kind: 'edit-header' })}>
                <Ic.pencil /> <span className={s.btnLabel}>Редактировать</span>
              </button>
              <button type="button" className={[s.btn, s.btnGhost].join(' ')} onClick={() => open({ kind: 'pdf' })}>
                <Ic.download /> <span className={s.btnLabel}>Скачать PDF</span>
              </button>
              <button type="button" className={[s.btn, s.btnGhost].join(' ')} onClick={() => open({ kind: 'share' })}>
                <Ic.share /> <span className={s.btnLabel}>Поделиться</span>
              </button>
              <div className={s.moreWrap} ref={moreRef}>
                <button type="button" className={s.btnIcon} aria-label="Ещё" onClick={() => setMoreOpen((v) => !v)}>
                  <Ic.more />
                </button>
                {moreOpen ? (
                  <div className={s.moreMenu} role="menu">
                    {moreItems.map((it) =>
                      it.id === 'sep' ? (
                        <div key="sep" className={s.moreSep} />
                      ) : (
                        <button
                          key={it.id}
                          type="button"
                          className={[s.moreItem, it.danger ? s.moreDanger : ''].filter(Boolean).join(' ')}
                          onClick={() => {
                            setMoreOpen(false)
                            it.run?.()
                          }}
                        >
                          <span className={s.moreIco}>{it.ico}</span>
                          {it.t}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
