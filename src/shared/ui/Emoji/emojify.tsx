import type { ReactNode } from 'react'
import { EMOJI_RE } from '../../lib/emoji'
import { Emoji } from './Emoji'

/**
 * Заменяет эмодзи в тексте на картинки Apple-набора (как в Telegram), сохраняя
 * обычный текст между ними. Возвращает массив узлов для рендера.
 * Использовать там, где показываем пользовательский текст (сообщения/комментарии/посты).
 */
export function emojify(text: string | undefined | null): ReactNode {
  if (!text) return text
  const parts: ReactNode[] = []
  let last = 0
  // EMOJI_RE — глобальный; сбрасываем lastIndex на всякий случай.
  EMOJI_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = EMOJI_RE.exec(text)) !== null) {
    const offset = m.index
    if (offset > last) parts.push(text.slice(last, offset))
    parts.push(<Emoji key={offset} ch={m[0]} />)
    last = offset + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
