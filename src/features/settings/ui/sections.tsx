import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { Select } from '../../../shared/ui/Select/Select'
import { Input } from '../../../shared/ui/Input/Input'
import { RecModal } from '../../../shared/ui/Recommendations/RecModal'
import { getStoredTheme, setTheme, type Theme } from '../../../shared/lib/theme'
import { updateProfileSettings } from '../../profile/model/profileThunks'
import { changeEmail, changePassword } from '../../auth/lib/accountSecurity'
import { updateNotificationPrefs } from '../../notifications/model/notificationsThunks'
import { isKindEnabled } from '../../notifications/model/notificationsSlice'
import type { NotificationKind } from '../../notifications/model/types'
import { loadBlocks, unblockUser } from '../../blocks/model/blocksThunks'
import { notificationOptions } from '../model/settingsData'
import s from './Settings.module.css'

/** Минимальная длина пароля (синхронно с настройкой Supabase Auth). */
const MIN_PASSWORD = 6
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={[s.toggle, on ? s.toggleOn : ''].join(' ')}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
    >
      <span className={s.toggleKnob} aria-hidden />
    </button>
  )
}

function Head({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={s.sectionHead}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <p className={s.sectionDesc}>{desc}</p>
    </div>
  )
}

/* ── Аккаунт и оформление ─────────────────────── */
export function AccountSection() {
  const dispatch = useAppDispatch()
  const [theme, setThemeState] = useState<Theme>(getStoredTheme())
  const isCompany = useAppSelector((st) => st.account.type === 'company')
  const publicProfile = useAppSelector((st) => st.profile.resume.isPublic)
  const showActivity = useAppSelector((st) => st.profile.resume.showActivity)

  return (
    <div>
      <Head title="Аккаунт и оформление" desc="Внешний вид интерфейса и базовые настройки аккаунта" />

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Тема</div>
          <div className={s.rowSub}>Оформление интерфейса</div>
        </div>
        <Select
          ariaLabel="Тема"
          value={theme}
          options={[
            { value: 'light', label: 'Светлая' },
            { value: 'dark', label: 'Тёмная' },
          ]}
          onChange={(t) => {
            setThemeState(t)
            setTheme(t)
          }}
        />
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Публичный профиль</div>
          <div className={s.rowSub}>
            Профиль виден в поиске, рекомендациях и по прямой ссылке. Выключите, чтобы скрыть.
          </div>
        </div>
        <Toggle
          on={publicProfile}
          onToggle={() => void dispatch(updateProfileSettings({ isPublic: !publicProfile }))}
        />
      </div>

      {/* Активность («в сети»/«был(а) недавно») — только у людей; у компаний онлайн-метку не показываем. */}
      {isCompany ? null : (
        <div className={s.row}>
          <div className={s.rowMeta}>
            <div className={s.rowLabel}>Показывать активность</div>
            <div className={s.rowSub}>«В сети» и время последнего посещения</div>
          </div>
          <Toggle
            on={showActivity}
            onToggle={() => void dispatch(updateProfileSettings({ showActivity: !showActivity }))}
          />
        </div>
      )}
    </div>
  )
}

/* ── Вход и безопасность ──────────────────────── */
export function SecuritySection() {
  const email = useAppSelector((st) => st.auth.session?.user.email) ?? '—'
  const [modal, setModal] = useState<null | 'email' | 'password'>(null)

  return (
    <div>
      <Head title="Вход и безопасность" desc="Управление доступом к аккаунту" />

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Почта</div>
          <div className={s.rowSub}>{email}</div>
        </div>
        <button type="button" className={s.btnGhost} onClick={() => setModal('email')}>
          Изменить
        </button>
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Пароль</div>
          <div className={s.rowSub}>Регулярно обновляйте пароль для безопасности</div>
        </div>
        <button type="button" className={s.btnGhost} onClick={() => setModal('password')}>
          Сменить пароль
        </button>
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Телефон</div>
          <div className={s.rowSub}>Привязка телефона появится позже</div>
        </div>
        <span className={s.badgeCurrent}>Скоро</span>
      </div>

      {modal === 'email' ? (
        <EmailModal currentEmail={email} onClose={() => setModal(null)} />
      ) : null}
      {modal === 'password' ? <PasswordModal onClose={() => setModal(null)} /> : null}
    </div>
  )
}

