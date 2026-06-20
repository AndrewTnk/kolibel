import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { switchAccount } from '../model/authThunks'
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '../lib/accountsStore'
import styles from './AccountSwitcher.module.css'

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'U'
  )
}

export function AccountSwitcher({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const currentId = useAppSelector((s) => s.auth.user?.id)
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => getSavedAccounts())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function switchTo(id: string) {
    if (id === currentId || busyId) return
    setError(null)
    setBusyId(id)
    const res = await dispatch(switchAccount(id))
    setBusyId(null)
    if (switchAccount.fulfilled.match(res)) {
      onClose()
      nav('/')
    } else {
      setError(res.error.message ?? 'Не удалось переключиться')
    }
  }

  function forget(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    removeSavedAccount(id)
    setAccounts(getSavedAccounts())
  }

  function addAccount() {
    onClose()
    nav('/auth?add=1')
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal aria-label="Смена аккаунта">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.title}>Сменить аккаунт</h2>
          <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.list}>
          {accounts.map((a) => {
            const active = a.id === currentId
            return (
              <button
                key={a.id}
                type="button"
                className={[styles.item, active ? styles.itemActive : ''].join(' ')}
                onClick={() => switchTo(a.id)}
                disabled={busyId === a.id}
                title={a.name}
              >
                <span
                  className={styles.forget}
                  role="button"
                  tabIndex={-1}
                  aria-label={`Удалить ${a.name} из списка`}
                  title="Удалить из списка"
                  onClick={(e) => forget(e, a.id)}
                >
                  ✕
                </span>
                {a.avatar ? (
                  <img
                    className={[styles.avatar, a.accountType === 'company' ? styles.square : ''].join(' ')}
                    src={a.avatar}
                    alt=""
                  />
                ) : (
                  <span className={[styles.avatar, a.accountType === 'company' ? styles.square : ''].join(' ')} aria-hidden>
                    {initials(a.name)}
                  </span>
                )}
                <span className={styles.name}>{a.name}</span>
                <span className={styles.email}>{busyId === a.id ? 'Вход…' : a.email}</span>
              </button>
            )
          })}

          {!accounts.length ? <div className={styles.empty}>Сохранённых аккаунтов нет.</div> : null}
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <button type="button" className={styles.addLink} onClick={addAccount}>
          + Добавить аккаунт
        </button>
      </div>
    </div>,
    document.body,
  )
}
