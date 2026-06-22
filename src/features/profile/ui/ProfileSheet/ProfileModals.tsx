import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { QRCodeSVG } from 'qrcode.react'
import { ShareToChatModal } from '../../../chat/ui/ShareToChatModal'
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks'
import { saveProfile } from '../../model/profileThunks'
import type {
  ContactLink,
  EducationItem,
  ExperienceItem,
  JobStatus,
  LanguageItem,
  Resume,
} from '../../model/types'
import { useProfilePulse, buildSparkline, formatDelta } from '../../lib/useProfilePulse'
import { findCompanyLogoByName } from '../../../company/lib/findCompanyLogo'
import { CompanyAutocomplete } from '../../../company/ui/CompanyAutocomplete'
import { ImageUploadField } from '../../../../shared/ui/ImageUploadField/ImageUploadField'
import { LocationField } from '../../../../shared/ui/LocationField/LocationField'
import { sanitizePersonName } from '../../../../shared/lib/nameValidation'
import { Ic } from './icons'
import type { SectionId } from './ResumeView'
import { ResumeDocument } from './ResumeDocument'
import m from './ProfileModals.module.css'

/** Активная модалка профиля. */
export type ProfileModalState =
  | null
  | { kind: 'edit-header' }
  | { kind: 'status' }
  | { kind: 'about' }
  | { kind: 'skills' }
  | { kind: 'languages' }
  | { kind: 'contacts' }
  | { kind: 'banner' }
  | { kind: 'avatar' }
  | { kind: 'share' }
  | { kind: 'pdf' }
  | { kind: 'analytics' }
  | { kind: 'layout' }
  | { kind: 'experience'; item: ExperienceItem | null }
  | { kind: 'education'; item: EducationItem | null }

