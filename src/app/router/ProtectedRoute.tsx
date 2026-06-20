import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AUTH_ENABLED } from '../../features/auth/config'
import { useAppSelector } from '../store/hooks'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const session = useAppSelector((s) => s.auth.session)
  const bootstrapped = useAppSelector((s) => s.auth.bootstrapped)
  const profileLoaded = useAppSelector((s) => s.profile.loaded)
  const onboarded = useAppSelector((s) => s.profile.onboarded)

  if (!AUTH_ENABLED) return children

  if (!bootstrapped) return null

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  // Новый аккаунт без пройденного онбординга — на мастер заполнения профиля.
  if (profileLoaded && !onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
