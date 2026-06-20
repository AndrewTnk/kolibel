import { useAppSelector } from '../../../app/store/hooks'
import type { CompanyContact } from '../model/companyData'
import styles from './CompanyContacts.module.css'

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}

function Group({ label, items }: { label: string; items: CompanyContact[] }) {
  if (!items.length) return null
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{label}</div>
      {items.map((c) => (
        <div key={c.id} className={styles.person}>
          <div className={styles.avatar} aria-hidden>
            {initials(c.name)}
          </div>
          <div className={styles.meta}>
            <div className={styles.name}>{c.name || 'Без имени'}</div>
            {c.position ? <div className={styles.position}>{c.position}</div> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Блок «Контакты» компании (основатели + HR). Скрыт, если контактов нет.
 *  Без пропа `contacts` берёт данные текущей компании из стора. */
export function CompanyContacts({ contacts: contactsProp }: { contacts?: CompanyContact[] } = {}) {
  const storeContacts = useAppSelector((s) => s.company.profile.contacts)
  const contacts = contactsProp ?? storeContacts
  const named = contacts.filter((c) => c.name.trim())
  if (!named.length) return null

  const founders = named.filter((c) => c.kind === 'founder')
  const hr = named.filter((c) => c.kind === 'hr')

  return (
    <div className={styles.card}>
      <div className={styles.title}>Контакты</div>
      <Group label="Основатели" items={founders} />
      <Group label="HR" items={hr} />
    </div>
  )
}
