import { useMemo, useState } from 'react'
import { useAppSelector } from '../../../app/store/hooks'
import { Select } from '../../../shared/ui/Select/Select'
import { getStoredTheme, setTheme, type Theme } from '../../../shared/lib/theme'
import {
  adStatsMock,
  analyticsMock,
  blacklistMock,
  devicesMock,
  notificationOptions,
  plansMock,
  transactionsMock,
} from '../model/settingsData'
import s from './Settings.module.css'

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
  const [theme, setThemeState] = useState<Theme>(getStoredTheme())
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [publicProfile, setPublicProfile] = useState(true)
  const [showActivity, setShowActivity] = useState(false)

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
          <div className={s.rowLabel}>Язык</div>
          <div className={s.rowSub}>Язык интерфейса</div>
        </div>
        <Select
          ariaLabel="Язык"
          value={lang}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
          ]}
          onChange={setLang}
        />
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Публичный профиль</div>
          <div className={s.rowSub}>Профиль виден всем пользователям</div>
        </div>
        <Toggle on={publicProfile} onToggle={() => setPublicProfile((v) => !v)} />
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Показывать активность</div>
          <div className={s.rowSub}>«В сети» и время последнего входа</div>
        </div>
        <Toggle on={showActivity} onToggle={() => setShowActivity((v) => !v)} />
      </div>
    </div>
  )
}

