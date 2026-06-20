import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { signOut } from '../../../features/auth/model/authThunks'
import { SupportLinks } from '../Recommendations/SupportLinks'
import styles from './MobileMenu.module.css'

type Props = {
  name: string
  email?: string
  initials: string
  onClose: () => void
  onOpenSwitcher: () => void
}

/** Бургер-меню (drawer) для мобильного шелла: профиль, настройки, смена аккаунта,
 *  футер (SupportLinks) и выход. Основная навигация — в нижнем таб-баре. */
export function MobileMenu({ name, email, initials, onClose, onOpenSwitcher }: Props) {
  const dispatch = useAppDispatch()
  const nav = useNavigate()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (to: string) => {
    onClose()
    nav(to)
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal aria-label="Меню">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <button type="button" className={styles.profile} onClick={() => go('/profile')}>
            <span className={styles.avatar} aria-hidden>
              {initials}
            </span>
            <span className={styles.profileMeta}>
              <span className={styles.name}>{name}</span>
              {email ? <span className={styles.email}>{email}</span> : null}
            </span>
          </button>
          <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => go('/settings')}>
            Настройки
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              onClose()
              onOpenSwitcher()
            }}
          >
            Сменить аккаунт
          </button>
        </div>

        <div className={styles.footer}>
          <SupportLinks />
        </div>

        <button
          type="button"
          className={[styles.action, styles.danger].join(' ')}
          onClick={() => {
            onClose()
            void dispatch(signOut())
            nav('/auth', { replace: true })
          }}
        >
          Выйти
        </button>
      </div>
    </div>,
    document.body,
  )
}
