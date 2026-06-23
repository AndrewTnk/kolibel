import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsRead,
  clearAllNotifications,
} from '../model/notificationsThunks'
import type { AppNotification } from '../model/types'
import { groupNotifications, isGrouped, type NotifGroup } from '../lib/groupNotifications'
import { notifTarget } from '../lib/notificationLink'
import { formatChatTime } from '../../chat/lib/format'
import styles from './NotificationsMenu.module.css'

/** Инициалы для аватара уведомления (из заголовка-источника). */
function notifInitials(title: string): string {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'K'
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

/** Глагол для группового заголовка (группа всегда ≥2 → множественное число). */
const GROUP_VERB: Record<string, string> = {
  like: 'оценили вашу публикацию',
  comment: 'прокомментировали вашу публикацию',
  comment_like: 'оценили ваш комментарий',
  reply: 'ответили на ваш комментарий',
  follow: 'подписались на вас',
  application: 'откликнулись на вашу вакансию',
}

/** Текст заголовка строки/группы уведомлений. */
function GroupText({ g }: { g: NotifGroup }) {
  const name = g.latest.title || 'Пользователь'
  // Сообщения: всегда счётчиком, без контента.
  if (g.kind === 'message') {
    const word = plural(g.count, 'новое сообщение', 'новых сообщения', 'новых сообщений')
    return (
      <>
        <b>{name}</b> прислал(а) вам {g.count} {word}
      </>
    )
  }
  if (isGrouped(g)) {
    const verb = GROUP_VERB[g.kind] ?? 'отметили вас'
    return (
      <>
        <b>{name}</b> и ещё {g.count - 1} {verb}
      </>
    )
  }
  // Одиночное — заголовок + полный текст (комментарий/ответ — целиком).
  return (
    <>
      {name ? <b>{name}</b> : null}
      {name && g.latest.text ? ' ' : null}
      {g.latest.text}
    </>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Аватар одного уведомления (фото или инициалы; квадрат — компания/вакансия). */
function NotifAvatar({ n }: { n: AppNotification }) {
  const square = n.actorKind === 'company' || n.kind === 'vacancy'
  return (
    <span className={[styles.itemAv, square ? styles.itemAvSquare : ''].filter(Boolean).join(' ')} aria-hidden>
      {n.avatar ? <img className={styles.itemAvImg} src={n.avatar} alt="" /> : notifInitials(n.title)}
    </span>
  )
}

const STACK_MAX = 3

/** Стек аватаров участников группы + «+N». */
function AvatarStack({ items }: { items: AppNotification[] }) {
  const seen = new Set<string>()
  const actors: AppNotification[] = []
  for (const n of items) {
    const key = n.actorId ?? n.id
    if (seen.has(key)) continue
    seen.add(key)
    actors.push(n)
  }
  const shown = actors.length > STACK_MAX ? actors.slice(0, STACK_MAX - 1) : actors
  const extra = actors.length - shown.length
  return (
    <span className={styles.avStack} aria-hidden>
      {shown.map((n, i) => (
        <span key={n.id} className={styles.avStackItem} style={{ zIndex: STACK_MAX - i }}>
          <NotifAvatar n={n} />
        </span>
      ))}
      {extra > 0 ? <span className={[styles.avStackItem, styles.avMore].join(' ')}>+{extra}</span> : null}
    </span>
  )
}

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.5 2 6.4.4.5 0 1.1-.6 1.1H4.6c-.6 0-1-.6-.6-1.1.8-.9 2-2.4 2-6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function NotificationsMenu() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = useAppSelector((s) => s.notifications.items)
  const ref = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const unread = items.filter((n) => !n.read).length
  const groups = useMemo(() => groupNotifications(items), [items])

  function markAllRead() {
    void dispatch(markAllNotificationsRead())
  }

  function clearAll() {
    void dispatch(clearAllNotifications())
  }

  /** Переход по дочернему уведомлению внутри группы. */
  function navTo(n: AppNotification) {
    if (!n.read) void dispatch(markNotificationRead(n.id))
    const target = notifTarget(n)
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  /** Клик по одиночной строке (в т.ч. «N сообщений»): прочитать все + перейти. */
  function openSingle(g: NotifGroup) {
    const unreadIds = g.items.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length) void dispatch(markNotificationsRead(unreadIds))
    const target = notifTarget(g.latest)
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  /** Клик по группе: разворачиваем/сворачиваем + помечаем группу прочитанной. */
  function toggleGroup(g: NotifGroup) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(g.key)) next.delete(g.key)
      else next.add(g.key)
      return next
    })
    const unreadIds = g.items.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length) void dispatch(markNotificationsRead(unreadIds))
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={styles.root} ref={ref}>
      <button
        type="button"
        className={styles.bellBtn}
        aria-label="Уведомления"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {unread > 0 ? <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span> : null}
      </button>

      {open ? (
        <div className={styles.menu} role="menu" aria-label="Список уведомлений">
          <div className={styles.menuHead}>
            <span className={styles.menuTitle}>Уведомления</span>
            <div className={styles.menuActions}>
              {unread > 0 ? (
                <button type="button" className={styles.markAll} onClick={markAllRead}>
                  Прочитать всё
                </button>
              ) : null}
              {items.length ? (
                <button type="button" className={styles.clearAll} onClick={clearAll}>
                  Очистить
                </button>
              ) : null}
              <button
                type="button"
                className={styles.settingsBtn}
                aria-label="Настройки уведомлений"
                title="Настройки уведомлений"
                onClick={() => {
                  setOpen(false)
                  navigate('/settings?section=notifications')
                }}
              >
                <GearIcon />
              </button>
              {/* Закрыть — только на мобилке (там меню на весь экран, клика-вне нет). */}
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.list}>
            {groups.length ? (
              groups.map((g) =>
                isGrouped(g) ? (
                  <div key={g.key} className={styles.group}>
                    <button
                      type="button"
                      className={[styles.item, styles.groupHead].join(' ')}
                      role="menuitem"
                      aria-expanded={expanded.has(g.key)}
                      onClick={() => toggleGroup(g)}
                    >
                      <AvatarStack items={g.items} />
                      <span className={styles.itemBody}>
                        <span className={styles.itemText}>
                          <GroupText g={g} />
                        </span>
                        <span className={styles.itemTime}>{formatChatTime(g.latest.createdAt)}</span>
                      </span>
                      <span className={styles.chev}>
                        <ChevronIcon open={expanded.has(g.key)} />
                      </span>
                      {g.unread ? <span className={styles.dot} aria-hidden /> : null}
                    </button>
                    {expanded.has(g.key) ? (
                      <div className={styles.children}>
                        {g.items.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className={[styles.item, styles.childItem].join(' ')}
                            role="menuitem"
                            onClick={() => navTo(n)}
                          >
                            <NotifAvatar n={n} />
                            <span className={styles.itemBody}>
                              <span className={styles.itemText}>
                                {n.title ? <b>{n.title}</b> : null}
                                {n.title && n.text ? ' ' : null}
                                {n.text}
                              </span>
                              <span className={styles.itemTime}>{formatChatTime(n.createdAt)}</span>
                            </span>
                            {!n.read ? <span className={styles.dot} aria-hidden /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    key={g.key}
                    type="button"
                    className={styles.item}
                    role="menuitem"
                    onClick={() => openSingle(g)}
                  >
                    <NotifAvatar n={g.latest} />
                    <span className={styles.itemBody}>
                      <span className={styles.itemText}>
                        <GroupText g={g} />
                      </span>
                      <span className={styles.itemTime}>{formatChatTime(g.latest.createdAt)}</span>
                    </span>
                    {g.unread ? <span className={styles.dot} aria-hidden /> : null}
                  </button>
                ),
              )
            ) : (
              <div className={styles.empty}>Нет уведомлений</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
