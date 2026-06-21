import { useAppSelector } from '../../../app/store/hooks'

/** Онлайн ли аккаунт с данным id (по глобальному присутствию). */
export function useIsOnline(id?: string): boolean {
  return useAppSelector((s) => (id ? s.presence.onlineIds.includes(id) : false))
}
