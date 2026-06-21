import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { loadNetwork } from '../../network/model/networkThunks'
import { ChatAvatar } from './ChatAvatar'
import { ChatIco } from './chatIcons'
import styles from './Chat.module.css'

type Contact = { id: string; name: string; role: string; avatar?: string; kind: 'person' | 'company' }

/** Модалка «Новый чат»: контакты из сети (подписки + подписчики) с поиском. */
export function NewChatModal({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (id: string) => void
}) {
  const dispatch = useAppDispatch()
  const followingPeople = useAppSelector((s) => s.network.followingPeople)
  const followingCompanies = useAppSelector((s) => s.network.followingCompanies)
  const followers = useAppSelector((s) => s.network.followers)
  const status = useAppSelector((s) => s.network.status)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (status === 'idle') void dispatch(loadNetwork())
  }, [status, dispatch])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const contacts = useMemo<Contact[]>(() => {
    const map = new Map<string, Contact>()
    for (const p of [...followingPeople, ...followers]) {
      if (!map.has(p.id)) {
        map.set(p.id, {
          id: p.id,
          name: p.fullName,
          role: [p.jobTitle, p.company].filter(Boolean).join(' · '),
          avatar: p.avatar,
          kind: p.isCompany ? 'company' : 'person',
        })
      }
    }
    // Компании, на которые я подписан (отдельный массив в network slice).
    for (const c of followingCompanies) {
      if (!map.has(c.id)) {
        map.set(c.id, {
          id: c.id,
          name: c.name,
          role: c.field,
          avatar: c.logo,
          kind: 'company',
        })
      }
    }
    return [...map.values()]
  }, [followingPeople, followingCompanies, followers])

  const query = q.trim().toLowerCase()
  const filtered = query
    ? contacts.filter((c) => `${c.name} ${c.role}`.toLowerCase().includes(query))
    : contacts

  return createPortal(
    <div className={styles.scrim} onClick={onClose} role="dialog" aria-modal>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mHead}>
          <div className={styles.mTitle}>Новый чат</div>
          <button className={styles.mClose} onClick={onClose} aria-label="Закрыть">
            <ChatIco.close />
          </button>
        </div>
        <div className={styles.mBody}>
          <div className={styles.modalSearch}>
            <ChatIco.search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Имя, должность, компания"
              autoFocus
            />
          </div>
          <div className={styles.contactList}>
            {filtered.length ? (
              filtered.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={styles.contactRow}
                  onClick={() => onPick(c.id)}
                >
                  <ChatAvatar name={c.name} avatar={c.avatar} square={c.kind === 'company'} size={44} id={c.id} />
                  <div className={styles.cMeta}>
                    <div className={styles.cName}>{c.name}</div>
                    {c.role ? <div className={styles.cRole}>{c.role}</div> : null}
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.modalEmpty}>
                {contacts.length ? 'Никого не нашли' : 'В твоей сети пока нет контактов'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
