import { useMemo, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { toggleFollow } from '../model/networkThunks'
import { NetworkModal } from './NetworkModal'
import { CompanyBadge } from '../../../shared/ui/CompanyBadge/CompanyBadge'
import styles from './NetworkListModal.module.css'

export type NetworkListKind = 'following' | 'followers'

const TITLES: Record<NetworkListKind, string> = {
  following: 'Подписки',
  followers: 'Подписчики',
}

/** Склонение слова «человек» по числу. */
function peopleWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'человек'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'человека'
  return 'человек'
}

function subtitleFor(kind: NetworkListKind, n: number) {
  return kind === 'followers'
    ? `${n} ${peopleWord(n)} ${n === 1 ? 'подписан' : 'подписаны'} на тебя`
    : `Вы подписаны на ${n}`
}

export type NetworkListItem = {
  id: string
  name: string
  sub: string
  avatar?: string
  initial: string
  square: boolean
  /** Лого компании-работодателя (бейдж рядом с именем, для людей). */
  logo?: string
  logoTitle?: string
}
type Item = NetworkListItem

/** Модалка со списком (подписки = люди + компании, либо подписчики) — строками,
 *  как в глобальном поиске, с поиском по списку.
 *  Если передан `items` — используется он (напр. данные из графа чужого профиля),
 *  иначе список берётся из моей сети по `kind`. */
export function NetworkListModal({
  kind,
  onClose,
  items: override,
}: {
  kind: NetworkListKind
  onClose: () => void
  items?: NetworkListItem[]
}) {
  const dispatch = useAppDispatch()
  const followingPeople = useAppSelector((s) => s.network.followingPeople)
  const followingCompanies = useAppSelector((s) => s.network.followingCompanies)
  const followers = useAppSelector((s) => s.network.followers)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const [query, setQuery] = useState('')

  // «Роль · компания» одной строкой (как в макете).
  const personSub = (jobTitle?: string, company?: string) =>
    [jobTitle, company].filter(Boolean).join(' · ') || 'Пользователь'

  const items = useMemo<Item[]>(() => {
    if (override) return override
    if (kind === 'followers') {
      return followers.map((p) => ({
        id: p.id,
        name: p.fullName,
        sub: personSub(p.jobTitle, p.company),
        avatar: p.avatar,
        initial: p.avatarInitials,
        square: false,
        logo: p.companyLogo,
        logoTitle: p.company,
      }))
    }
    // following = люди + компании
    return [
      ...followingPeople.map((p) => ({
        id: p.id,
        name: p.fullName,
        sub: personSub(p.jobTitle, p.company),
        avatar: p.avatar,
        initial: p.avatarInitials,
        square: false,
        logo: p.companyLogo,
        logoTitle: p.company,
      })),
      ...followingCompanies.map((c) => ({
        id: c.id,
        name: c.name,
        sub: c.field || 'Компания',
        avatar: c.logo,
        initial: c.logoInitial,
        square: true,
      })),
    ]
  }, [override, kind, followingPeople, followingCompanies, followers])

  function onToggle(e: MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    void dispatch(toggleFollow(id))
  }

  function actionLabel(id: string) {
    if (followingIds.includes(id)) return '✓ Связь'
    return kind === 'followers' ? '+ В ответ' : '+ Связь'
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? items.filter((i) => `${i.name} ${i.sub}`.toLowerCase().includes(q)) : items),
    [items, q],
  )

  return (
    <NetworkModal title={TITLES[kind]} subtitle={subtitleFor(kind, items.length)} onClose={onClose}>
      <input
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по имени, роли или компании"
        type="search"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />

      {!items.length ? (
        <div className={styles.empty}>
          {override
            ? kind === 'followers'
              ? 'Нет подписчиков.'
              : 'Нет подписок.'
            : kind === 'followers'
              ? 'У вас пока нет подписчиков.'
              : 'Вы пока ни на кого не подписаны.'}
        </div>
      ) : !filtered.length ? (
        <div className={styles.empty}>Ничего не найдено.</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((i) => (
            <Link key={i.id} to={`/u/${i.id}?from=network`} className={styles.row} onClick={onClose}>
              {i.avatar ? (
                <img
                  className={[styles.avatar, i.square ? styles.square : ''].join(' ')}
                  src={i.avatar}
                  alt=""
                />
              ) : (
                <span className={[styles.avatar, i.square ? styles.square : ''].join(' ')} aria-hidden>
                  {i.initial}
                </span>
              )}
              <span className={styles.meta}>
                <span className={styles.nameRow}>
                  <span className={styles.name}>{i.name}</span>
                  {i.logo ? <CompanyBadge logo={i.logo} title={i.logoTitle} size={13} /> : null}
                </span>
                <span className={styles.sub}>{i.sub}</span>
              </span>
              <button
                type="button"
                className={[styles.action, followingIds.includes(i.id) ? styles.actionDone : ''].join(' ')}
                onClick={(e) => onToggle(e, i.id)}
              >
                {actionLabel(i.id)}
              </button>
            </Link>
          ))}
        </div>
      )}
    </NetworkModal>
  )
}
