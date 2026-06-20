import styles from './Recommendations.module.css'

const links = ['О нас', 'Тех. поддержка', 'Справочный центр']

export function SupportLinks() {
  return (
    <div className={styles.footer}>
      <nav className={styles.linkList} aria-label="О сервисе и поддержка">
        {links.map((label) => (
          <a key={label} className={styles.linkRow} href="#" onClick={(e) => e.preventDefault()}>
            {label}
          </a>
        ))}
      </nav>

      <div className={styles.footerBrand}>
        <img src="/logo/kolibel-mark.png" alt="Kolibel" className={styles.footerBrandImg} />
      </div>
    </div>
  )
}