function EmailModal({ currentEmail, onClose }: { currentEmail: string; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    const next = value.trim()
    setErr(null)
    if (!EMAIL_RE.test(next)) return setErr('Введите корректный email')
    if (next.toLowerCase() === currentEmail.toLowerCase()) return setErr('Это ваш текущий email')
    setBusy(true)
    try {
      await changeEmail(next)
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сменить email')
    } finally {
      setBusy(false)
    }
  }

  return (
    <RecModal title="Смена email" onClose={onClose} maxWidth={460}>
      {done ? (
        <div className={s.formCol}>
          <p className={s.formOk}>
            Письмо для подтверждения отправлено на <b>{value.trim()}</b>. Перейдите по ссылке из
            письма — после этого адрес обновится.
          </p>
          <div className={s.formActions}>
            <button type="button" className={s.btnPrimary} onClick={onClose}>
              Понятно
            </button>
          </div>
        </div>
      ) : (
        <div className={s.formCol}>
          <p className={s.formMsg}>
            Текущий адрес: <b>{currentEmail}</b>. На новый адрес придёт письмо для подтверждения.
          </p>
          <Input
            label="Новый email"
            type="email"
            autoComplete="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="you@example.com"
          />
          {err ? <p className={s.formErr}>{err}</p> : null}
          <div className={s.formActions}>
            <button type="button" className={s.btnGhost} onClick={onClose} disabled={busy}>
              Отмена
            </button>
            <button type="button" className={s.btnPrimary} onClick={submit} disabled={busy}>
              {busy ? 'Отправляем…' : 'Отправить письмо'}
            </button>
          </div>
        </div>
      )}
    </RecModal>
  )
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setErr(null)
    if (!current) return setErr('Введите текущий пароль')
    if (next.length < MIN_PASSWORD) return setErr(`Новый пароль — минимум ${MIN_PASSWORD} символов`)
    if (next !== confirm) return setErr('Пароли не совпадают')
    if (next === current) return setErr('Новый пароль совпадает с текущим')
    setBusy(true)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сменить пароль')
    } finally {
      setBusy(false)
    }
  }

  return (
    <RecModal title="Смена пароля" onClose={onClose} maxWidth={460}>
      {done ? (
        <div className={s.formCol}>
          <p className={s.formOk}>Пароль обновлён.</p>
          <div className={s.formActions}>
            <button type="button" className={s.btnPrimary} onClick={onClose}>
              Готово
            </button>
          </div>
        </div>
      ) : (
        <div className={s.formCol}>
          <Input
            label="Текущий пароль"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Input
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            hint={`Минимум ${MIN_PASSWORD} символов`}
          />
          <Input
            label="Повторите новый пароль"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {err ? <p className={s.formErr}>{err}</p> : null}
          <div className={s.formActions}>
            <button type="button" className={s.btnGhost} onClick={onClose} disabled={busy}>
              Отмена
            </button>
            <button type="button" className={s.btnPrimary} onClick={submit} disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сменить пароль'}
            </button>
          </div>
        </div>
      )}
    </RecModal>
  )
}

/* ── Уведомления ──────────────────────────────── */
export function NotificationsSection() {
  const dispatch = useAppDispatch()
  const prefs = useAppSelector((st) => st.notifications.prefs)

  return (
    <div>
      <Head title="Уведомления" desc="Выберите, о чём хотите получать уведомления" />
      {notificationOptions.map((o) => {
        // Группа включена, если включены все её типы.
        const on = o.kinds.every((k) => isKindEnabled(prefs, k))
        const toggle = () => {
          const patch = Object.fromEntries(o.kinds.map((k) => [k, !on])) as Partial<
            Record<NotificationKind, boolean>
          >
          void dispatch(updateNotificationPrefs(patch))
        }
        return (
          <div key={o.id} className={s.row}>
            <div className={s.rowMeta}>
              <div className={s.rowLabel}>{o.label}</div>
              <div className={s.rowSub}>{o.desc}</div>
            </div>
            <Toggle on={on} onToggle={toggle} />
          </div>
        )
      })}
    </div>
  )
}

/* ── Чёрный список ────────────────────────────── */
function formatBlockDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function BlacklistSection() {
  const dispatch = useAppDispatch()
  const list = useAppSelector((st) => st.blocks.mine)
  const status = useAppSelector((st) => st.blocks.status)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (status === 'idle') void dispatch(loadBlocks())
  }, [status, dispatch])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((b) => b.name.toLowerCase().includes(q))
  }, [list, query])

  return (
    <div>
      <Head title="Чёрный список" desc="Заблокированные пользователи и компании" />

      {list.length ? (
        <input
          className={s.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по чёрному списку"
        />
      ) : null}

      {filtered.length ? (
        <div className={s.list}>
          {filtered.map((b) => (
            <div key={b.id} className={s.blockItem}>
              <span
                className={[s.blockAvatar, b.kind === 'company' ? s.blockAvatarSquare : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
              >
                {b.avatar ? <img className={s.blockAvatarImg} src={b.avatar} alt="" /> : b.name[0]}
              </span>
              <div className={s.blockMeta}>
                <div className={s.blockName}>{b.name}</div>
                <div className={s.blockSub}>Заблокирован · {formatBlockDate(b.createdAt)}</div>
              </div>
              <span className={s.blockType}>{b.kind === 'company' ? 'Компания' : 'Пользователь'}</span>
              <button
                type="button"
                className={s.btnDanger}
                onClick={() => void dispatch(unblockUser(b.id))}
              >
                Разблокировать
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          {list.length ? 'Ничего не найдено' : 'Чёрный список пуст'}
        </div>
      )}
    </div>
  )
}
