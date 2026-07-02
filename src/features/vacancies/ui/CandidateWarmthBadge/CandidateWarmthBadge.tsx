import { useEffect, useRef, useState } from 'react'
import { useAppSelector } from '../../../../app/store/hooks'
import {
  fetchCandidateEngagement,
  type CandidateEngagement,
} from '../../lib/candidateEngagement'
import styles from './CandidateWarmthBadge.module.css'

/** «Следит N мес/дн» из даты подписки. */
function followDuration(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.max(0, Math.floor(ms / 86400000))
  if (days < 31) return `${Math.max(1, days)} дн.`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} мес.`
  const years = Math.floor(months / 12)
  return `${years} г.`
}

/** Строки-детали вовлечённости (только ненулевые) для поповера. */
function detailItems(e: CandidateEngagement): string[] {
  const items: string[] = []
  if (e.isFollower && e.followedAt) items.push(`Подписан на компанию — ${followDuration(e.followedAt)}`)
  if (e.comments > 0) items.push(`Комментарии под постами — ${e.comments}`)
  if (e.reactions > 0) items.push(`Реакции на посты — ${e.reactions}`)
  if (e.pageViews > 0) items.push(`Заходил на страницу — ${e.pageViews}×`)
  if (e.pastApplications > 1) items.push(`Откликается не впервые — ${e.pastApplications}-й раз`)
  return items
}

/**
 * Бейдж «теплоты» кандидата к компании — кнопка; по клику раскрывает поповер
 * со списком сигналов. Видит только компания (RPC отдаёт null не-владельцу).
 * Холодный/пустой кандидат ничего не рендерит.
 */
export function CandidateWarmthBadge({ candidateId }: { candidateId: string }) {
  const companyId = useAppSelector((s) => s.auth.user?.id)
  const [eng, setEng] = useState<CandidateEngagement | null>(null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    if (!companyId) return
    fetchCandidateEngagement(candidateId, companyId)
      .then((e) => alive && setEng(e))
      .catch(() => alive && setEng(null))
    return () => {
      alive = false
    }
  }, [candidateId, companyId])

  // Закрытие поповера по клику вне бейджа.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!eng || eng.warmth === 'cold') return null

  const isHot = eng.warmth === 'hot'
  const items = detailItems(eng)

  return (
    <div className={styles.wrap} ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={[styles.chip, isHot ? styles.hot : styles.known].join(' ')}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {isHot ? '🔥 Тёплый' : 'Знаком с компанией'}
      </button>
      {open ? (
        <div className={styles.pop} role="dialog">
          <div className={styles.popTitle}>Вовлечённость в компанию</div>
          {items.length ? (
            <ul className={styles.popList}>
              {items.map((t) => (
                <li key={t} className={styles.popItem}>
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.popEmpty}>Нет деталей</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
