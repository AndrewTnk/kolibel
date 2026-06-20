import type { LanguageItem } from '../model/types'
import { Autocomplete } from '../../../shared/ui/Autocomplete/Autocomplete'
import { languageLevels, languageSuggestions } from '../lib/suggestions'
import f from './ProfileFields.module.css'

type Props = {
  value: LanguageItem[]
  onChange: (items: LanguageItem[]) => void
}

export function LanguagesEditor({ value, onChange }: Props) {
  function update(idx: number, patch: Partial<LanguageItem>) {
    onChange(value.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }
  function add() {
    onChange([...value, { name: '', level: '' }])
  }

  return (
    <div className={f.field}>
      {value.map((item, idx) => (
        <div key={idx} className={f.row}>
          <Autocomplete
            value={item.name}
            onChange={(name) => update(idx, { name })}
            onSelect={(name) => update(idx, { name })}
            suggestions={languageSuggestions}
            inputClassName={f.input}
            placeholder="Язык (напр. Английский)"
            ariaLabel="Язык"
          />
          <div className={f.skillAdd}>
            <Autocomplete
              value={item.level}
              onChange={(level) => update(idx, { level })}
              onSelect={(level) => update(idx, { level })}
              suggestions={languageLevels}
              showAllOnFocus
              inputClassName={f.input}
              placeholder="Уровень (напр. B2)"
              ariaLabel="Уровень языка"
            />
            <button
              type="button"
              className={f.expRemove}
              onClick={() => remove(idx)}
              aria-label="Удалить язык"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button type="button" className={f.addExpBtn} onClick={add}>
        + Добавить язык
      </button>
    </div>
  )
}
