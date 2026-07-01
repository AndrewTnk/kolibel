import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { presenceActions } from '../model/presenceSlice'

/**
 * Онлайн ли аккаунт с данным id.
 *
 * Заодно РЕГИСТРИРУЕТ этот id в реестре наблюдаемых (пока значок на экране) — по нему
 * `PresenceTracker` опрашивает `last_seen_at`. Поэтому статус работает везде, где
 * отрисован `OnlineDot`, а не только для собеседников из чата.
 */
export function useIsOnline(id?: string): boolean {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (!id) return
    dispatch(presenceActions.watch(id))
    return () => {
      dispatch(presenceActions.unwatch(id))
    }
  }, [id, dispatch])
  return useAppSelector((s) => (id ? s.presence.onlineIds.includes(id) : false))
}
