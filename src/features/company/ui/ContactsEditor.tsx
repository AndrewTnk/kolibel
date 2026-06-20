import type { CompanyContact } from '../model/companyData'
import f from '../../profile/ui/ProfileFields.module.css'
import styles from './ContactsEditor.module.css'

type Props = {
  value: CompanyContact[]
  onChange: (next: CompanyContact[]) => void
}

function newContact(kind: CompanyContact['kind']): CompanyContact {
  return { id: crypto.randomUUID(), kind, name: '', position: '' }
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
              <input
                className={f.input}
                value={c.name}
                onChange={(e) => update(c.id, { name: e.target.value })}
                placeholder="Имя"
              />
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
