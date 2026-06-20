import { useState } from 'react'
import { useAppDispatch } from '../../../../app/store/hooks'
import { RecModal } from '../../../../shared/ui/Recommendations/RecModal'
import {
  markConversationRead,
  sendMessage,
  startConversation,
} from '../../../chat/model/chatThunks'
import { chatUiActions } from '../../../chat/model/chatUiSlice'
import styles from './WriteModal.module.css'

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

/**
 * Написать кандидату. Предзаполненное первое сообщение → реальный чат:
 * `startConversation` (RPC найти-или-создать) + `sendMessage`, затем
 * «Открыть чат» разворачивает беседу в мини-чате.
 */
export function WriteModal({
  userId,
  name,
  vacancyTitle,
  onClose,
}: {
  userId: string
  name: string
  /** Вакансия, под которую зовём (для текста сообщения). */
  vacancyTitle?: string
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const firstName = name.split(' ')[0] || name
  const [text, setText] = useState(
    `Здравствуйте, ${firstName}! Нам кажется, ваш опыт хорошо подходит` +
      (vacancyTitle ? ` под нашу вакансию «${vacancyTitle}»` : ' под одну из наших вакансий') +
      '. Будет здорово пообщаться — удобно ли на этой неделе?',
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentConvId, setSentConvId] = useState<string | null>(null)

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await dispatch(startConversation(userId))
      if (!startConversation.fulfilled.match(res) || !res.payload) {
        throw new Error('Не удалось начать беседу')
      }
      const convId = res.payload
      await dispatch(sendMessage({ conversationId: convId, text: text.trim() }))
      setSentConvId(convId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  function openChat() {
    if (sentConvId) {
      dispatch(chatUiActions.openConversationInMini(sentConvId))
      void dispatch(markConversationRead(sentConvId))
    }
    onClose()
  }

  return (
    <RecModal title={sentConvId ? 'Сообщение отправлено' : `Написать · ${name}`} onClose={onClose} maxWidth={520}>
      {sentConvId ? (
        <div className={styles.success}>
          <div className={styles.check} aria-hidden>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className={styles.successTitle}>Готово</div>
          <div className={styles.successSub}>Диалог появился в чате компании.</div>
          <button type="button" className={styles.send} style={{ marginTop: 20 }} onClick={openChat}>
            Открыть чат в Kolibel
          </button>
        </div>
      ) : (
        <>
          <div className={styles.subtitle}>Первое сообщение откроет диалог в чате</div>
          <textarea
            className={styles.area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.tools}>
            <button type="button" className={styles.send} disabled={!text.trim() || sending} onClick={send}>
              <SendIcon /> {sending ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
        </>
      )}
    </RecModal>
  )
}
