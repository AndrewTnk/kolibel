import { useEffect, useState, type ReactNode, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { toggleFollow } from '../model/networkThunks'
import type { Company, NetworkPerson } from '../model/types'
import { NetIco } from './netIcons'
import styles from './NetworkPeekModals.module.css'

/** Лёгкий каркас модалки (scrim + панель + Esc + блокировка скролла). */
function Shell({
  onClose,
  className,
  fullScreenMobile,
  children,
}: {
  onClose: () => void
  className?: string
  /** На мобилке (≤980px) развернуть модалку на весь экран. */
  fullScreenMobile?: boolean
  children: ReactNode
}) {
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
  return (
    <div
      className={[styles.scrim, fullScreenMobile ? styles.scrimFull : ''].filter(Boolean).join(' ')}
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className={[styles.modal, fullScreenMobile ? styles.modalFull : '', className].filter(Boolean).join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function bgGrad(bg?: [string, string]): string {
  return `linear-gradient(135deg, ${bg?.[0] ?? '#fdece2'}, ${bg?.[1] ?? '#f3b89e'})`
}

/** Превью профиля человека. */
export function PersonPeekModal({
  person,
  isFollowing,
  onFollow,
  onClose,
}: {
  person: NetworkPerson
  isFollowing: boolean
  onFollow: (id: string) => void
  onClose: () => void
}) {
  const myId = useAppSelector((s) => s.auth.user?.id)
  const isSelf = !!myId && person.id === myId
  return (
    <Shell onClose={onClose}>
      <div className={styles.head}>
        <div>
          <div className={styles.headTitle}>{person.fullName}</div>
          <div className={styles.headSub}>
            {person.jobTitle}
            {person.company ? ` · ${person.company}` : ''}
          </div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      <div className={styles.peekHead} style={{ background: bgGrad(person.bg) }} />
      <div className={styles.peekBody}>
        <div className={styles.peekAva}>
          {person.avatar ? <img src={person.avatar} alt={person.fullName} /> : person.avatarInitials}
        </div>
        <div className={styles.peekName}>
          {person.fullName}
          {person.tag ? <span className={styles.peekTag}>{person.tag}</span> : null}
        </div>
        <div className={styles.peekRole}>
          {person.jobTitle}
          {person.company ? ` · ${person.company}` : ''}
        </div>
        {person.location ? (
          <div className={styles.peekMeta}>
            <span>
              <NetIco.Pin /> {person.location}
            </span>
          </div>
        ) : null}

        {person.about ? <div className={styles.peekAbout}>{person.about}</div> : null}

        <div className={styles.peekActions}>
          {isSelf ? (
            <Link to="/profile" className={styles.btnPrim} onClick={onClose}>
              Открыть профиль
            </Link>
          ) : (
            <>
              <button type="button" className={styles.btnPrim} onClick={() => onFollow(person.id)}>
                {isFollowing ? '✓ Связь' : '+ Связь'}
              </button>
              <Link to={`/u/${person.id}?from=network`} className={styles.btnGhost} onClick={onClose}>
                Открыть профиль
              </Link>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}

/** Превью компании. */
export function CompanyPeekModal({
  company,
  isFollowing,
  onFollow,
  onClose,
}: {
  company: Company
  isFollowing: boolean
  onFollow: (id: string) => void
  onClose: () => void
}) {
  return (
    <Shell onClose={onClose}>
      <div className={styles.head}>
        <div>
          <div className={styles.headTitle}>{company.name}</div>
          <div className={styles.headSub}>{company.field}</div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      <div className={styles.peekHead} style={{ background: bgGrad(company.bg) }} />
      <div className={styles.peekBody}>
        <div className={[styles.peekAva, styles.peekAvaSq].join(' ')}>
          {company.logo ? <img src={company.logo} alt={company.name} /> : company.logoInitial}
        </div>
        <div className={styles.peekName}>{company.name}</div>
        <div className={styles.peekRole}>{company.field}</div>
        <div className={styles.peekMeta}>
          {company.location ? (
            <span>
              <NetIco.Pin /> {company.location}
            </span>
          ) : null}
          <span>{company.openVacancies} открытых вакансий</span>
          {company.newVacancies && company.newVacancies > 0 ? (
            <span className={styles.peekNew}>+{company.newVacancies} новых</span>
          ) : null}
        </div>

        {company.about ? <div className={styles.peekAbout}>{company.about}</div> : null}

        <div className={styles.peekActions}>
          <button type="button" className={styles.btnPrim} onClick={() => onFollow(company.id)}>
            {isFollowing ? '✓ Связь' : '+ Связь'}
          </button>
          <Link to={`/u/${company.id}?from=network`} className={styles.btnGhost} onClick={onClose}>
            Открыть страницу
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/** Приглашение в Kolibel — копирование личной ссылки + варианты. */
export function InviteModal({
  onClose,
  onToast,
}: {
  onClose: () => void
  onToast: (text: string) => void
}) {
  const myId = useAppSelector((s) => s.auth.user?.id)
  const link = `${window.location.origin}/u/${myId ?? ''}`

  function copy() {
    void navigator.clipboard?.writeText(link)
    onToast('Ссылка скопирована')
  }

  return (
    <Shell onClose={onClose}>
      <div className={styles.head}>
        <div>
          <div className={styles.headTitle}>Пригласить в сеть</div>
          <div className={styles.headSub}>Расскажи коллегам про Kolibel</div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.inviteOpts}>
          <button className={styles.inviteOpt} onClick={copy}>
            <span className={styles.inviteIco}>
              <NetIco.Mail />
            </span>
            <span className={styles.inviteMeta}>
              <span className={styles.inviteTi}>По ссылке</span>
              <span className={styles.inviteMe}>Отправь личную ссылку в почту или мессенджер</span>
            </span>
          </button>
          <button className={styles.inviteOpt} onClick={copy}>
            <span className={styles.inviteIco}>
              <NetIco.Share />
            </span>
            <span className={styles.inviteMeta}>
              <span className={styles.inviteTi}>Поделиться</span>
              <span className={styles.inviteMe}>Telegram, WhatsApp, ВКонтакте</span>
            </span>
          </button>
        </div>

        <div className={styles.inviteLink}>
          <span className={styles.inviteLinkLab}>Личная ссылка</span>
          <div className={styles.inviteLinkRow}>
            <input value={link} readOnly />
            <button onClick={copy}>
              <NetIco.Link /> Скопировать
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export type CompositionRow = {
  id: string
  name: string
  sub: string
  avatar?: string
  initial: string
  square: boolean
  mutual?: number
}

/** Группы для модалки «Мои связи» (вкладки). */
export type ConnectionGroups = {
  all: CompositionRow[]
  people: CompositionRow[]
  companies: CompositionRow[]
  outgoing: CompositionRow[]
  incoming: CompositionRow[]
}

type ConnTab = keyof ConnectionGroups

const CONN_TABS: { key: ConnTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'people', label: 'Люди' },
  { key: 'companies', label: 'Компании' },
  { key: 'outgoing', label: 'Исходящие' },
  { key: 'incoming', label: 'Входящие' },
]

/** «Мои связи» — состав сети с вкладками (Все/Люди/Компании/Исходящие/Входящие) и поиском. */
export function MyConnectionsModal({
  groups,
  onClose,
}: {
  groups: ConnectionGroups
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const [tab, setTab] = useState<ConnTab>('all')
  const [q, setQ] = useState('')

  const rows = groups[tab]
  const query = q.trim().toLowerCase()
  const filtered = query
    ? rows.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(query))
    : rows

  function onToggle(e: MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    void dispatch(toggleFollow(id))
  }

  return (
    <Shell onClose={onClose} className={styles.modalWide} fullScreenMobile>
      <div className={styles.head}>
        <div>
          <div className={styles.headTitle}>Мои связи</div>
          <div className={styles.headSub}>{groups.all.length} в сети</div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.lTabs} role="tablist">
          {CONN_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={[styles.lTab, tab === t.key ? styles.lTabOn : ''].join(' ')}
              onClick={() => {
                setTab(t.key)
                setQ('')
              }}
            >
              {t.label}
              <span className={styles.lTabCount}>{groups[t.key].length}</span>
            </button>
          ))}
        </div>
        <div className={styles.lSearch}>
          <NetIco.Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" />
        </div>
        <div className={styles.connScroll}>
          {!filtered.length ? (
            <div className={styles.empty}>{rows.length ? 'Ничего не найдено' : 'Здесь пока пусто'}</div>
          ) : (
            <div className={styles.lList}>
              {filtered.map((r) => (
                <Link key={r.id} to={`/u/${r.id}?from=network`} className={styles.lRow} onClick={onClose}>
                  <span className={[styles.lAva, r.square ? styles.lAvaSq : ''].join(' ')}>
                    {r.avatar ? <img src={r.avatar} alt="" /> : r.initial}
                  </span>
                  <span className={styles.lMeta}>
                    <span className={styles.lName}>{r.name}</span>
                    <span className={styles.lRole}>{r.sub}</span>
                  </span>
                  <button
                    type="button"
                    className={[styles.lAction, followingIds.includes(r.id) ? styles.lActionDone : ''].join(' ')}
                    onClick={(e) => onToggle(e, r.id)}
                  >
                    {followingIds.includes(r.id) ? '✓ Связь' : '+ Связь'}
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

/** Список состава сети (люди, компании) — строками с поиском. */
export function CompositionListModal({
  title,
  subtitle,
  rows,
  onClose,
}: {
  title: string
  subtitle: string
  rows: CompositionRow[]
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const filtered = query
    ? rows.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(query))
    : rows

  function onToggle(e: MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    void dispatch(toggleFollow(id))
  }

  return (
    <Shell onClose={onClose}>
      <div className={styles.head}>
        <div>
          <div className={styles.headTitle}>{title}</div>
          <div className={styles.headSub}>{subtitle}</div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.lSearch}>
          <NetIco.Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" />
        </div>
        {!filtered.length ? (
          <div className={styles.empty}>Ничего не найдено</div>
        ) : (
          <div className={styles.lList}>
            {filtered.map((r) => (
              <Link key={r.id} to={`/u/${r.id}?from=network`} className={styles.lRow} onClick={onClose}>
                <span className={[styles.lAva, r.square ? styles.lAvaSq : ''].join(' ')}>
                  {r.avatar ? <img src={r.avatar} alt="" /> : r.initial}
                </span>
                <span className={styles.lMeta}>
                  <span className={styles.lName}>{r.name}</span>
                  <span className={styles.lRole}>{r.sub}</span>
                  {r.mutual ? <span className={styles.lMutual}>{r.mutual} общих связей</span> : null}
                </span>
                <button
                  type="button"
                  className={[styles.lAction, followingIds.includes(r.id) ? styles.lActionDone : ''].join(' ')}
                  onClick={(e) => onToggle(e, r.id)}
                >
                  {followingIds.includes(r.id) ? '✓ Связь' : '+ Связь'}
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
