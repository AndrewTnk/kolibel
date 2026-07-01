import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { ensureSupportConversation, loadConversations, pollNewMessages } from '../model/chatThunks'

/** Интервал опроса чата, мс. Ровно 2с (чаще — лишняя нагрузка). */
const POLL_MS = 2000

/**
 * Невидимый компонент: при входе грузит беседы и держит их свежими ОПРОСОМ.
 *
 * Раньше тут была realtime-подписка на `messages` (Supabase Realtime/WebSocket).
 * Но WebSocket не проходит через Vercel-прокси, через который мы ходим в Supabase
 * из России (см. CONTEXT_HANDOFF → «Доступ из России»). Поэтому живость сделана
 * лёгким поллингом `pollNewMessages` (добирает только новые сообщения + галочки).
 *
 * Опрашиваем ТОЛЬКО когда вкладка активна (`visibilitychange`) — свёрнутая/фоновая
 * вкладка не шлёт запросы, это режет нагрузку без потери ощущения «онлайн».
 */
export function ChatRealtime() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.user?.id)

  useEffect(() => {
    if (!userId) return

    // Создаём (если ещё нет) системный чат «Поддержка Kolibel», затем грузим беседы.
    void dispatch(ensureSupportConversation()).then(() => dispatch(loadConversations()))

    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer) return
      void dispatch(pollNewMessages())
      timer = setInterval(() => void dispatch(pollNewMessages()), POLL_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userId, dispatch])

  return null
}
