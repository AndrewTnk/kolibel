import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../../../app/store/hooks'
import s from './admin.module.css'

/**
 * Гейт админ-панели. Доступ только для пользователей с ролью admin/moderator.
 * ⚠️ Это лишь UX-защита — реальный контроль на бэке (RLS + security-definer RPC
 * с проверкой is_staff()/is_admin()).
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const bootstrapped = useAppSelector((st) => st.auth.bootstrapped)
  const session = useAppSelector((st) => st.auth.session)
  const role = useAppSelector((st) => st.admin.role)
  const adminLoaded = useAppSelector((st) => st.admin.loaded)

  if (!bootstrapped) return null
  if (!session) return <Navigate to="/auth" replace />
  // Роль ещё грузится — короткий тёмный лоадер (чтобы не мигнуть редиректом).
  if (!adminLoaded) {
    return (
      <div className={s.shell}>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className={s.center}>
            <div className={s.spinner} />
          </div>
        </div>
      </div>
    )
  }
  if (!role) return <Navigate to="/" replace />
  return children
}

/**
 * Гейт раздела, доступного только роли admin (Главная-дашборд, Аналитика).
 * Модератор перенаправляется на доступный ему раздел.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useAppSelector((st) => st.admin.role)
  if (role !== 'admin') return <Navigate to="/admin/users" replace />
  return children
}