// ── Базовый каркас ──────────────────────────────────────────
function Modal({
  size,
  title,
  sub,
  onClose,
  children,
  footer,
}: {
  size?: 'lg' | 'xl'
  title: string
  sub?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
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

  return createPortal(
    <div
      className={m.scrim}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div
        className={[m.modal, size === 'lg' ? m.modalLg : '', size === 'xl' ? m.modalXl : '']
          .filter(Boolean)
          .join(' ')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={m.mHead}>
          <div>
            <div className={m.mTitle}>{title}</div>
            {sub ? <div className={m.mSub}>{sub}</div> : null}
          </div>
          <button type="button" className={m.mClose} onClick={onClose} aria-label="Закрыть">
            <Ic.close size={18} />
          </button>
        </div>
        <div className={m.mBody}>{children}</div>
        {footer ? <div className={m.mFoot}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/** Хук сохранения резюме: патчит текущее резюме и сохраняет в БД. */
function useSaveResume(showToast: (s: string) => void, onClose: () => void) {
  const dispatch = useAppDispatch()
  const resume = useAppSelector((s) => s.profile.resume)
  const [busy, setBusy] = useState(false)
  async function save(patch: Partial<Resume>, toast: string) {
    setBusy(true)
    const res = await dispatch(saveProfile({ ...resume, ...patch }))
    setBusy(false)
    if (saveProfile.fulfilled.match(res)) {
      showToast(toast)
      onClose()
    } else {
      showToast('Не удалось сохранить')
    }
  }
  // Сохранение без закрытия модалки (для списков, где добавление/удаление сразу персистится).
  async function persist(patch: Partial<Resume>) {
    const res = await dispatch(saveProfile({ ...resume, ...patch }))
    if (!saveProfile.fulfilled.match(res)) showToast('Не удалось сохранить')
  }
  return { resume, save, persist, busy }
}

// ── 1. Заголовок ────────────────────────────────────────────
function EditHeaderModal({ onClose, showToast }: ModalProps) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const [name, setName] = useState(resume.fullName)
  const [jobTitle, setJobTitle] = useState(resume.jobTitle)
  const [company, setCompany] = useState(resume.jobStatus.company ?? '')
  const [location, setLocation] = useState(resume.location)
  const [country, setCountry] = useState(resume.country ?? '')
  const [resolving, setResolving] = useState(false)

  async function submit() {
    // Подтягиваем логотип работодателя по названию компании (для бейджа рядом с именем).
    setResolving(true)
    const trimmed = company.trim()
    const companyLogo = trimmed ? (await findCompanyLogoByName(trimmed)) ?? undefined : undefined
    setResolving(false)
    await save(
      {
        fullName: name,
        jobTitle,
        location,
        country: country || undefined,
        jobStatus: { ...resume.jobStatus, company: trimmed || undefined, companyLogo },
      },
      'Заголовок обновлён',
    )
  }

  return (
    <Modal
      title="Редактировать заголовок"
      sub="Имя, должность, локация — то, что видят первым"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={[m.btnGhost].join(' ')} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} disabled={busy || resolving} type="button" onClick={submit}>
            Сохранить
          </button>
        </>
      }
    >
      <Field label="Имя и фамилия">
        <input className={m.input} value={name} onChange={(e) => setName(sanitizePersonName(e.target.value))} />
      </Field>
      <div className={m.fGrid2}>
        <Field label="Должность">
          <input
            className={m.input}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Senior Product Designer"
          />
        </Field>
        <Field label="Компания">
          <CompanyAutocomplete
            value={company}
            onChange={setCompany}
            inputClassName={m.input}
            placeholder="Где работаешь сейчас"
          />
        </Field>
      </div>
      <Field label="Город · Страна">
        <LocationField
          city={location}
          country={country}
          onChange={(c, ctry) => {
            setLocation(c)
            setCountry(ctry)
          }}
          inputClassName={m.input}
          placeholder="Начните вводить город"
        />
      </Field>
    </Modal>
  )
}

// ── 2. Статус ───────────────────────────────────────────────
function StatusModal({ onClose, showToast }: ModalProps) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const [pick, setPick] = useState<JobStatus['kind']>(resume.jobStatus.kind)
  const opts: { id: JobStatus['kind']; t: string; d: string; em: string }[] = [
    { id: 'seeking', t: 'Активно ищу работу', d: 'Профиль попадёт в подборки HR, появится бейдж «в поиске».', em: '🔥' },
    { id: 'open', t: 'Рассматриваю предложения', d: 'Работаю, но открыт к интересным офферам.', em: '👀' },
    { id: 'not_seeking', t: 'Не ищу сейчас', d: 'Бейдж скрыт, в HR-подборки не попадаешь.', em: '🌿' },
  ]
  return (
    <Modal
      title="Статус поиска работы"
      sub="Виден всем, кто открывает твой профиль"
      onClose={onClose}
      footer={
        <>
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button
            className={m.btnPrimary}
            disabled={busy}
            type="button"
            onClick={() => save({ jobStatus: { ...resume.jobStatus, kind: pick } }, 'Статус обновлён')}
          >
            Сохранить
          </button>
        </>
      }
    >
      <div className={m.statusChoice}>
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            className={[m.statusOpt, pick === o.id ? m.statusOptOn : ''].filter(Boolean).join(' ')}
            onClick={() => setPick(o.id)}
          >
            <span className={m.statusRad} />
            <span className={m.statusMeta}>
              <div className={m.statusTitle}>{o.t}</div>
              <div className={m.statusDesc}>{o.d}</div>
            </span>
            <span className={m.statusEmoji}>{o.em}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

// ── 3. О себе ───────────────────────────────────────────────
function AboutModal({ onClose, showToast }: ModalProps) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const [v, setV] = useState(resume.about)
  return (
    <Modal
      title="О себе"
      sub="Короткое самоописание — открывает резюме"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} disabled={busy} type="button" onClick={() => save({ about: v }, 'Обновлено')}>
            Сохранить
          </button>
        </>
      }
    >
      <textarea
        className={m.textarea}
        rows={10}
        value={v}
        onChange={(e) => setV(e.target.value.slice(0, 1000))}
        style={{ minHeight: 200 }}
      />
      <div className={m.fHint} style={{ marginTop: 6 }}>
        {v.length}/1000 · разбивай на абзацы — так читают чаще
      </div>
    </Modal>
  )
}

