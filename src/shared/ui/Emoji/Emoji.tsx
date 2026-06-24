import { useState } from 'react'
import { appleEmojiUrl } from '../../lib/emoji'

/**
 * Один эмодзи картинкой из Apple-набора (как в Telegram). Если картинка не
 * загрузилась (нет в наборе) — откатываемся на системный символ.
 * Размер по умолчанию в `em` — масштабируется вместе с текстом.
 */
export function Emoji({ ch, size }: { ch: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span>{ch}</span>
  const dim = size ? `${size}px` : '1.25em'
  return (
    <img
      src={appleEmojiUrl(ch)}
      alt={ch}
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: dim,
        height: dim,
        display: 'inline-block',
        verticalAlign: '-0.2em',
        objectFit: 'contain',
      }}
    />
  )
}
