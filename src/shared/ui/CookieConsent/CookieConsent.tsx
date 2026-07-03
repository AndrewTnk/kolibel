import { useState } from 'react'
import { Link } from 'react-router-dom'
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

/**
 * Баннер согласия на cookie/localStorage (152-ФЗ: идентификаторы = персональные данные).
 * Показывается, пока пользователь не нажал «Хорошо»; факт согласия хранится
 * в localStorage с датой (пригодится как доказательство согласия).
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(() => !hasConsent())

  if (!visible) return null

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString())
    } catch {
      /* приватный режим — просто скрываем до перезагрузки */
    }
    setVisible(false)
  }

  return (
    <div className={s.bar} role="region" aria-label="Использование cookie">
      <p className={s.text}>
        Kolibel использует cookie и localStorage, чтобы работал вход в аккаунт и сохранялись
        настройки. Продолжая пользоваться сервисом, ты соглашаешься с{' '}
        <Link to="/legal/privacy" className={s.link}>
          политикой обработки данных
        </Link>
        .
      </p>
      <button type="button" className={s.btn} onClick={accept}>
        Хорошо
      </button>
    </div>
  )
}
