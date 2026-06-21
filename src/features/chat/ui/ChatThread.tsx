import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { ChatAttach, ChatConversation, ChatMessage } from '../model/types'
import { dayKey, formatDaySeparator, formatMessageTime } from '../lib/format'
import { useChatAttach } from '../lib/useChatAttach'
import { ChatAvatar } from './ChatAvatar'
import { ChatAttachView } from './ChatAttachView'
import { ChatIco } from './chatIcons'
import { CompanyBadge } from '../../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './Chat.module.css'

export type SendExtras = { replyTo?: ChatMessage['replyTo']; attach?: ChatAttach | null }

type Props = {
  conversation: ChatConversation
  onSend: (text: string, extras?: SendExtras) => void
  onBack?: () => void
  onToggleReaction?: (messageId: string, emoji: string) => void
  onDelete?: () => void
  onTogglePin?: () => void
  onToggleMute?: () => void
}

const EMOJI_SET = ['😀', '😂', '😍', '😎', '🤔', '🙏', '👍', '👏', '🔥', '✨', '💯', '🎉', '❤️', '💪', '✅', '🚀', '📌', '💬', '🤝', '😅', '😉', '😇', '🥳', '🤩']
const REACTION_SET = ['👍', '❤️', '🔥', '🎉', '👏', '😂', '🤔']

type Ctx = { msg: ChatMessage; x: number; y: number; reactionsOnly: boolean }

