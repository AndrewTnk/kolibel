import { Link } from 'react-router-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { supportUiActions } from '../../../features/support/model/supportUiSlice'
import styles from './Recommendations.module.css'

export function SupportLinks() {
  const dispatch = useAppDispatch()
  return (
    <div className={styles.footer}>
      <nav className={styles.linkList} aria-label="О сервисе и поддержка">
        <a className={styles.linkRow} href="#" onClick={(e) => e.preventDefault()}>
          О нас
        </a>
        {/* Обращения в поддержку (обсуждения) — модалка со списком/перепиской. */}
        <button
          type="button"
          className={styles.linkRow}
          onClick={() => dispatch(supportUiActions.openSupport())}
        >
          Тех. поддержка
        </button>
        <Link className={styles.linkRow} to="/legal/terms">
          Правовая информация
        </Link>
      </nav>

      <div className={styles.footerBrand}>
        <img src="/logo/kolibel-mark.png" alt="Kolibel" className={styles.footerBrandImg} />
      </div>
    </div>
  )
}
