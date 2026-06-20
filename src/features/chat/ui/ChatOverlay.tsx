import { useLocation } from 'react-router-dom'
import { MiniChatWidget } from './MiniChatWidget'

export function ChatOverlay() {
  const { pathname } = useLocation()
  // На странице авторизации мини-чат не показываем.
  if (pathname.startsWith('/auth')) return null
  return <MiniChatWidget />
}
