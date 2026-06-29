import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { notificationsActions } from '../model/notificationsSlice'
import { notifTarget, isPostKind } from '../lib/notificationLink'
import { feedActions } from '../../feed/model/feedSlice'
import { moderationUiActions } from '../../moderation/model/moderationUiSlice'
import styles from './NotificationToast.module.css'

function initials(title: string): string {
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

/**
 * Пуш-тост: всплывающее уведомление при получении нового (по realtime).
 * Глобально смонтирован в RootLayout. Авто-скрытие через 5 c, клик ведёт по ссылке.
 * Работает в вебе и на мобилке, тема-зависим. Пока показываем для всех событий —
 * в дальнейшем фильтр в настройках.
 */
export function NotificationToast() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const toast = useAppSelector((s) => s.notifications.toast)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => dispatch(notificationsActions.dismissToast()), 5000)
    return () => window.clearTimeout(t)
  }, [toast, dispatch])

  if (!toast) return null

  const square = toast.actorKind === 'company' || toast.kind === 'vacancy'

  return createPortal(
    <div className={styles.wrap}>
      <div
        className={styles.toast}
        role="alert"
        onClick={() => {
          if (toast.kind === 'moderation') {
            if (toast.entityId) dispatch(moderationUiActions.openModerationResponse(toast.entityId))
          } else if (isPostKind(toast.kind)) {
            if (!isMobile && toast.entityId) dispatch(feedActions.openPost(toast.entityId))
          } else {
            const target = notifTarget(toast)
            if (target) navigate(target)
          }
          dispatch(notificationsActions.dismissToast())
        }}
      >
        {toast.kind === 'moderation' ? (
          <span className={[styles.av, styles.avSquare, styles.avMod].join(' ')} aria-hidden>
            <img className={styles.avMark} src="/logo/kolibel-mark.png" alt="" />
          </span>
        ) : (
          <span className={[styles.av, square ? styles.avSquare : ''].filter(Boolean).join(' ')} aria-hidden>
            {toast.avatar ? <img className={styles.avImg} src={toast.avatar} alt="" /> : initials(toast.title)}
          </span>
        )}
        <span className={styles.body}>
          <span className={styles.text}>
            {toast.title ? <b>{toast.title}</b> : null}
            {toast.kind === 'message'
              ? ' прислал(а) вам новое сообщение'
              : (toast.title && toast.text ? ' ' : '') + toast.text}
          </span>
          <span className={styles.hint}>Нажми, чтобы открыть</span>
        </span>
        <button
          type="button"
          className={styles.close}
          aria-label="Закрыть"
          onClick={(e) => {
            e.stopPropagation()
            dispatch(notificationsActions.dismissToast())
          }}
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}
