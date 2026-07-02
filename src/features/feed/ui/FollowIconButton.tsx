import { useEffect } from 'react'
import { useStore } from 'react-redux'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import type { RootState } from '../../../app/store/store'
import { loadNetwork, toggleFollow } from '../../network/model/networkThunks'
import styles from './Feed.module.css'

/**
 * Иконка-кнопка связи в шапке поста (рядом с «⋯»): «+» — установить связь
 * с автором, «✓» — связь уже установлена (повторный клик убирает).
 * У своих постов и без сессии не рендерится.
 */
export function FollowIconButton({ userId, className = '' }: { userId: string; className?: string }) {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const myId = useAppSelector((s) => s.auth.user?.id)
  const following = useAppSelector((s) => s.network.followingIds.includes(userId))

  // Подгружаем сеть, если ещё не грузилась (статус читаем из стора в момент
  // эффекта: pending синхронно ставит 'loading', поэтому несколько кнопок
  // на странице не дают дублирующих запросов).
  useEffect(() => {
    if (store.getState().network.status === 'idle') void dispatch(loadNetwork())
  }, [store, dispatch])

  if (!myId || myId === userId) return null

  return (
    <button
      type="button"
      className={[styles.followIco, following ? styles.followIcoOn : '', className].filter(Boolean).join(' ')}
      title={following ? 'Связь установлена — нажмите, чтобы убрать' : 'Установить связь'}
      aria-label={following ? 'Убрать связь' : 'Установить связь'}
      aria-pressed={following}
      onClick={() => void dispatch(toggleFollow(userId))}
    >
      {following ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12.5l4.5 4.5L19 7.5"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      )}
    </button>
  )
}