// ── 8. Опыт ─────────────────────────────────────────────────
function ExperienceModal({ onClose, showToast, item }: ModalProps & { item: ExperienceItem | null }) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const isEdit = !!item
  const [role, setRole] = useState(item?.role ?? '')
  const [company, setCompany] = useState(item?.company ?? '')
  const [period, setPeriod] = useState(item?.period ?? '')
  const [current, setCurrent] = useState(!!item?.current)
  const [summary, setSummary] = useState(item?.summary ?? '')
  const [bullets, setBullets] = useState((item?.achievements ?? []).join('\n'))
  const [stack, setStack] = useState<string[]>(item?.stack ?? [])

  function commit() {
    const next: ExperienceItem = {
      id: item?.id ?? `exp-${crypto.randomUUID()}`,
      role,
      company,
      period,
      current,
      summary,
      achievements: bullets.split('\n').map((b) => b.trim()).filter(Boolean),
      stack,
      startMonth: item?.startMonth,
      startYear: item?.startYear,
      endMonth: item?.endMonth,
      endYear: item?.endYear,
    }
    const list = isEdit
      ? resume.experience.map((e) => (e.id === next.id ? next : e))
      : [...resume.experience, next]
    save({ experience: list }, isEdit ? 'Обновлено' : 'Опыт добавлен')
  }

  function del() {
    save({ experience: resume.experience.filter((e) => e.id !== item!.id) }, 'Запись удалена')
  }

  return (
    <Modal
      title={isEdit ? 'Редактировать опыт' : 'Новое место работы'}
      sub={isEdit ? company : 'Заполни ключевые поля — детали можно дописать позже'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {isEdit ? (
            <button className={m.btnGhost} style={{ color: 'var(--bad)' }} onClick={del} type="button" disabled={busy}>
              Удалить
            </button>
          ) : null}
          <div className={m.mFootSpacer} />
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} onClick={commit} type="button" disabled={busy}>
            Сохранить
          </button>
        </>
      }
    >
      <div className={m.fGrid2}>
        <Field label="Должность">
          <input className={m.input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Product Designer" />
        </Field>
        <Field label="Компания">
          <input className={m.input} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Avito" />
        </Field>
      </div>
      <Field label="Период">
        <input
          className={m.input}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="июль 2022 — сейчас"
        />
      </Field>
      <label className={m.checkRow}>
        <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} />
        Работаю здесь сейчас
      </label>
      <Field label="Короткое описание роли">
        <textarea className={m.textarea} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label="Ключевые достижения (по одному в строку)">
        <textarea
          className={m.textarea}
          rows={5}
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          placeholder="Запустил новый онбординг — +18% к конверсии за 3 месяца"
        />
      </Field>
      <Field label="Стек">
        <ChipsEditor value={stack} onChange={setStack} placeholder="Figma, Notion, Linear…" />
      </Field>
    </Modal>
  )
}

// ── 9. Образование ──────────────────────────────────────────
function EducationModal({ onClose, showToast, item }: ModalProps & { item: EducationItem | null }) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const isEdit = !!item
  const [inst, setInst] = useState(item?.institution ?? '')
  const [degree, setDegree] = useState(item?.degree ?? '')
  const [period, setPeriod] = useState(item?.period ?? '')

  function commit() {
    const next: EducationItem = { id: item?.id ?? `edu-${crypto.randomUUID()}`, institution: inst, degree, period }
    const list = isEdit ? resume.education.map((e) => (e.id === next.id ? next : e)) : [...resume.education, next]
    save({ education: list }, isEdit ? 'Обновлено' : 'Добавлено')
  }
  function del() {
    save({ education: resume.education.filter((e) => e.id !== item!.id) }, 'Запись удалена')
  }

  return (
    <Modal
      title={isEdit ? 'Редактировать образование' : 'Новое образование'}
      onClose={onClose}
      footer={
        <>
          {isEdit ? (
            <button className={m.btnGhost} style={{ color: 'var(--bad)' }} onClick={del} type="button" disabled={busy}>
              Удалить
            </button>
          ) : null}
          <div className={m.mFootSpacer} />
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} onClick={commit} type="button" disabled={busy}>
            Сохранить
          </button>
        </>
      }
    >
      <Field label="Учебное заведение">
        <input className={m.input} value={inst} onChange={(e) => setInst(e.target.value)} placeholder="МГУ им. М.В. Ломоносова" />
      </Field>
      <Field label="Степень / специальность / курс">
        <input className={m.input} value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="Бакалавр, прикладная математика" />
      </Field>
      <Field label="Годы">
        <input className={m.input} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2010 — 2014" />
      </Field>
    </Modal>
  )
}

