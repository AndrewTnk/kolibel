import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Markdown } from '../../shared/ui/Markdown/Markdown'
import { LEGAL_DOCS, getLegalDoc } from '../../legal'
import s from './LegalPage.module.css'

/**
 * Правовая информация (/legal/:slug?) — публичная страница без авторизации:
 * соглашение, политика данных, согласия. Тексты — markdown в src/legal/*.md,
 * реквизиты владельца подставляются из src/legal/requisites.ts.
 */
export function LegalPage() {
  const { slug } = useParams()
  const doc = getLegalDoc(slug)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [doc.slug])

  return (
    <div className={s.page}>
      <header className={s.topbar}>
        <Link to="/" className={s.brand} aria-label="Kolibel — на главную">
          <img src="/logo/kolibel-full.png" alt="Kolibel" className={s.brandLight} />
          <img src="/logo/kolibel-full-dark.png" alt="Kolibel" className={s.brandDark} />
        </Link>
        <span className={s.topTitle}>Правовая информация</span>
      </header>

      <div className={s.layout}>
        <nav className={s.nav} aria-label="Документы">
          {LEGAL_DOCS.map((d) => (
            <Link
              key={d.slug}
              to={`/legal/${d.slug}`}
              className={[s.navItem, d.slug === doc.slug ? s.navItemActive : ''].join(' ')}
              aria-current={d.slug === doc.slug ? 'page' : undefined}
            >
              {d.short}
            </Link>
          ))}
        </nav>

        <main className={s.content}>
          <Markdown>{doc.body}</Markdown>
        </main>
      </div>
    </div>
  )
}
