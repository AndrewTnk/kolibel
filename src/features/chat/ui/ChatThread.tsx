import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
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
  onTogglePin?: () => void
  /** Удалить сообщение (вызывается по истечении отсчёта-отмены). */
  onDeleteMessage?: (messageId: string) => void
  /** Сохранить отредактированный текст сообщения. */
  onEditMessage?: (messageId: string, text: string) => void
  /** Доп. кнопки справа в шапке (мини-чат: развернуть/свернуть). */
  headerExtra?: ReactNode
}

const EMOJI_SET = ['😀', '😂', '😍', '😎', '🤔', '🙏', '👍', '👏', '🔥', '✨', '💯', '🎉', '❤️', '💪', '✅', '🚀', '📌', '💬', '🤝', '😅', '😉', '😇', '🥳', '🤩']

type Ctx = { msg: ChatMessage; x: number; y: number }

const DELETE_DELAY = 5000 // мс до удаления сообщения (можно отменить)

export function ChatThread({
  conversation,
  onSend,
  onBack,
  onTogglePin,
  onDeleteMessage,
  onEditMessage,
  headerExtra,
}: Props) {
  const myId = useAppSelector((s) => s.auth.user?.id)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [text, setText] = useState('')
  // «Печатает…» собеседника (через broadcast на канале беседы).
  const [othersTyping, setOthersTyping] = useState(false)
  const typingChanRef = useRef<RealtimeChannel | null>(null)
  const typingClearRef = useRef<number | null>(null)
  const lastTypingSentRef = useRef(0)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [headMenu, setHeadMenu] = useState(false)
  const [ctx, setCtx] = useState<Ctx | null>(null)
  // Редактируемое сообщение (текст грузится в композер).
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  // Отложенное удаление сообщений: id → дедлайн (ms). До дедлайна показываем отсчёт+отмену.
  const [delDeadlines, setDelDeadlines] = useState<Record<string, number>>({})
  const [, forceTick] = useState(0)

  // Состояние скролла канвы (для умного автоскролла без «скачков»).
  const atBottomRef = useRef(true)
  const distBottomRef = useRef(0)
  const prevConvRef = useRef(conversation.id)
  const prevLenRef = useRef(conversation.messages.length)

  function onCanvasScroll() {
    const el = canvasRef.current
    if (!el) return
    distBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distBottomRef.current < 80
  }

  // Умный автоскролл: к низу только при смене беседы и при новом сообщении, когда мы
  // уже внизу. При удалении/редактировании/отсчёте — СОХРАНЯЕМ видимую область (тот же
  // отступ от низа), чтобы чат не «прыгал» при схлопывании сообщений.
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const convChanged = prevConvRef.current !== conversation.id
    const added = conversation.messages.length > prevLenRef.current
    if (convChanged) atBottomRef.current = true
    if (convChanged || (added && atBottomRef.current)) {
      el.scrollTop = el.scrollHeight
    } else {
      el.scrollTop = el.scrollHeight - el.clientHeight - distBottomRef.current
    }
    prevConvRef.current = conversation.id
    prevLenRef.current = conversation.messages.length
    distBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight
  }, [conversation.id, conversation.messages.length, delDeadlines])

  // Авто-рост textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  // Индикатор «печатает…»: broadcast-канал беседы. Получив событие от собеседника,
  // показываем статус и гасим через 3 c (Telegram-стиль). Оба видят его, только когда
  // тред открыт у обоих (канал живёт на время монтирования треда).
  useEffect(() => {
    setOthersTyping(false)
    const channel = supabase.channel(`typing:${conversation.id}`, {
      config: { broadcast: { self: false } },
    })
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if ((payload.payload as { userId?: string })?.userId === myId) return
        setOthersTyping(true)
        if (typingClearRef.current) window.clearTimeout(typingClearRef.current)
        typingClearRef.current = window.setTimeout(() => setOthersTyping(false), 3000)
      })
      .subscribe()
    typingChanRef.current = channel
    return () => {
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current)
      typingChanRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [conversation.id, myId])

  /** Сообщить собеседнику, что я печатаю (не чаще раза в 1.5 c). */
  function notifyTyping() {
    const now = Date.now()
    if (now - lastTypingSentRef.current < 1500) return
    lastTypingSentRef.current = now
    void typingChanRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } })
  }

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
      }
    }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Тикаем, пока есть сообщения с отложенным удалением: обновляем отсчёт и по
  // дедлайну реально удаляем (через onDeleteMessage → thunk).
  useEffect(() => {
    if (!Object.keys(delDeadlines).length) return
    const t = window.setInterval(() => {
      const now = Date.now()
      const expired = Object.entries(delDeadlines).filter(([, d]) => d <= now).map(([id]) => id)
      if (expired.length) {
        expired.forEach((id) => onDeleteMessage?.(id))
        setDelDeadlines((prev) => {
          const next = { ...prev }
          expired.forEach((id) => delete next[id])
          return next
        })
      } else {
        forceTick((x) => x + 1) // перерисовать цифры отсчёта
      }
    }, 250)
    return () => window.clearInterval(t)
  }, [delDeadlines, onDeleteMessage])

  function startDeleteMessage(id: string) {
    setCtx(null)
    setDelDeadlines((prev) => ({ ...prev, [id]: Date.now() + DELETE_DELAY }))
  }

  function cancelDeleteMessage(id: string) {
    setDelDeadlines((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function startEdit(m: ChatMessage) {
    setCtx(null)
    setReplyTo(null)
    setEditing(m)
    setText(m.text)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function cancelEdit() {
    setEditing(null)
    setText('')
  }

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
    if (editing) {
      onEditMessage?.(editing.id, t)
      setEditing(null)
      setText('')
      return
    }
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
              id={conversation.otherId}
            />
          </Link>
        ) : (
          <ChatAvatar
            name={conversation.title}
            avatar={conversation.avatar}
            size={42}
            square={conversation.type === 'company'}
            id={conversation.otherId}
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
          {othersTyping ? (
            <div className={[styles.threadStatus, styles.threadTyping].join(' ')}>печатает…</div>
          ) : conversation.subtitle ? (
            <div className={styles.threadStatus}>{conversation.subtitle}</div>
          ) : null}
        </div>
        <div className={styles.threadHeadBtns}>
          {headerExtra}
          {/* Меню «⋯» (только Закрепить) — показываем лишь если есть onTogglePin.
              Мини-чат его не передаёт → кнопки «⋯» там нет. */}
          {onTogglePin ? (
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
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.canvas} ref={canvasRef} onScroll={onCanvasScroll}>
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
          const tailHide = !!next && next.sender === m.sender && next.createdAt - m.createdAt < 5 * 60 * 1000

          // Сообщение с отложенным удалением — вместо пузыря показываем отсчёт + отмену.
          if (delDeadlines[m.id] !== undefined) {
            const left = Math.max(0, Math.ceil((delDeadlines[m.id] - Date.now()) / 1000))
            return (
              <div key={m.id}>
                {showDay ? (
                  <div className={styles.daySep}>
                    <span className={styles.daySepPill}>{formatDaySeparator(m.createdAt)}</span>
                  </div>
                ) : null}
                <div className={[styles.msgRow, m.sender === 'me' ? styles.msgMe : styles.msgThem].join(' ')}>
                  <div className={styles.bubbleWrap}>
                    <div className={[styles.bubble, styles.msgDeleting].join(' ')}>
                      <span className={styles.delMsgText}>Удаление через {left} с</span>
                      <button
                        type="button"
                        className={styles.delMsgCancel}
                        onClick={() => cancelDeleteMessage(m.id)}
                      >
                        Отменить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

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
                  setCtx({ msg: m, x: e.clientX, y: e.clientY })
                }}
              >
                {m.sender === 'me' ? (
                  <div className={styles.msgQuick}>
                    <button type="button" title="Ответить" onClick={(e) => { e.stopPropagation(); setReplyTo(m) }}>
                      <ChatIco.reply />
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
                </div>
                {m.sender === 'them' ? (
                  <div className={styles.msgQuick}>
                    <button type="button" title="Ответить" onClick={(e) => { e.stopPropagation(); setReplyTo(m) }}>
                      <ChatIco.reply />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {editing ? (
        <div className={styles.replyBar}>
          <div className={styles.replyAccent} />
          <div className={styles.replyBody}>
            <div className={styles.replyAu}>
              <ChatIco.edit /> Редактирование
            </div>
            <div className={styles.replyTx}>{editing.text}</div>
          </div>
          <button type="button" className={styles.composerBtn} onClick={cancelEdit} aria-label="Отменить редактирование">
            <ChatIco.close />
          </button>
        </div>
      ) : replyTo ? (
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
            onChange={(e) => {
              setText(e.target.value)
              if (e.target.value.trim()) notifyTyping()
            }}
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
              {ctx.msg.sender === 'me' && ctx.msg.text ? (
                <button
                  type="button"
                  className={styles.ctxRow}
                  onClick={() => startEdit(ctx.msg)}
                >
                  <ChatIco.edit /> Изменить
                </button>
              ) : null}
              {ctx.msg.sender === 'me' ? (
                <>
                  <div className={styles.ctxDiv} />
                  <button
                    type="button"
                    className={[styles.ctxRow, styles.ctxRowDanger].join(' ')}
                    onClick={() => startDeleteMessage(ctx.msg.id)}
                  >
                    <ChatIco.trash /> Удалить
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}

    </div>
  )
}
