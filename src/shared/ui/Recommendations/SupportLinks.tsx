import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { supportUiActions } from '../../../features/support/model/supportUiSlice'
import { fetchLatestUpdateId } from '../../../features/articles/lib/latestUpdate'
import styles from './Recommendations.module.css'

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  )
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 14a8 8 0 0 1 16 0" />
      <rect x="3" y="14" width="4.2" height="6" rx="1.6" />
      <rect x="16.8" y="14" width="4.2" height="6" rx="1.6" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5.2c0 4.4-2.9 7.6-7 8.8-4.1-1.2-7-4.4-7-8.8V6l7-3z" />
      <path d="M9.2 12l2 2 3.6-3.8" />
    </svg>
  )
}

/**
 * Футер-блок приложения (сайдбары + меню аккаунта на мобилке): пункты
 * «иконка + подпись» и копирайт. «Что нового» → последняя Update-статья
 * (скрыт, пока апдейтов нет); «Тех. поддержка» → модалка обращений;
 * «Правовая информация» → /legal.
 *
 * `horizontal` — вариант в одну линию для широких/одноколоночных страниц
 * (сеть): пункты слева, копирайт справа, тонкая линия сверху.
 */
export function SupportLinks({ horizontal = false }: { horizontal?: boolean }) {
  const dispatch = useAppDispatch()
  const [updateId, setUpdateId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void fetchLatestUpdateId().then((id) => {
      if (alive) setUpdateId(id)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className={[styles.footer, horizontal ? styles.footerRow : ''].filter(Boolean).join(' ')}>
      <nav className={styles.footNav} aria-label="О сервисе и поддержка">
        {updateId ? (
          <Link className={styles.footRow} to={`/article/${updateId}`}>
            <SparkIcon /> Что нового
          </Link>
        ) : null}
        <button
          type="button"
          className={styles.footRow}
          onClick={() => dispatch(supportUiActions.openSupport())}
        >
          <HeadsetIcon /> Тех. поддержка
        </button>
        <Link className={styles.footRow} to="/legal/terms">
          <ShieldIcon /> Правовая информация
        </Link>
      </nav>

      <div className={styles.footSep} />
      <div className={styles.footCopy}>© Kolibel, {new Date().getFullYear()}</div>
    </div>
  )
}
