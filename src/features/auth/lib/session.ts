import type { Session } from '@supabase/supabase-js'
import type { AuthSession } from '../model/types'

/** Приводит сессию Supabase к нашему внутреннему формату AuthSession. */
export function mapSession(session: Session | null): AuthSession | null {
  const u = session?.user
  if (!u) return null
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  return {
    user: {
      id: u.id,
      email: u.email ?? undefined,
      user_metadata: {
        full_name: typeof meta.full_name === 'string' ? meta.full_name : undefined,
        name: typeof meta.name === 'string' ? meta.name : undefined,
      },
    },
  }
}
