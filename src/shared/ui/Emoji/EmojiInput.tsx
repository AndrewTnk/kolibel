import { forwardRef, useImperativeHandle, useRef } from 'react'
import { appleEmojiUrl, EMOJI_RE } from '../../lib/emoji'
import styles from './EmojiInput.module.css'

export type EmojiInputHandle = {
  focus: () => void
  /** Текст с эмодзи как юникод (картинки → их символы). */
  getText: () => string
  clear: () => void
  /** Заполнить поле текстом (эмодзи → картинки). Для режима редактирования. */
  setText: (text: string) => void
  /** Вставить эмодзи картинкой в позицию каретки. */
  insertEmoji: (ch: string) => void
}

type Props = {
  placeholder?: string
  className?: string
  /** Enter без Shift — отправка. */
  onEnter: () => void
  /** Колбэк при изменении содержимого (передаёт «пусто ли»). */
  onChange?: (empty: boolean) => void
}

/** Создаёт inline-картинку эмодзи (атомарную для каретки), с фолбэком на символ. */
function makeEmojiImg(ch: string): HTMLImageElement {
  const img = document.createElement('img')
  img.src = appleEmojiUrl(ch)
  img.alt = ch
  img.dataset.e = ch
  img.draggable = false
  img.contentEditable = 'false'
  img.className = styles.emoji
  img.onerror = () => {
    img.replaceWith(document.createTextNode(ch))
  }
  return img
}

function isBlock(node: Node): boolean {
  return node.nodeName === 'DIV' || node.nodeName === 'P'
}

/** Сериализация contentEditable → текст (img → символ, br/блоки → \n). */
function readText(root: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? ''
      else if (n.nodeName === 'IMG') out += (n as HTMLImageElement).dataset.e ?? (n as HTMLImageElement).alt ?? ''
      else if (n.nodeName === 'BR') out += '\n'
      else {
        if (isBlock(n) && out && !out.endsWith('\n')) out += '\n'
        walk(n)
      }
    })
  }
  walk(root)
  return out
}

function placeCaretEnd(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/**
 * Поле ввода с inline-картинками эмодзи (Apple-набор) — чтобы при наборе эмодзи
 * выглядели как в Telegram, а не системным шрифтом. На вводе/вставке конвертирует
 * текстовые эмодзи в картинки. Enter — отправка, Shift+Enter — перенос строки.
 */
export const EmojiInput = forwardRef<EmojiInputHandle, Props>(function EmojiInput(
  { placeholder, className, onEnter, onChange },
  ref,
) {
  const elRef = useRef<HTMLDivElement | null>(null)

  function emitChange() {
    const el = elRef.current
    if (!el) return
    const empty = readText(el).trim() === ''
    // Убираем «мусорные» <br>, оставшиеся после очистки, чтобы плейсхолдер показывался.
    if (empty && el.innerHTML !== '') el.innerHTML = ''
    onChange?.(empty)
  }

  /** Конвертирует текстовые эмодзи в картинки; при замене ставит каретку в конец. */
  function convert() {
    const el = elRef.current
    if (!el) return
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) textNodes.push(n as Text)

    let changed = false
    for (const tn of textNodes) {
      const txt = tn.textContent ?? ''
      EMOJI_RE.lastIndex = 0
      if (!EMOJI_RE.test(txt)) continue
      changed = true
      const frag = document.createDocumentFragment()
      let last = 0
      EMOJI_RE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = EMOJI_RE.exec(txt)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)))
        frag.appendChild(makeEmojiImg(m[0]))
        last = m.index + m[0].length
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)))
      tn.replaceWith(frag)
    }
    if (changed && el) placeCaretEnd(el)
  }

  function insertAtCaret(node: Node) {
    const el = elRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    let range: Range
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0)
      range.deleteContents()
    } else {
      range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
    }
    range.insertNode(node)
    // каретка после вставленного узла
    range.setStartAfter(node)
    range.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  useImperativeHandle(ref, () => ({
    focus: () => elRef.current?.focus(),
    getText: () => (elRef.current ? readText(elRef.current) : ''),
    clear: () => {
      if (elRef.current) elRef.current.innerHTML = ''
      onChange?.(true)
    },
    setText: (text) => {
      const el = elRef.current
      if (!el) return
      el.innerHTML = ''
      if (text) el.appendChild(document.createTextNode(text))
      convert()
      placeCaretEnd(el)
      emitChange()
    },
    insertEmoji: (ch) => {
      insertAtCaret(makeEmojiImg(ch))
      emitChange()
    },
  }))

  return (
    <div
      ref={elRef}
      className={[styles.input, className].filter(Boolean).join(' ')}
      contentEditable
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder}
      data-ph={placeholder}
      suppressContentEditableWarning
      onInput={() => {
        convert()
        emitChange()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (e.shiftKey) {
            e.preventDefault()
            document.execCommand('insertLineBreak')
          } else {
            e.preventDefault()
            onEnter()
          }
        }
      }}
      onPaste={(e) => {
        // Вставляем как простой текст (без чужого HTML), потом конвертируем эмодзи.
        e.preventDefault()
        const t = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, t)
      }}
    />
  )
})