/* ── Вход и безопасность ──────────────────────── */
export function SecuritySection() {
  const resume = useAppSelector((st) => st.profile.resume)
  const [twoFa, setTwoFa] = useState(false)
  const email = resume.contacts.find((c) => c.label === 'Email')?.value ?? 'user@kolibel.app'
  const phone = resume.contacts.find((c) => c.label === 'Телефон')?.value ?? '+7 999 000-00-00'

  return (
    <div>
      <Head title="Вход и безопасность" desc="Управление доступом к аккаунту" />

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Почта</div>
          <div className={s.rowSub}>{email}</div>
        </div>
        <button type="button" className={s.btnGhost}>
          Изменить
        </button>
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Телефон</div>
          <div className={s.rowSub}>{phone}</div>
        </div>
        <button type="button" className={s.btnGhost}>
          Изменить
        </button>
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Пароль</div>
          <div className={s.rowSub}>Последнее изменение — 2 месяца назад</div>
        </div>
        <button type="button" className={s.btnGhost}>
          Сменить пароль
        </button>
      </div>

      <div className={s.row}>
        <div className={s.rowMeta}>
          <div className={s.rowLabel}>Двухфакторная аутентификация</div>
          <div className={s.rowSub}>Подтверждение входа по коду</div>
        </div>
        <Toggle on={twoFa} onToggle={() => setTwoFa((v) => !v)} />
      </div>

      <div className={s.sectionHead} style={{ marginTop: 24, marginBottom: 8 }}>
        <h2 className={s.sectionTitle} style={{ fontSize: 16 }}>
          Активные устройства
        </h2>
      </div>
      <div className={s.list}>
        {devicesMock.map((d) => (
          <div key={d.id} className={s.deviceItem}>
            <div>
              <div className={s.deviceName}>{d.name}</div>
              <div className={s.deviceMeta}>{d.meta}</div>
            </div>
            {d.current ? (
              <span className={s.badgeCurrent}>Это устройство</span>
            ) : (
              <button type="button" className={s.btnGhost}>
                Выйти
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Уведомления ──────────────────────────────── */
export function NotificationsSection() {
  const [opts, setOpts] = useState(notificationOptions)

  function toggle(id: string) {
    setOpts((prev) => prev.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)))
  }

  return (
    <div>
      <Head title="Уведомления" desc="Выберите, о чём хотите получать уведомления" />
      {opts.map((o) => (
        <div key={o.id} className={s.row}>
          <div className={s.rowMeta}>
            <div className={s.rowLabel}>{o.label}</div>
            <div className={s.rowSub}>{o.desc}</div>
          </div>
          <Toggle on={o.enabled} onToggle={() => toggle(o.id)} />
        </div>
      ))}
    </div>
  )
}

/* ── Аналитика ────────────────────────────────── */
export function AnalyticsSection() {
  return (
    <div>
      <Head title="Аналитика" desc="Активность вашего аккаунта и рынок по вашей профессии" />
      <div className={s.statGrid}>
        {analyticsMock.map((a) => (
          <div key={a.id} className={s.statCard}>
            <div className={s.statValue}>{a.value}</div>
            <div className={s.statLabel}>{a.label}</div>
            <div className={s.statDelta}>{a.delta}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Подписки и оплата ────────────────────────── */
export function BillingSection() {
  return (
    <div>
      <Head title="Подписки и оплата" desc="Текущий тариф, варианты подписки и история платежей" />

      <div className={s.planGrid}>
        {plansMock.map((p) => (
          <div key={p.id} className={[s.planCard, p.current ? s.planCardCurrent : ''].join(' ')}>
            <div className={s.planName}>{p.name}</div>
            <div>
              <span className={s.planPrice}>{p.price}</span> <span className={s.planPeriod}>{p.period}</span>
            </div>
            <ul className={s.planFeatures}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              className={[s.planBtn, p.current ? s.btnGhost : s.btnPrimary].join(' ')}
              disabled={p.current}
            >
              {p.current ? 'Текущий тариф' : 'Подключить'}
            </button>
          </div>
        ))}
      </div>

      <div className={s.sectionHead} style={{ marginTop: 24, marginBottom: 8 }}>
        <h2 className={s.sectionTitle} style={{ fontSize: 16 }}>
          Последние транзакции
        </h2>
      </div>
      <div className={s.list}>
        {transactionsMock.map((t) => (
          <div key={t.id} className={s.txItem}>
            <div>
              <div className={s.txTitle}>{t.title}</div>
              <div className={s.txDate}>{t.date}</div>
            </div>
            <div className={[s.txAmount, t.amount.startsWith('+') ? s.txAmountPlus : ''].join(' ')}>
              {t.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Рекламные данные ─────────────────────────── */
export function AdsSection() {
  return (
    <div>
      <Head title="Рекламные данные" desc="Продвижение и статистика ваших рекламных кампаний" />

      <div className={s.adPromo}>
        <div className={s.adPromoTitle}>Продвигайте себя и свою компанию</div>
        <p className={s.adPromoText}>
          Покажите свой аккаунт, резюме или компанию большему числу людей. Выберите, что продвигать —
          и отслеживайте результат в реальном времени.
        </p>
        <div className={s.adPromoBtns}>
          <button type="button" className={s.btnPrimary}>
            Продвигать аккаунт
          </button>
          <button type="button" className={s.btnGhost}>
            Продвигать резюме
          </button>
          <button type="button" className={s.btnGhost}>
            Продвигать компанию
          </button>
        </div>
      </div>

      <div className={s.sectionHead} style={{ marginBottom: 10 }}>
        <h2 className={s.sectionTitle} style={{ fontSize: 16 }}>
          Текущая кампания
        </h2>
        <p className={s.sectionDesc}>Продвижение резюме · активна</p>
      </div>
      <div className={s.statGrid}>
        {adStatsMock.map((a) => (
          <div key={a.id} className={s.statCard}>
            <div className={s.statValue}>{a.value}</div>
            <div className={s.statLabel}>{a.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Чёрный список ────────────────────────────── */
export function BlacklistSection() {
  const [list, setList] = useState(blacklistMock)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((b) => `${b.name} ${b.type} ${b.sub}`.toLowerCase().includes(q))
  }, [list, query])

  return (
    <div>
      <Head title="Чёрный список" desc="Заблокированные пользователи и компании" />

      <input
        className={s.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по чёрному списку"
      />

      {filtered.length ? (
        <div className={s.list}>
          {filtered.map((b) => (
            <div key={b.id} className={s.blockItem}>
              <span className={s.blockAvatar} aria-hidden>
                {b.name[0]}
              </span>
              <div className={s.blockMeta}>
                <div className={s.blockName}>{b.name}</div>
                <div className={s.blockSub}>{b.sub}</div>
              </div>
              <span className={s.blockType}>{b.type}</span>
              <button
                type="button"
                className={s.btnDanger}
                onClick={() => setList((prev) => prev.filter((x) => x.id !== b.id))}
              >
                Убрать
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.empty}>Ничего не найдено</div>
      )}
    </div>
  )
}
