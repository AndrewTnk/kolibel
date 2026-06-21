import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { signUp } from '../model/authThunks'
import { sanitizePersonName, sanitizeCompanyName } from '../../../shared/lib/nameValidation'
import styles from './NewAccountModal.module.css'

type Kind = 'user' | 'company'

export function NewAccountModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [kind, setKind] = useState<Kind>('user')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function create() {
    setError(null)
    if (!email.trim() || password.length < 6) {
      setError('Укажите email и пароль не короче 6 символов')
      return
    }
    setBusy(true)
    const res = await dispatch(
      signUp({ email: email.trim(), password, fullName: name.trim() || undefined, accountType: kind }),
    )
    setBusy(false)
    if (signUp.fulfilled.match(res)) {
      onClose()
      navigate('/')
    } else {
      setError(res.error.message ?? 'Не удалось создать аккаунт')
    }
  }

  return createPortal(
    <div className={styles.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div>
            <div className={styles.title}>Новый аккаунт</div>
            <div className={styles.sub}>Можно держать несколько профилей и переключаться между ними</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.label}>Тип аккаунта</div>
            <div className={styles.toggleGroup}>
              <button type="button" className={[styles.toggleBtn, kind === 'user' ? styles.toggleOn : ''].join(' ')} onClick={() => setKind('user')}>
                Пользователь
              </button>
              <button type="button" className={[styles.toggleBtn, kind === 'company' ? styles.toggleOn : ''].join(' ')} onClick={() => setKind('company')}>
                Компания
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>{kind === 'user' ? 'Имя и фамилия' : 'Название компании'}</div>
            <input
              className={styles.input}
              value={name}
              onChange={(e) =>
                setName(kind === 'company' ? sanitizeCompanyName(e.target.value) : sanitizePersonName(e.target.value))
              }
              placeholder={kind === 'user' ? 'Иван Лебедев' : 'Lebedev Studio'}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Email для входа</div>
            <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@kolibel.ru" />
            <div className={styles.hint}>Должен отличаться от email текущего аккаунта</div>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Пароль</div>
            <input className={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <div className={styles.note}>
            {kind === 'user'
              ? 'Личный профиль начнётся с пустого резюме — заполнить можно сразу после создания.'
              : 'Профиль компании позволит публиковать вакансии и приглашать сотрудников.'}
          </div>
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.btnPrimary} onClick={create} disabled={busy}>
            {busy ? 'Создаём…' : 'Создать аккаунт'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
