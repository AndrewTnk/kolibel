import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
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

function Group({
  label,
  items,
  avatars,
}: {
  label: string
  items: CompanyContact[]
  avatars: Record<string, string>
}) {
  if (!items.length) return null
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{label}</div>
      {items.map((c) => {
        // Свежее фото из профиля (по userId) → фолбэк на денормализованный снимок контакта.
        const photo = (c.userId ? avatars[c.userId] : undefined) ?? c.avatar
        const inner = (
          <>
            <div className={styles.avatar} aria-hidden>
              {photo ? <img src={photo} alt="" /> : initials(c.name)}
            </div>
            <div className={styles.meta}>
              <div className={styles.name}>{c.name || 'Без имени'}</div>
              {c.position ? <div className={styles.position}>{c.position}</div> : null}
            </div>
          </>
        )
        // Привязан профиль — карточка кликабельна (переход в профиль пользователя).
        return c.userId ? (
          <Link key={c.id} to={`/u/${c.userId}`} className={[styles.person, styles.personLink].join(' ')}>
            {inner}
          </Link>
        ) : (
          <div key={c.id} className={styles.person}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}

/** Блок «Контакты» компании (основатели + HR). Скрыт, если контактов нет.
 *  Без пропа `contacts` берёт данные текущей компании из стора. */
export function CompanyContacts({ contacts: contactsProp }: { contacts?: CompanyContact[] } = {}) {
  const storeContacts = useAppSelector((s) => s.company.profile.contacts)
  const contacts = contactsProp ?? storeContacts
  const named = contacts.filter((c) => c.name.trim())

  // Актуальные аватары привязанных профилей (денормализованный снимок может устареть,
  // если пользователь сменил фото после привязки контакта).
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const userIds = named.map((c) => c.userId).filter((x): x is string => !!x)
  const idsKey = [...new Set(userIds)].sort().join(',')
  useEffect(() => {
    if (!idsKey) return
    let alive = true
    void supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', idsKey.split(','))
      .then(({ data }) => {
        if (!alive || !data) return
        const map: Record<string, string> = {}
        for (const p of data as { id: string; avatar_url: string | null }[]) {
          if (p.avatar_url) map[p.id] = p.avatar_url
        }
        setAvatars(map)
      })
    return () => {
      alive = false
    }
  }, [idsKey])

  if (!named.length) return null

  const founders = named.filter((c) => c.kind === 'founder')
  const hr = named.filter((c) => c.kind === 'hr')

  return (
    <div className={styles.card}>
      <div className={styles.title}>Контакты</div>
      <Group label="Основатели" items={founders} avatars={avatars} />
      <Group label="HR" items={hr} avatars={avatars} />
    </div>
  )
}
