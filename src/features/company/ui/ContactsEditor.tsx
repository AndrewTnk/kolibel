import { useEffect, useRef, useState } from 'react'
import type { CompanyContact } from '../model/companyData'
import { searchEntities, type SearchPerson } from '../../search/lib/searchApi'
import f from '../../profile/ui/ProfileFields.module.css'
import styles from './ContactsEditor.module.css'

type Props = {
  value: CompanyContact[]
  onChange: (next: CompanyContact[]) => void
}

function newContact(kind: CompanyContact['kind']): CompanyContact {
  return { id: crypto.randomUUID(), kind, name: '', position: '' }
}

/** Поле имени контакта с поиском и привязкой к реальному профилю (userId + аватар). */
export function NameField({
  contact,
  onPatch,
}: {
  contact: CompanyContact
  onPatch: (patch: Partial<CompanyContact>) => void
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchPerson[]>([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // Поиск пользователей по вводу (дебаунс 250мс).
  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    const t = window.setTimeout(() => {
      void searchEntities(contact.name.trim())
        .then((r) => {
          if (alive) {
            setResults(r.people)
            setLoading(false)
          }
        })
        .catch(() => {
          if (alive) {
            setResults([])
            setLoading(false)
          }
        })
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [contact.name, open])

  // Закрытие выпадашки по клику вне.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(p: SearchPerson) {
    onPatch({ name: p.name, userId: p.id, avatar: p.avatar })
    setOpen(false)
  }

  return (
    <div className={styles.nameField} ref={boxRef}>
      <input
        className={f.input}
        value={contact.name}
        // Ручное редактирование текста сбрасывает привязку (имя больше не из профиля).
        onChange={(e) => onPatch({ name: e.target.value, userId: undefined, avatar: undefined })}
        onFocus={() => setOpen(true)}
        placeholder="Имя — найди пользователя"
      />
      {contact.userId ? (
        <span className={styles.linked} title="Привязан профиль" aria-hidden>
          ✓
        </span>
      ) : null}
      {open ? (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.ddEmpty}>Поиск…</div>
          ) : results.length ? (
            results.map((p) => (
              <button key={p.id} type="button" className={styles.ddItem} onClick={() => pick(p)}>
                <span className={styles.ddAva}>
                  {p.avatar ? <img src={p.avatar} alt="" /> : p.initials}
                </span>
                <span className={styles.ddMeta}>
                  <span className={styles.ddName}>{p.name}</span>
                  <span className={styles.ddSub}>{p.subtitle}</span>
                </span>
              </button>
            ))
          ) : (
            <div className={styles.ddEmpty}>Ничего не найдено</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ContactsEditor({ value, onChange }: Props) {
  function add(kind: CompanyContact['kind']) {
    onChange([...value, newContact(kind)])
  }
  function update(id: string, patch: Partial<CompanyContact>) {
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function remove(id: string) {
    onChange(value.filter((c) => c.id !== id))
  }

  return (
    <div className={styles.editor}>
      {value.length ? (
        <div className={styles.list}>
          {value.map((c) => (
            <div key={c.id} className={styles.row}>
              <select
                className={f.select}
                value={c.kind}
                onChange={(e) => update(c.id, { kind: e.target.value as CompanyContact['kind'] })}
                aria-label="Роль"
              >
                <option value="founder">Основатель</option>
                <option value="hr">HR</option>
              </select>
              <NameField contact={c} onPatch={(patch) => update(c.id, patch)} />
              <input
                className={f.input}
                value={c.position ?? ''}
                onChange={(e) => update(c.id, { position: e.target.value })}
                placeholder="Должность (необязательно)"
              />
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(c.id)}
                aria-label="Удалить контакт"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.addRow}>
        <button type="button" className={styles.addBtn} onClick={() => add('founder')}>
          + Основатель
        </button>
        <button type="button" className={styles.addBtn} onClick={() => add('hr')}>
          + HR
        </button>
      </div>
    </div>
  )
}
