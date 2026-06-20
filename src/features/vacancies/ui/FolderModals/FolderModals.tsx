import { useState } from 'react'
import { RecModal } from '../../../../shared/ui/Recommendations/RecModal'
import type { VacancyFolder } from '../../model/types'
import styles from './FolderModals.module.css'

export const FOLDER_COLORS = ['#ff7f50', '#3b82f6', '#16a34a', '#a855f7', '#d97706', '#ef4444']

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

type VacOption = { id: string; title: string; sub: string }

/** Создать папку: имя + цвет + начальный набор вакансий. */
export function CreateFolderModal({
  vacancies,
  onCreate,
  onClose,
}: {
  vacancies: VacOption[]
  onCreate: (input: { name: string; color: string; vacIds: string[] }) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0])
  const [vacIds, setVacIds] = useState<string[]>([])
  const toggle = (id: string) =>
    setVacIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <RecModal title="Новая папка" onClose={onClose} maxWidth={520}>
      <div className={styles.subtitle}>Сгруппируй вакансии — например, по приоритету или проекту</div>

      <label className={styles.field}>
        <span className={styles.label}>Название папки</span>
        <input
          className={styles.input}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Срочный наём"
        />
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Цвет</span>
        <div className={styles.colorRow}>
          {FOLDER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={[styles.colorDot, color === c ? styles.colorOn : ''].filter(Boolean).join(' ')}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Цвет ${c}`}
            />
          ))}
        </div>
      </div>

      {vacancies.length ? (
        <div className={styles.field}>
          <span className={styles.label}>Добавить вакансии</span>
          <div className={styles.hint}>Можно сделать и позже — кнопкой «папка» на карточке</div>
          <div className={styles.assignList}>
            {vacancies.map((v) => (
              <button
                key={v.id}
                type="button"
                className={[styles.assignRow, vacIds.includes(v.id) ? styles.assignOn : ''].filter(Boolean).join(' ')}
                onClick={() => toggle(v.id)}
              >
                <span className={styles.check}>{vacIds.includes(v.id) ? <CheckIcon /> : null}</span>
                <span className={styles.assignName}>{v.title}</span>
                <span className={styles.assignSub}>{v.sub}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.foot}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Отмена
        </button>
        <button
          type="button"
          className={styles.confirm}
          disabled={!name.trim()}
          onClick={() => onCreate({ name: name.trim(), color, vacIds })}
        >
          Создать папку
        </button>
      </div>
    </RecModal>
  )
}

/** Добавить вакансию в папки (чекбоксы) + создать новую. */
export function AssignFolderModal({
  vacancyTitle,
  vacancyId,
  folders,
  onToggle,
  onNew,
  onClose,
}: {
  vacancyTitle: string
  vacancyId: string
  folders: VacancyFolder[]
  onToggle: (folderId: string, present: boolean) => void
  onNew: () => void
  onClose: () => void
}) {
  return (
    <RecModal title="Папки вакансии" onClose={onClose} maxWidth={460}>
      <div className={styles.subtitle}>{vacancyTitle}</div>

      {folders.length ? (
        <div className={styles.assignList}>
          {folders.map((f) => {
            const inIt = f.vacIds.includes(vacancyId)
            return (
              <button
                key={f.id}
                type="button"
                className={[styles.assignRow, inIt ? styles.assignOn : ''].filter(Boolean).join(' ')}
                onClick={() => onToggle(f.id, !inIt)}
              >
                <span className={styles.check}>{inIt ? <CheckIcon /> : null}</span>
                <span className={styles.folderDot} style={{ background: f.color }} />
                <span className={styles.assignName}>{f.name}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className={styles.empty}>Папок пока нет — создай первую.</div>
      )}

      <button type="button" className={styles.newFolder} onClick={onNew}>
        + Создать новую папку
      </button>

      <div className={styles.foot}>
        <button type="button" className={styles.confirm} onClick={onClose}>
          Готово
        </button>
      </div>
    </RecModal>
  )
}
