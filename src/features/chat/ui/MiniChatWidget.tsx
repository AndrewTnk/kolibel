import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import {
  deleteMessage,
  editMessage,
  markConversationRead,
  sendMessage,
} from '../model/chatThunks'
import { chatUiActions } from '../model/chatUiSlice'
import { formatChatTime, lastMessagePreview } from '../lib/format'
import { ChatAvatar } from './ChatAvatar'
import { ChatThread, type SendExtras } from './ChatThread'
import { ChatIco } from './chatIcons'
import styles from './Chat.module.css'

export function MiniChatWidget() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const open = useAppSelector((s) => s.chatUi.miniOpen)
  const view = useAppSelector((s) => s.chatUi.miniView)
  const activeId = useAppSelector((s) => s.chatUi.activeConversationId)
  const conversations = useAppSelector((s) => s.chat.conversations)

  const [query, setQuery] = useState('')

  const active = conversations.find((c) => c.id === activeId) ?? null
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)

  const withMessages = useMemo(
    () => conversations.filter((c) => c.messages.length > 0),
    [conversations],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? withMessages.filter((c) =>
          `${c.title} ${c.subtitle ?? ''} ${c.messages.map((m) => m.text).join(' ')}`
            .toLowerCase()
            .includes(q),
        )
      : withMessages
    return [...list].sort((a, b) => {
      const at = a.messages[a.messages.length - 1]?.createdAt ?? a.updatedAt
      const bt = b.messages[b.messages.length - 1]?.createdAt ?? b.updatedAt
      return bt - at
    })
  }, [withMessages, query])

  // Ранний выход — строго после всех хуков. На самой странице чата мини-чат не нужен.
  if (isMobile || pathname.startsWith('/chat')) return null

  function openConv(id: string) {
    dispatch(chatUiActions.openConversationInMini(id))
    void dispatch(markConversationRead(id))
  }
  function expandToPage(id?: string) {
    dispatch(chatUiActions.closeMini())
    navigate(id ? `/chat?c=${id}` : '/chat')
  }

  return createPortal(
    <div className={styles.miniRoot}>
      {open ? (
        <div className={styles.miniPanel} role="dialog" aria-label="Мини-чат">
          {view === 'list' ? (
            <>
              <div className={styles.miniHead}>
                <div className={styles.miniHeadTi}>Чаты</div>
                <div className={styles.miniHeadBtns}>
                  <button
                    type="button"
                    className={styles.miniHeadBtn}
                    title="Открыть чат на всю страницу"
                    aria-label="Развернуть"
                    onClick={() => expandToPage()}
                  >
                    <ChatIco.expand />
                  </button>
                  <button
                    type="button"
                    className={styles.miniHeadBtn}
                    aria-label="Свернуть"
                    onClick={() => dispatch(chatUiActions.closeMini())}
                  >
                    <ChatIco.close />
                  </button>
                </div>
              </div>
              <div className={styles.miniBody}>
                <div className={styles.miniListSearch}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по чатам…"
                    type="search"
                  />
                </div>
                <div className={styles.list}>
                  {filtered.length ? (
                    filtered.map((c) => {
                      const last = c.messages[c.messages.length - 1]
                      const isMe = last?.sender === 'me'
                      return (
                        <button type="button" key={c.id} className={styles.listRow} onClick={() => openConv(c.id)}>
                          <ChatAvatar name={c.title} avatar={c.avatar} size={42} square={c.type === 'company'} id={c.otherId} />
                          <div className={styles.lMeta}>
                            <div className={styles.lTop}>
                              <div className={styles.lName}>{c.title}</div>
                              {last ? <div className={styles.lTime}>{formatChatTime(last.createdAt)}</div> : null}
                            </div>
                            <div className={styles.lBottom}>
                              <div className={styles.lPreview}>
                                {isMe ? 'Вы: ' : ''}
                                {last ? lastMessagePreview(last.text || last.attach?.title || '', 30) : ''}
                              </div>
                              {c.unreadCount ? <span className={styles.lBadge}>{c.unreadCount}</span> : null}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className={styles.listEmpty}>Чатов пока нет</div>
                  )}
                </div>
              </div>
            </>
          ) : active ? (
            <ChatThread
              conversation={active}
              onBack={() => dispatch(chatUiActions.setMiniView('list'))}
              onSend={(text: string, extras?: SendExtras) =>
                void dispatch(
                  sendMessage({
                    conversationId: active.id,
                    text,
                    replyTo: extras?.replyTo ?? null,
                    attach: extras?.attach ?? null,
                  }),
                )
              }
              onDeleteMessage={(messageId) =>
                void dispatch(deleteMessage({ conversationId: active.id, messageId }))
              }
              onEditMessage={(messageId, text) =>
                void dispatch(editMessage({ conversationId: active.id, messageId, text }))
              }
              headerExtra={
                <>
                  <button
                    type="button"
                    className={styles.miniHeadBtn}
                    onClick={() => expandToPage(active.id)}
                    title="Открыть на всю страницу"
                    aria-label="Развернуть"
                  >
                    <ChatIco.expand />
                  </button>
                  <button
                    type="button"
                    className={styles.miniHeadBtn}
                    onClick={() => dispatch(chatUiActions.closeMini())}
                    aria-label="Свернуть"
                  >
                    <ChatIco.close />
                  </button>
                </>
              }
            />
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={styles.miniFab}
        aria-label={open ? 'Свернуть чат' : 'Открыть мини-чат'}
        onClick={() => dispatch(chatUiActions.toggleMini())}
      >
        {open ? <ChatIco.close width={22} height={22} /> : <ChatIco.chat />}
        {!open ? <span className={styles.pulse} aria-hidden /> : null}
        {!open && totalUnread > 0 ? (
          <span className={styles.miniBadge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
        ) : null}
      </button>
    </div>,
    document.body,
  )
}
