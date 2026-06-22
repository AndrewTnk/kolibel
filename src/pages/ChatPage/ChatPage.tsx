import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader.tsx'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  deleteMessage,
  editMessage,
  loadConversations,
  markConversationRead,
  sendMessage,
  setConversationFlag,
  startConversation,
} from '../../features/chat/model/chatThunks'
import { chatUiActions } from '../../features/chat/model/chatUiSlice'
import { ConversationList } from '../../features/chat/ui/ConversationList'
import { ChatThread, type SendExtras } from '../../features/chat/ui/ChatThread'
import type { ChatConversation } from '../../features/chat/model/types'
import { NewChatModal } from '../../features/chat/ui/NewChatModal'
import { SuggestedCompany } from '../../shared/ui/Recommendations/SuggestedCompany'
import { SupportLinks } from '../../shared/ui/Recommendations/SupportLinks'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { ChatIco } from '../../features/chat/ui/chatIcons'
import styles from './ChatPage.module.css'

export function ChatPage() {
  const dispatch = useAppDispatch()
  const isMobile = useIsMobile()
  const conversations = useAppSelector((s) => s.chat.conversations)
  const chatLoading = useAppSelector((s) => s.chat.status !== 'ready')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  // Беседа, удерживаемая в DOM на время slide-out треда (мобилка), чтобы анимация
  // закрытия проигрывалась с данными, а не на пустом экране.
  const [keptConv, setKeptConv] = useState<ChatConversation | null>(null)

  useEffect(() => {
    void dispatch(loadConversations())
  }, [dispatch])

  // Сообщаем, какая беседа открыта на странице (для подавления тостов/непрочитанного
  // активной беседы в realtime). Сбрасываем при уходе со страницы.
  useEffect(() => {
    dispatch(chatUiActions.setPageConversation(activeId))
  }, [activeId, dispatch])
  useEffect(() => () => { dispatch(chatUiActions.setPageConversation(null)) }, [dispatch])

  // Блокируем скролл страницы — чат занимает весь экран (скроллятся список/канва).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Мобилка: высоту чата привязываем к ВИДИМОЙ области (VisualViewport), чтобы при
  // открытии клавиатуры интерфейс не «уезжал» — поле ввода остаётся над клавиатурой.
  useEffect(() => {
    if (!isMobile) return
    const vv = window.visualViewport
    if (!vv) return
    const apply = () => {
      document.documentElement.style.setProperty('--chat-vvh', `${vv.height}px`)
    }
    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      document.documentElement.style.removeProperty('--chat-vvh')
    }
  }, [isMobile])

  // Переход из мини-чата: /chat?c=<id> — подсветить нужную беседу.
  useEffect(() => {
    const c = searchParams.get('c')
    if (c && conversations.some((x) => x.id === c)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(c)
      void dispatch(markConversationRead(c))
      const next = new URLSearchParams(searchParams)
      next.delete('c')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, conversations, dispatch, setSearchParams])

  const active = conversations.find((c) => c.id === activeId) ?? null
  // Тред на мобилке рендерим из активной беседы, а во время закрытия — из удержанной.
  const mobileThreadConv = active ?? keptConv

  // Держим беседу для slide-out, обновляем при открытии новой.
  useEffect(() => {
    if (active) setKeptConv(active)
  }, [active])

  function selectConversation(id: string) {
    setActiveId(id)
    void dispatch(markConversationRead(id))
  }

  /** Тред с обработчиками, привязанными к конкретной беседе (для десктопа и мобилки). */
  function renderThread(conv: ChatConversation, onBack?: () => void) {
    return (
      <ChatThread
        conversation={conv}
        onBack={onBack}
        onSend={(text: string, extras?: SendExtras) =>
          void dispatch(
            sendMessage({
              conversationId: conv.id,
              text,
              replyTo: extras?.replyTo ?? null,
              attach: extras?.attach ?? null,
            }),
          )
        }
        onTogglePin={() =>
          void dispatch(setConversationFlag({ conversationId: conv.id, pinned: !conv.pinned }))
        }
        onDeleteMessage={(messageId) =>
          void dispatch(deleteMessage({ conversationId: conv.id, messageId }))
        }
        onEditMessage={(messageId, text) =>
          void dispatch(editMessage({ conversationId: conv.id, messageId, text }))
        }
      />
    )
  }

  return (
    <div className={styles.page}>
      <AppHeader hideBarOnMobile />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.layout}>
            <aside className={styles.sidebar} aria-label="Реклама и поддержка">
              <SuggestedCompany />
              <SupportLinks />
            </aside>

            <section className={styles.chatPanel} aria-label="Чат">
              {/* Список — всегда в DOM (десктоп: левая колонка; мобилка: базовый экран) */}
              <ConversationList
                conversations={conversations}
                activeId={active?.id ?? null}
                onSelect={selectConversation}
                onNewChat={() => setNewChatOpen(true)}
                loading={chatLoading}
              />

              {/* Десктоп: тред или пустое состояние во второй колонке */}
              {!isMobile ? (
                active ? (
                  renderThread(active)
                ) : (
                  <div className={styles.empty}>
                    <div className={styles.emptyCard}>
                      <div className={styles.emptyTi}>Выбери чат слева</div>
                      <div className={styles.emptyTx}>
                        Открой переписку или начни новый чат — например, с рекрутёром по понравившейся
                        вакансии.
                      </div>
                      <button type="button" className={styles.emptyBtn} onClick={() => setNewChatOpen(true)}>
                        <ChatIco.plus /> Новый чат
                      </button>
                    </div>
                  </div>
                )
              ) : null}

              {/* Мобилка: тред выезжает полноэкранным оверлеем справа (Telegram-стиль) */}
              {isMobile ? (
                <div
                  className={[styles.threadOverlay, active ? styles.threadOverlayOpen : '']
                    .filter(Boolean)
                    .join(' ')}
                  onTransitionEnd={(e) => {
                    // только собственный transform оверлея (не всплывшие transition детей)
                    if (e.target === e.currentTarget && !active) setKeptConv(null)
                  }}
                >
                  {mobileThreadConv ? renderThread(mobileThreadConv, () => setActiveId(null)) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>

      {newChatOpen ? (
        <NewChatModal
          onClose={() => setNewChatOpen(false)}
          onPick={(id) => {
            setNewChatOpen(false)
            // существующая беседа с этим пользователем?
            const existing = conversations.find((c) => c.otherId === id)
            if (existing) {
              selectConversation(existing.id)
            } else {
              void (async () => {
                const res = await dispatch(startConversation(id))
                if (startConversation.fulfilled.match(res) && res.payload) selectConversation(res.payload)
              })()
            }
          }}
        />
      ) : null}
    </div>
  )
}