// ── 10. Навыки (плоский список) ─────────────────────────────
function SkillsModal({ onClose, showToast }: ModalProps) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const [skills, setSkills] = useState<string[]>(resume.skills)
  const suggestions = ['Figma', 'Дизайн-системы', 'Прототипирование', 'UX-аудит', 'Research', 'Менторинг', 'Motion', 'Webflow'].filter(
    (s) => !skills.includes(s),
  )
  return (
    <Modal
      title="Навыки"
      sub="Ключевые навыки — помогают рекрутёру сканировать резюме"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} onClick={() => save({ skills }, 'Навыки сохранены')} type="button" disabled={busy}>
            Сохранить
          </button>
        </>
      }
    >
      <Field label="Навыки">
        <ChipsEditor value={skills} onChange={setSkills} placeholder="Добавить навык — Enter, чтобы закрепить" />
      </Field>
      {suggestions.length ? (
        <Field label="Подсказки">
          <div className={m.suggestRow}>
            {suggestions.map((s) => (
              <button key={s} type="button" className={m.addChip} onClick={() => setSkills([...skills, s])}>
                <Ic.plusSm /> {s}
              </button>
            ))}
          </div>
        </Field>
      ) : null}
    </Modal>
  )
}

// ── 11. Языки ───────────────────────────────────────────────
const LEVELS = ['Родной', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1']
const LANGUAGES = [
  'Английский', 'Русский', 'Немецкий', 'Французский', 'Испанский', 'Итальянский', 'Португальский',
  'Китайский', 'Японский', 'Корейский', 'Арабский', 'Турецкий', 'Хинди', 'Польский', 'Украинский',
  'Белорусский', 'Казахский', 'Узбекский', 'Азербайджанский', 'Армянский', 'Грузинский', 'Киргизский',
  'Таджикский', 'Туркменский', 'Нидерландский', 'Шведский', 'Норвежский', 'Датский', 'Финский',
  'Чешский', 'Словацкий', 'Венгерский', 'Румынский', 'Болгарский', 'Сербский', 'Хорватский', 'Греческий',
  'Иврит', 'Персидский', 'Вьетнамский', 'Тайский', 'Индонезийский', 'Малайский', 'Монгольский', 'Латышский',
  'Литовский', 'Эстонский',
]

function LanguagesModal({ onClose, showToast }: ModalProps) {
  const { resume, persist } = useSaveResume(showToast, onClose)
  const [list, setList] = useState<LanguageItem[]>(resume.languages)
  const [name, setName] = useState('Английский')
  const [level, setLevel] = useState('B2')
  function add() {
    if (!name.trim() || list.some((l) => l.name === name)) return
    const next = [...list, { name, level }]
    setList(next)
    void persist({ languages: next })
  }
  function remove(i: number) {
    const next = list.filter((_, j) => j !== i)
    setList(next)
    void persist({ languages: next })
  }
  return (
    <Modal title="Языки" onClose={onClose}>
      <div className={m.rowList}>
        {list.map((l, i) => (
          <div key={i} className={m.rowItem}>
            <span className={m.rowItemName}>{l.name}</span>
            <span className={m.rowItemSub}>{l.level}</span>
            <button className={m.rowDel} type="button" onClick={() => remove(i)} aria-label="Удалить">
              <Ic.trash />
            </button>
          </div>
        ))}
      </div>
      <Field label="Добавить язык">
        <div className={m.addRow}>
          <select className={[m.select, m.addVal].join(' ')} value={name} onChange={(e) => setName(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select className={[m.select, m.addType].join(' ')} value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button className={m.addBtn} type="button" onClick={add}>
            <Ic.plus /> Добавить
          </button>
        </div>
      </Field>
    </Modal>
  )
}

// ── 12. Контакты ────────────────────────────────────────────
const CONTACT_TYPES = ['Telegram', 'Email', 'VK', 'MAX', 'Телефон', 'Сайт']

/** Ссылка по типу контакта и введённому значению. */
function deriveHref(label: string, value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  const handle = v.replace(/^@/, '')
  switch (label) {
    case 'Email':
      return `mailto:${v}`
    case 'Телефон':
      return `tel:${v.replace(/[^\d+]/g, '')}`
    case 'Telegram':
      return `https://t.me/${handle}`
    case 'VK':
      return v.includes('vk.com') ? `https://${v.replace(/^https?:\/\//, '')}` : `https://vk.com/${handle}`
    case 'MAX':
      return v.includes('.') ? `https://${v.replace(/^https?:\/\//, '')}` : v
    case 'Сайт':
      return v.includes('.') ? `https://${v.replace(/^https?:\/\//, '')}` : v
    default:
      return v
  }
}

function ContactsModal({ onClose, showToast }: ModalProps) {
  const { resume, persist } = useSaveResume(showToast, onClose)
  const [list, setList] = useState<ContactLink[]>(resume.contacts)
  const [label, setLabel] = useState('Telegram')
  const [value, setValue] = useState('')
  function add() {
    if (!value.trim()) return
    const next = [...list, { label, value: value.trim(), href: deriveHref(label, value.trim()) }]
    setList(next)
    setValue('')
    void persist({ contacts: next })
  }
  function remove(i: number) {
    const next = list.filter((_, j) => j !== i)
    setList(next)
    void persist({ contacts: next })
  }
  return (
    <Modal title="Контакты и ссылки" sub="Всё, по чему с тобой можно связаться" onClose={onClose}>
      <div className={m.rowList}>
        {list.map((c, i) => (
          <div key={i} className={m.rowItem}>
            <span className={m.rowItemLab}>{c.label}</span>
            <span className={m.rowItemVal}>{c.value}</span>
            <button className={m.rowDel} type="button" onClick={() => remove(i)} aria-label="Удалить">
              <Ic.trash />
            </button>
          </div>
        ))}
      </div>
      <Field label="Добавить контакт">
        <div className={m.addRow}>
          <select className={[m.select, m.addType].join(' ')} value={label} onChange={(e) => setLabel(e.target.value)}>
            {CONTACT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            className={[m.input, m.addVal].join(' ')}
            placeholder="Значение или ссылка"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button
            className={[m.addBtn, m.addBtnIcon].join(' ')}
            type="button"
            onClick={add}
            disabled={!value.trim()}
            aria-label="Добавить"
            title="Добавить"
          >
            <Ic.plus />
          </button>
        </div>
      </Field>
    </Modal>
  )
}

// ── 13/14. Обложка / Аватар ─────────────────────────────────
function BannerModal({ onClose, showToast }: ModalProps) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const [banner, setBanner] = useState(resume.banner)
  return (
    <Modal
      title="Обложка профиля"
      sub="Большое впечатление за две секунды"
      onClose={onClose}
      footer={
        <>
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} onClick={() => save({ banner }, 'Обложка обновлена')} type="button" disabled={busy}>
            Сохранить
          </button>
        </>
      }
    >
      <ImageUploadField label="Обложка (1600×600)" value={banner} onChange={setBanner} category="banner" shape="wide" />
    </Modal>
  )
}

function AvatarModal({ onClose, showToast }: ModalProps) {
  const { resume, save, busy } = useSaveResume(showToast, onClose)
  const [avatar, setAvatar] = useState(resume.avatar)
  return (
    <Modal
      title="Фото профиля"
      sub="Лицо человека работает лучше логотипа"
      onClose={onClose}
      footer={
        <>
          <button className={m.btnGhost} onClick={onClose} type="button">
            Отмена
          </button>
          <button className={m.btnPrimary} onClick={() => save({ avatar }, 'Фото обновлено')} type="button" disabled={busy}>
            Сохранить
          </button>
        </>
      }
    >
      <div className={m.uploadNote}>
        <div className={m.uploadNoteText}>
          <div className={m.uploadNoteTitle}>Квадратное фото на нейтральном фоне</div>
          <div className={m.uploadNoteSub}>Лицо в центре, плечи в кадре, без сильных фильтров. Минимум 400×400.</div>
        </div>
      </div>
      <ImageUploadField label="Фото профиля" value={avatar} onChange={setAvatar} category="avatar" shape="round" />
    </Modal>
  )
}

// ── 3. Поделиться ───────────────────────────────────────────
function ShareModal({ onClose, showToast }: ModalProps) {
  const myId = useAppSelector((s) => s.auth.user?.id)
  const resume = useAppSelector((s) => s.profile.resume)
  const url = `${window.location.origin}/u/${myId ?? ''}`
  const [copied, setCopied] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  function copy() {
    void navigator.clipboard?.writeText(url)
    setCopied(true)
    showToast('Ссылка скопирована')
    setTimeout(() => setCopied(false), 2000)
  }

  // Мини-карточка профиля для пересылки в чат (как во вкладке «Сеть»).
  const profileAttach = {
    kind: 'profile' as const,
    title: resume.fullName || 'Профиль',
    profile: {
      id: myId ?? '',
      name: resume.fullName || 'Профиль',
      avatar: resume.avatar,
      role: [resume.jobTitle, resume.jobStatus.company].filter(Boolean).join(' · ') || undefined,
      location: [resume.location, resume.country].filter(Boolean).join(', ') || undefined,
      isCompany: false,
      banner: resume.banner,
    },
  }

  return (
    <Modal
      title="Поделиться профилем"
      sub="Публичная ссылка работает без входа на Kolibel"
      onClose={onClose}
      footer={
        <button className={m.btnGhost} onClick={onClose} type="button">
          Закрыть
        </button>
      }
    >
      <div className={m.linkRow}>
        <span className={m.linkUrl}>{url}</span>
        <button className={[m.linkCopy, copied ? m.linkCopyDone : ''].filter(Boolean).join(' ')} onClick={copy} type="button">
          {copied ? <Ic.check /> : <Ic.copy />} {copied ? 'Скопировано' : 'Скопировать'}
        </button>
      </div>

      <button type="button" className={m.shareChatBtn} onClick={() => setChatOpen(true)}>
        <span className={m.shareChatIco}>
          <Ic.share />
        </span>
        <span className={m.shareChatText}>
          <span className={m.shareChatTitle}>Отправить в чат</span>
          <span className={m.shareChatSub}>Поделиться профилем с собеседником на Kolibel</span>
        </span>
        <Ic.arrowRight />
      </button>

      <div className={m.qrCard}>
        <div className={m.qrBox}>
          <QRCodeSVG value={url} size={104} bgColor="transparent" fgColor="#1f2328" />
        </div>
        <div style={{ flex: 1 }}>
          <div className={m.qrTitle}>QR-код для оффлайна</div>
          <div className={m.qrSub}>Покажи на встрече — рекрутёр откроет профиль одним кликом.</div>
        </div>
      </div>

      {chatOpen ? (
        <ShareToChatModal
          message={{ attach: profileAttach }}
          title="Отправить профиль"
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </Modal>
  )
}

// ── 4. PDF (печать) ─────────────────────────────────────────
const PDF_TPLS = [
  { id: 'warm', nm: 'Тёплый Kolibel', ds: 'Коралл, Manrope — фирменный стиль', c1: '#ff7f50' },
  { id: 'mono', nm: 'Строгий графит', ds: 'Сдержанный, для классических HR', c1: '#1f2328' },
  { id: 'ocean', nm: 'Морская синь', ds: 'Спокойный сине-стальной акцент', c1: '#2563eb' },
  { id: 'forest', nm: 'Изумруд', ds: 'Тёплый зелёный — мягко и солидно', c1: '#0f766e' },
]

/**
 * Прямое сохранение листа резюме в PDF-файл (без окна печати): рендерим
 * A4-лист офскрином, снимаем html2canvas → собираем jsPDF (с разбивкой на
 * страницы) → `pdf.save()`. Возвращает off-screen-узел для захвата.
 */
function useResumeDownload(resume: Resume, accent: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  async function download() {
    const node = ref.current
    if (!node || busy) return
    setBusy(true)
    try {
      // Шрифты должны быть готовы до снимка, иначе подставится дефолтный.
      await document.fonts?.ready
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const imgH = (canvas.height * pageW) / canvas.width
      const img = canvas.toDataURL('image/png')
      let heightLeft = imgH
      let position = 0
      pdf.addImage(img, 'PNG', 0, position, pageW, imgH, undefined, 'FAST')
      heightLeft -= pageH
      while (heightLeft > 0) {
        position -= pageH
        pdf.addPage()
        pdf.addImage(img, 'PNG', 0, position, pageW, imgH, undefined, 'FAST')
        heightLeft -= pageH
      }
      const safeName = (resume.fullName || 'Резюме').trim().replace(/[\\/:*?"<>|]+/g, ' ')
      pdf.save(`${safeName} — резюме.pdf`)
    } finally {
      setBusy(false)
    }
  }

  const offscreen = (
    <div ref={ref} className={m.pdfOffscreen} aria-hidden>
      <ResumeDocument resume={resume} accent={accent} />
    </div>
  )

  return { download, busy, offscreen }
}

function PdfModal({ onClose, showToast }: ModalProps) {
  const resume = useAppSelector((s) => s.profile.resume)
  const [tpl, setTpl] = useState('warm')
  const cur = PDF_TPLS.find((t) => t.id === tpl)!
  const { download, busy, offscreen } = useResumeDownload(resume, cur.c1)

  async function onDownload() {
    showToast('Готовим PDF…')
    try {
      await download()
      showToast('PDF сохранён')
    } catch {
      showToast('Не удалось собрать PDF')
    }
  }

  return (
    <Modal
      title="Скачать резюме в PDF"
      sub="Готовый PDF-файл сохранится сразу — без окна печати"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className={m.btnGhost} onClick={onClose} type="button" disabled={busy}>
            Отмена
          </button>
          <button className={m.btnPrimary} type="button" onClick={onDownload} disabled={busy}>
            <Ic.download /> {busy ? 'Готовим PDF…' : 'Скачать PDF'}
          </button>
        </>
      }
    >
      <div className={m.pdfRow}>
        <div className={m.pdfPreview}>
          <div className={m.pdfPaper}>
            <ResumeDocument resume={resume} accent={cur.c1} />
          </div>
        </div>
        <div className={m.pdfSide}>
          <div className={m.fLabel} style={{ marginBottom: 8 }}>
            Цвет шаблона
          </div>
          <div className={m.pdfTemplates}>
            {PDF_TPLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={[m.pdfTpl, tpl === t.id ? m.pdfTplOn : ''].filter(Boolean).join(' ')}
                onClick={() => setTpl(t.id)}
              >
                <div className={m.pdfSwatch} style={{ background: t.c1 }} />
                <div>
                  <div className={m.pdfTplNm}>{t.nm}</div>
                  <div className={m.pdfTplDs}>{t.ds}</div>
                </div>
              </button>
            ))}
          </div>
          <div className={m.pdfHint}>
            Резюме соберётся из заполненных секций профиля. Чем подробнее профиль — тем
            полнее лист.
          </div>
        </div>
      </div>
      {offscreen}
    </Modal>
  )
}

// ── 5. Аналитика ────────────────────────────────────────────
function AnalyticsModal({ onClose }: ModalProps) {
  const pulse = useProfilePulse()
  const w = 540
  const h = 130
  const { line, area } = buildSparkline(pulse.series, w, h, 12)
  return (
    <Modal title="Аналитика профиля" sub="Что происходило за последние 7 дней" onClose={onClose} size="lg"
      footer={<button className={m.btnGhost} onClick={onClose} type="button">Закрыть</button>}>
      <div className={m.anGrid}>
        <div className={m.anCard}>
          <div className={m.anCardN}>
            {pulse.views.count}{' '}
            <span className={m.anDelta} style={{ color: pulse.views.deltaPct > 0 ? undefined : 'var(--muted)' }}>
              {formatDelta(pulse.views.deltaPct)}
            </span>
          </div>
          <div className={m.anCardL}>просмотров профиля</div>
        </div>
        <div className={m.anCard}>
          <div className={m.anCardN}>
            {pulse.applications.count}{' '}
            <span className={m.anDelta} style={{ color: pulse.applications.deltaPct > 0 ? undefined : 'var(--muted)' }}>
              {formatDelta(pulse.applications.deltaPct)}
            </span>
          </div>
          <div className={m.anCardL}>откликов работодателей</div>
        </div>
        <div className={m.anCard}>
          <div className={m.anCardN}>
            +{pulse.newConnections.count} <span className={m.anDelta}>за нед.</span>
          </div>
          <div className={m.anCardL}>новых связей</div>
        </div>
      </div>
      <div className={m.anChart}>
        <div className={m.anChartTi}>Просмотры за 7 дней</div>
        <div className={m.anChartMe}>Динамика по дням недели</div>
        <div className={m.anChartBox}>
          <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="anG" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity=".30" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#anG)" />
            <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className={m.anChart} style={{ marginTop: 12 }}>
        <div className={m.anChartTi}>Кто смотрел профиль</div>
        <div className={m.anBreak}>
          {pulse.breakdown.map((b) => (
            <div key={b.label} className={m.anRow}>
              <span className={m.anRowLab}>{b.label}</span>
              <span className={m.anRowBar}>
                <i style={{ width: `${Math.round(b.ratio * 100)}%` }} />
              </span>
              <span className={m.anRowV}>{b.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ── 16. Раскладка резюме (локально) ─────────────────────────
const SECTION_NAMES: Record<SectionId, string> = {
  about: 'О себе',
  experience: 'Опыт работы',
  education: 'Образование',
  skills: 'Навыки',
  languages: 'Языки',
  contacts: 'Контакты',
}

function LayoutModal({
  onClose,
  showToast,
  layout,
  onLayoutChange,
}: ModalProps & { layout: SectionId[]; onLayoutChange: (l: SectionId[]) => void }) {
  const [order, setOrder] = useState<SectionId[]>(layout)
  const [hidden, setHidden] = useState<Set<SectionId>>(new Set())
  const dragId = useRef<SectionId | null>(null)

  function onDrop(target: SectionId) {
    const from = dragId.current
    dragId.current = null
    if (!from || from === target) return
    const next = order.filter((id) => id !== from)
    const idx = next.indexOf(target)
    next.splice(idx, 0, from)
    setOrder(next)
  }

  return (
    <Modal
      title="Раскладка резюме"
      sub="Меняй порядок и видимость блоков (локально)"
      onClose={onClose}
      footer={
        <>
          <button className={m.btnGhost} onClick={() => { setOrder(layout); setHidden(new Set()) }} type="button">
            Сбросить
          </button>
          <button
            className={m.btnPrimary}
            type="button"
            onClick={() => {
              onLayoutChange(order.filter((id) => !hidden.has(id)))
              showToast('Раскладка обновлена')
              onClose()
            }}
          >
            Сохранить
          </button>
        </>
      }
    >
      <div className={m.layoutEditor}>
        {order.map((id) => (
          <div
            key={id}
            className={m.layoutRow}
            draggable
            onDragStart={() => (dragId.current = id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(id)}
          >
            <span className={m.layoutDrag}>
              <Ic.drag />
            </span>
            <span className={m.layoutNm}>{SECTION_NAMES[id]}</span>
            <button
              type="button"
              className={[m.layoutToggle, hidden.has(id) ? '' : m.layoutToggleOn].join(' ')}
              aria-label="Видимость"
              onClick={() =>
                setHidden((prev) => {
                  const n = new Set(prev)
                  if (n.has(id)) n.delete(id)
                  else n.add(id)
                  return n
                })
              }
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── Вспомогательные ─────────────────────────────────────────
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={m.field}>
      <div className={m.fLabel}>{label}</div>
      {children}
    </div>
  )
}

function ChipsEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  function add(raw: string) {
    const x = raw.trim()
    if (x && !value.includes(x)) onChange([...value, x])
    setDraft('')
  }
  return (
    <div className={m.chipsEditor}>
      {value.map((s) => (
        <span key={s} className={m.chipPill}>
          {s}
          <button className={m.chipX} type="button" onClick={() => onChange(value.filter((y) => y !== s))} aria-label={`Удалить ${s}`}>
            <Ic.close size={13} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? 'Добавить ещё…' : placeholder}
      />
    </div>
  )
}

type ModalProps = { onClose: () => void; showToast: (s: string) => void }

// ── Диспетчер ───────────────────────────────────────────────
export function ProfileModals({
  active,
  onClose,
  showToast,
  layout,
  onLayoutChange,
}: {
  active: ProfileModalState
  onClose: () => void
  showToast: (s: string) => void
  layout: SectionId[]
  onLayoutChange: (l: SectionId[]) => void
}) {
  if (!active) return null
  switch (active.kind) {
    case 'edit-header':
      return <EditHeaderModal onClose={onClose} showToast={showToast} />
    case 'status':
      return <StatusModal onClose={onClose} showToast={showToast} />
    case 'about':
      return <AboutModal onClose={onClose} showToast={showToast} />
    case 'experience':
      return <ExperienceModal onClose={onClose} showToast={showToast} item={active.item} />
    case 'education':
      return <EducationModal onClose={onClose} showToast={showToast} item={active.item} />
    case 'skills':
      return <SkillsModal onClose={onClose} showToast={showToast} />
    case 'languages':
      return <LanguagesModal onClose={onClose} showToast={showToast} />
    case 'contacts':
      return <ContactsModal onClose={onClose} showToast={showToast} />
    case 'banner':
      return <BannerModal onClose={onClose} showToast={showToast} />
    case 'avatar':
      return <AvatarModal onClose={onClose} showToast={showToast} />
    case 'share':
      return <ShareModal onClose={onClose} showToast={showToast} />
    case 'pdf':
      return <PdfModal onClose={onClose} showToast={showToast} />
    case 'analytics':
      return <AnalyticsModal onClose={onClose} showToast={showToast} />
    case 'layout':
      return <LayoutModal onClose={onClose} showToast={showToast} layout={layout} onLayoutChange={onLayoutChange} />
    default:
      return null
  }
}
