import { useState } from 'react'
import { EMOJI_CATEGORIES } from '../../lib/emoji'
import { Emoji } from '../Emoji/Emoji'
import styles from './EmojiPicker.module.css'

/**
 * Пикер эмодзи в стиле Telegram: вкладки-категории сверху + прокручиваемая сетка.
 * Нативные юникод-эмодзи (рендерятся системно). `onPick` вставляет символ.
 */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [cat, setCat] = useState(EMOJI_CATEGORIES[0].id)
  const active = EMOJI_CATEGORIES.find((c) => c.id === cat) ?? EMOJI_CATEGORIES[0]

  return (
    <div className={styles.picker}>
      <div className={styles.tabs}>
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={[styles.tab, c.id === cat ? styles.tabActive : ''].filter(Boolean).join(' ')}
            onClick={() => setCat(c.id)}
            aria-label={c.label}
            title={c.label}
          >
            <Emoji ch={c.icon} size={20} />
          </button>
        ))}
      </div>
      <div className={styles.grid} role="listbox" aria-label={active.label}>
        {active.emojis.map((em, i) => (
          <button
            key={`${em}-${i}`}
            type="button"
            className={styles.item}
            onClick={() => onPick(em)}
          >
            <Emoji ch={em} size={26} />
          </button>
        ))}
      </div>
    </div>
  )
}
