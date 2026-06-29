import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { signOut } from '../model/authThunks'
import s from './BlockedScreen.module.css'

/**
 * Полноэкранный экран блокировки. Показывается, когда текущий аккаунт заблокирован
 * модерацией (auth.moderation.blocked === true, выставляется в loadProfile).
 * Пускать в приложение нельзя — единственное действие «Выйти» завершает сессию.
 * Смонтирован в App.tsx над роутером.
 */
export function BlockedScreen() {
  const dispatch = useAppDispatch()
  const moderation = useAppSelector((st) => st.auth.moderation)

  if (!moderation?.blocked) return null

  const message =
    moderation.message.trim() ||
    'Ваш аккаунт заблокирован модерацией за нарушение правил сообщества. Доступ к платформе ограничен.'

  return (
    <div className={s.overlay} role="dialog" aria-modal="true">
      <div className={s.card}>
        <div className={s.icon}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M5.6 5.6l12.8 12.8" />
          </svg>
        </div>
        <div className={s.title}>Аккаунт заблокирован</div>
        {moderation.reason.trim() ? <div className={s.reason}>{moderation.reason}</div> : null}
        <div className={s.message}>{message}</div>
        <button className={s.btn} onClick={() => void dispatch(signOut())}>
          Выйти
        </button>
      </div>
    </div>
  )
}
