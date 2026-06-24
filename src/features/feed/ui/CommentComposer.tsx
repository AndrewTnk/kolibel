import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { AuthorKind } from '../model/types'
import { AuthorAvatar } from './AuthorAvatar'
import { SendIcon } from './composerIcons'
import { EmojiPicker } from '../../../shared/ui/EmojiPicker/EmojiPicker'
import { EmojiInput, type EmojiInputHandle } from '../../../shared/ui/Emoji/EmojiInput'
import styles from './Feed.module.css'

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4 4 0 0 0 7 0" strokeLinecap="round" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

type Props = {
  onSend: (text: string) => void
  placeholder?: string
  /** Аватар слева (текущий пользователь). Если не задан — без аватара. */
  me?: { name: string; avatar?: string; kind?: AuthorKind }
}

/**
 * Композер комментария в стиле чат-инпута: поле с inline-эмодзи (Apple), эмодзи-пикер,
 * круглая кнопка отправки. Enter — отправить, Shift+Enter — перенос строки.
 * Ref проброшен (focus) — родитель может сфокусировать поле.
 */
export const CommentComposer = forwardRef<{ focus: () => void }, Props>(function CommentComposer(
  { onSend, placeholder = 'Оставь комментарий…', me },
  ref,
) {
  const [empty, setEmpty] = useState(true)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<EmojiInputHandle | null>(null)

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }))

  // Закрытие эмодзи по клику-вне.
  useEffect(() => {
    if (!emojiOpen) return
    function onDown(e: MouseEvent) {
      if (innerRef.current && !innerRef.current.contains(e.target as Node)) setEmojiOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [emojiOpen])

  function send() {
    const t = inputRef.current?.getText().trim()
    if (!t) return
    onSend(t)
    inputRef.current?.clear()
    setEmpty(true)
    setEmojiOpen(false)
  }

  return (
    <form
      className={styles.ccForm}
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      {me ? <AuthorAvatar name={me.name} avatar={me.avatar} kind={me.kind} size={36} /> : null}

      <div className={styles.ccInner} ref={innerRef}>
        <EmojiInput ref={inputRef} placeholder={placeholder} onEnter={send} onChange={setEmpty} />
        <button
          type="button"
          className={styles.ccEmojiBtn}
          aria-label="Эмодзи"
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <SmileIcon />
        </button>
        {emojiOpen ? (
          <div className={styles.ccEmojiPop}>
            <EmojiPicker
              onPick={(em) => {
                inputRef.current?.insertEmoji(em)
                setEmpty(false)
              }}
            />
          </div>
        ) : null}
      </div>

      <button className={styles.ccSend} type="submit" disabled={empty} aria-label="Отправить">
        <SendIcon />
      </button>
    </form>
  )
})
