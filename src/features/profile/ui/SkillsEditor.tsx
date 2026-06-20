import { useState } from 'react'
import { Autocomplete } from '../../../shared/ui/Autocomplete/Autocomplete'
import { skillSuggestions } from '../lib/suggestions'
import f from './ProfileFields.module.css'

type Props = {
  value: string[]
  onChange: (skills: string[]) => void
  label?: string
  /** Скрыть визуальную подпись (label остаётся для aria). */
  hideLabel?: boolean
  placeholder?: string
}

export function SkillsEditor({
  value,
  onChange,
  label = 'Навыки',
  hideLabel = false,
  placeholder = 'Начните вводить навык…',
}: Props) {
  const [draft, setDraft] = useState('')

  function addValue(raw: string) {
    const s = raw.trim()
    if (!s || value.includes(s)) {
      setDraft('')
      return
    }
    onChange([...value, s])
    setDraft('')
  }

  // Подсказки без уже добавленных
  const suggestions = skillSuggestions.filter((s) => !value.includes(s))

  return (
    <div className={f.field}>
      {hideLabel ? null : <span className={f.label}>{label}</span>}
      {value.length ? (
        <div className={f.skills}>
          {value.map((s) => (
            <span key={s} className={f.skillChip}>
              {s}
              <button
                type="button"
                className={f.skillRemove}
                onClick={() => onChange(value.filter((x) => x !== s))}
                aria-label={`Удалить ${s}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className={f.skillAdd}>
        <Autocomplete
          value={draft}
          onChange={setDraft}
          onSelect={addValue}
          onEnter={() => addValue(draft)}
          suggestions={suggestions}
          inputClassName={f.input}
          placeholder={placeholder}
          ariaLabel={label}
        />
        <button type="button" className={f.skillAddBtn} onClick={() => addValue(draft)}>
          Добавить
        </button>
      </div>
    </div>
  )
}
