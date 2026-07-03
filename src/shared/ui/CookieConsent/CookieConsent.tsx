import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../../app/store/hooks'
import s from './CookieConsent.module.css'

const KEY = 'kolibel:cookieConsent'

function hasConsent(): boolean {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    // localStorage недоступен (приватный режим) — баннер не показываем,
    // иначе он будет вылезать при каждом заходе.
    return true
  }
}

function CookieIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 3.5 3.5 0 0 1-4.6-4.6A3.5 3.5 0 0 1 12 2z" />
      <circle cx="8.5" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * Баннер согласия на cookie/localStorage (152-ФЗ: идентификаторы = персональные данные).
 * Показывается ТОЛЬКО авторизованным (решение владельца) — сессия и настройки
 * появляются как раз при входе. Факт согласия хранится в localStorage с датой.
 */
export function CookieConsent() {
  const session = useAppSelector((st) => st.auth.session)
  const [accepted, setAccepted] = useState(hasConsent)

  if (!session || accepted) return null

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString())
    } catch {
      /* приватный режим — просто скрываем до перезагрузки */
    }
    setAccepted(true)
  }

  return (
    <div className={s.bar} role="region" aria-label="Использование cookie">
      <div className={s.icon} aria-hidden="true">
        <CookieIcon />
      </div>
      <div className={s.body}>
        <div className={s.title}>Мы используем cookie</div>
        <p className={s.text}>
          Они нужны, чтобы работал вход в аккаунт и сохранялись настройки. Продолжая, ты
          соглашаешься с{' '}
          <Link to="/legal/privacy" className={s.link}>
            политикой обработки данных
          </Link>
          .
        </p>
      </div>
      <button type="button" className={s.btn} onClick={accept}>
        Хорошо
      </button>
    </div>
  )
}