export function ChatThread({
  conversation,
  onSend,
  onBack,
  onToggleReaction,
  onDelete,
  onTogglePin,
  onToggleMute,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [headMenu, setHeadMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [ctx, setCtx] = useState<Ctx | null>(null)

  // Автоскролл вниз — через scrollTop, не scrollIntoView (не ломает страничный скролл).
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation.id, conversation.messages.length])

  // Авто-рост textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  // Закрытие поповеров/меню по клику вне и Esc
  useEffect(() => {
    function onDocClick() {
      setAttachOpen(false)
      setEmojiOpen(false)
      setHeadMenu(false)
      setCtx(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAttachOpen(false)
        setEmojiOpen(false)
        setHeadMenu(false)
        setCtx(null)
        setReplyTo(null)
        setConfirmDelete(false)
      }
    }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function replySnapshot(m: ChatMessage): ChatMessage['replyTo'] {
    return {
      author: m.sender === 'me' ? 'Вы' : conversation.title,
      text: m.text || m.attach?.title || '',
      sender: m.sender,
    }
  }

  function send() {
    const t = text.trim()
    if (!t) return
    onSend(t, { replyTo: replyTo ? replySnapshot(replyTo) : null })
    setText('')
    setReplyTo(null)
    setAttachOpen(false)
    setEmojiOpen(false)
  }

  // Вложения (загрузка фото/видео/документа в Storage + прикрепление вакансии) — общий хук.
  const att = useChatAttach((text, attach) => {
    onSend(text, { attach, replyTo: replyTo ? replySnapshot(replyTo) : null })
    setReplyTo(null)
    setAttachOpen(false)
  })

  // Юзер: фото и документ. Компания: + вакансия (своя). Гео/контакт убраны.
  const ATTACH_ITEMS: { icon: keyof typeof ChatIco; label: string; run: () => void }[] = [
    { icon: 'photo', label: 'Фото или видео', run: () => { att.pickPhoto(); setAttachOpen(false) } },
    { icon: 'doc', label: 'Документ', run: () => { att.pickDoc(); setAttachOpen(false) } },
    ...(att.isCompany ? [{ icon: 'briefcase' as const, label: 'Вакансия', run: () => att.setAttachMode('vacancy') }] : []),
  ]

  const messages = conversation.messages

  return (
    <div className={styles.threadCol}>
      <div className={styles.threadHead}>
        {onBack ? (
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Назад">
            ←
          </button>
        ) : null}
        {conversation.otherId ? (
          <Link to={`/u/${conversation.otherId}`} className={styles.threadAvatarLink} aria-label={conversation.title}>
            <ChatAvatar
              name={conversation.title}
              avatar={conversation.avatar}
              size={42}
              square={conversation.type === 'company'}
            />
          </Link>
        ) : (
          <ChatAvatar
            name={conversation.title}
            avatar={conversation.avatar}
            size={42}
            square={conversation.type === 'company'}
          />
        )}
        <div className={styles.threadMeta}>
          <div className={styles.threadNameRow}>
            {conversation.otherId ? (
              <Link to={`/u/${conversation.otherId}`} className={[styles.threadName, styles.threadTitleLink].join(' ')}>
                {conversation.title}
              </Link>
            ) : (
              <div className={styles.threadName}>{conversation.title}</div>
            )}
            <CompanyBadge logo={conversation.companyLogo} title={conversation.company} size={15} />
          </div>
          {conversation.subtitle ? <div className={styles.threadStatus}>{conversation.subtitle}</div> : null}
        </div>
        <div className={styles.threadHeadBtns}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={styles.tBtn}
              title="Ещё"
              aria-label="Ещё"
              onClick={(e) => {
                e.stopPropagation()
                setHeadMenu((v) => !v)
              }}
            >
              <ChatIco.more />
            </button>
            {headMenu ? (
              <div
                className={styles.ctxMenu}
                style={{ position: 'absolute', top: 42, right: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {onTogglePin ? (
                  <button
                    type="button"
                    className={styles.ctxRow}
                    onClick={() => {
                      onTogglePin()
                      setHeadMenu(false)
                    }}
                  >
                    <ChatIco.pin /> {conversation.pinned ? 'Открепить' : 'Закрепить'}
                  </button>
                ) : null}
                {onToggleMute ? (
                  <button
                    type="button"
                    className={styles.ctxRow}
                    onClick={() => {
                      onToggleMute()
                      setHeadMenu(false)
                    }}
                  >
                    <ChatIco.mute /> {conversation.muted ? 'Включить уведомления' : 'Без звука'}
                  </button>
                ) : null}
                {onDelete ? (
                  <>
                    <div className={styles.ctxDiv} />
                    <button
                      type="button"
                      className={[styles.ctxRow, styles.ctxRowDanger].join(' ')}
                      onClick={() => {
                        setConfirmDelete(true)
                        setHeadMenu(false)
                      }}
                    >
                      <ChatIco.trash /> Удалить чат
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.canvas} ref={canvasRef}>
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
          const tailHide = !!next && next.sender === m.sender && next.createdAt - m.createdAt < 5 * 60 * 1000
          return (
            <div key={m.id}>
              {showDay ? (
                <div className={styles.daySep}>
                  <span className={styles.daySepPill}>{formatDaySeparator(m.createdAt)}</span>
                </div>
              ) : null}
              <div
                className={[styles.msgRow, m.sender === 'me' ? styles.msgMe : styles.msgThem, tailHide ? styles.tailHide : ''].join(' ')}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setCtx({ msg: m, x: e.clientX, y: e.clientY, reactionsOnly: false })
                }}
              >
                {m.sender === 'me' ? (
                  <div className={styles.msgQuick}>
                    <button type="button" title="Ответить" onClick={(e) => { e.stopPropagation(); setReplyTo(m) }}>
                      <ChatIco.reply />
                    </button>
                    <button type="button" title="Реакция" onClick={(e) => { e.stopPropagation(); setCtx({ msg: m, x: e.clientX, y: e.clientY, reactionsOnly: true }) }}>
                      <ChatIco.smile width={14} height={14} />
                    </button>
                  </div>
                ) : null}
                <div className={styles.bubbleWrap}>
                  <div className={styles.bubble}>
                    {m.replyTo ? (
                      <div className={styles.replyChip}>
                        <div className={styles.replyChipAu}>{m.replyTo.author ?? 'Вы'}</div>
                        <div className={styles.replyChipTx}>{m.replyTo.text}</div>
                      </div>
                    ) : null}
                    {m.attach ? <ChatAttachView attach={m.attach} /> : null}
                    {m.text ? <span className={styles.txt}>{m.text}</span> : null}
                    <span className={styles.meta}>
                      {formatMessageTime(m.createdAt)}
                      {m.sender === 'me' ? (
                        <span className={[styles.check, m.readAt ? styles.checkRead : ''].join(' ')}>
                          {m.readAt ? <ChatIco.check2 width={16} height={11} /> : <ChatIco.check1 width={14} height={11} />}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {m.reactions && m.reactions.length ? (
                    <div className={styles.reactions}>
                      {m.reactions.map((r) => (
                        <button
                          type="button"
                          key={r.em}
                          className={[styles.rx, r.mine ? styles.rxMine : ''].join(' ')}
                          onClick={(e) => { e.stopPropagation(); onToggleReaction?.(m.id, r.em) }}
                        >
                          {r.em} {r.count}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {m.sender === 'them' ? (
                  <div className={styles.msgQuick}>
                    <button type="button" title="Ответить" onClick={(e) => { e.stopPropagation(); setReplyTo(m) }}>
                      <ChatIco.reply />
                    </button>
                    <button type="button" title="Реакция" onClick={(e) => { e.stopPropagation(); setCtx({ msg: m, x: e.clientX, y: e.clientY, reactionsOnly: true }) }}>
                      <ChatIco.smile width={14} height={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {replyTo ? (
        <div className={styles.replyBar}>
          <div className={styles.replyAccent} />
          <div className={styles.replyBody}>
            <div className={styles.replyAu}>Ответ — {replyTo.sender === 'me' ? 'себе' : conversation.title}</div>
            <div className={styles.replyTx}>{replyTo.text || replyTo.attach?.title}</div>
          </div>
          <button type="button" className={styles.composerBtn} onClick={() => setReplyTo(null)} aria-label="Отменить ответ">
            <ChatIco.close />
          </button>
        </div>
      ) : null}

      <div className={styles.composer}>
        <div className={styles.composerInner} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.composerBtn}
            title="Прикрепить"
            onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); att.setAttachMode('main') }}
          >
            <ChatIco.attach />
          </button>
          <input ref={att.fileRef} type="file" hidden onChange={att.onFileChange} />
          <textarea
            ref={textareaRef}
            className={styles.composerTextarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Сообщение…"
            rows={1}
          />
          <button
            type="button"
            className={styles.composerBtn}
            title="Эмодзи"
            onClick={() => { setEmojiOpen((v) => !v); setAttachOpen(false) }}
          >
            <ChatIco.smile />
          </button>

          {attachOpen ? (
            <div className={styles.attachPop} onClick={(e) => e.stopPropagation()}>
              {att.attachMode === 'vacancy' ? (
                <>
                  <button type="button" className={styles.attachBack} onClick={() => att.setAttachMode('main')}>
                    ‹ Вакансия
                  </button>
                  {att.vacancies.length ? (
                    att.vacancies.map((v) => (
                      <button
                        type="button"
                        key={v.id}
                        className={styles.attachItem}
                        onClick={() => {
                          att.sendVacancy(v)
                          setAttachOpen(false)
                        }}
                      >
                        {v.title}
                      </button>
                    ))
                  ) : (
                    <div className={styles.attachEmpty}>Нет вакансий</div>
                  )}
                </>
              ) : (
                ATTACH_ITEMS.map((it) => {
                  const Icon = ChatIco[it.icon]
                  return (
                    <button type="button" key={it.label} className={styles.attachItem} onClick={it.run}>
                      <span className={styles.ic}>
                        <Icon />
                      </span>
                      {it.label}
                    </button>
                  )
                })
              )}
            </div>
          ) : null}

          {emojiOpen ? (
            <div className={styles.emojiPop} onClick={(e) => e.stopPropagation()}>
              <div className={styles.emojiPopTitle}>Часто используемые</div>
              <div className={styles.emojiGrid}>
                {EMOJI_SET.map((e) => (
                  <button type="button" key={e} onClick={() => setText((t) => t + e)}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.sendBtn}
          onClick={send}
          disabled={!text.trim()}
          aria-label="Отправить"
        >
          <ChatIco.send />
        </button>
      </div>

      {ctx
        ? createPortal(
            <div
              className={styles.ctxMenu}
              style={{
                left: Math.min(ctx.x, window.innerWidth - 230),
                top: Math.min(ctx.y, window.innerHeight - 240),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.ctxReactions}>
                {REACTION_SET.map((em) => (
                  <button
                    type="button"
                    key={em}
                    className={styles.em}
                    onClick={() => {
                      onToggleReaction?.(ctx.msg.id, em)
                      setCtx(null)
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
              {!ctx.reactionsOnly ? (
                <>
                  <div className={styles.ctxDiv} />
                  <button
                    type="button"
                    className={styles.ctxRow}
                    onClick={() => {
                      setReplyTo(ctx.msg)
                      setCtx(null)
                    }}
                  >
                    <ChatIco.reply /> Ответить
                  </button>
                  <button
                    type="button"
                    className={styles.ctxRow}
                    onClick={() => {
                      void navigator.clipboard?.writeText(ctx.msg.text)
                      setCtx(null)
                    }}
                  >
                    <ChatIco.copy /> Копировать
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {confirmDelete && onDelete
        ? createPortal(
            <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(false)}>
              <div
                className={styles.confirmBox}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.confirmTitle}>Удалить чат?</div>
                <div className={styles.confirmText}>
                  Переписка с «{conversation.title}» будет удалена без возможности восстановления.
                </div>
                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    className={styles.confirmCancel}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className={styles.confirmDelete}
                    onClick={() => {
                      setConfirmDelete(false)
                      onDelete()
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
