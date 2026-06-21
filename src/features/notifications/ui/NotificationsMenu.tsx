import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import {
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
} from '../model/notificationsThunks'
import type { AppNotification } from '../model/types'
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

  const unread = items.filter((n) => !n.read).length

  function markAllRead() {
    void dispatch(markAllNotificationsRead())
  }

  function clearAll() {
    void dispatch(clearAllNotifications())
  }

  function onItemClick(n: AppNotification) {
    if (!n.read) void dispatch(markNotificationRead(n.id))
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
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
            </div>
          </div>

          <div className={styles.list}>
            {items.length ? (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={styles.item}
                  role="menuitem"
                  onClick={() => onItemClick(n)}
                >
                  <span
                    className={[
                      styles.itemAv,
                      n.actorKind === 'company' || n.kind === 'vacancy' ? styles.itemAvSquare : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden
                  >
                    {n.avatar ? (
                      <img className={styles.itemAvImg} src={n.avatar} alt="" />
                    ) : (
                      notifInitials(n.title)
                    )}
                  </span>
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
              ))
            ) : (
              <div className={styles.empty}>Нет уведомлений</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
