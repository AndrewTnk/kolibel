import type { AuthUser } from '../model/types'

/** Имя для отображения: full_name → name → часть email до @ → «Пользователь». */
export function getDisplayName(user: AuthUser | null | undefined): string {
  const meta = user?.user_metadata
  return (
    meta?.full_name ||
    meta?.name ||
    (user?.email ? user.email.split('@')[0] : 'Пользователь')
  )
}
