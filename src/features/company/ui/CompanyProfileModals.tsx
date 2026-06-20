import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { RecModal } from '../../../shared/ui/Recommendations/RecModal'
import { ImageUploadField } from '../../../shared/ui/ImageUploadField/ImageUploadField'
import { saveCompany } from '../model/companyThunks'
import type {
  CompanyContact,
  CompanyDirection,
  CompanyProfile,
  CompanyValue,
} from '../model/companyData'
import styles from './CompanyProfileModals.module.css'

/** Хук: текущая компания + сохранение патча. */
function useSaveCompany() {
  const dispatch = useAppDispatch()
  const company = useAppSelector((s) => s.company.profile)
  const [saving, setSaving] = useState(false)
  async function save(patch: Partial<CompanyProfile>, onClose: () => void) {
    setSaving(true)
    const res = await dispatch(saveCompany({ ...company, ...patch }))
    setSaving(false)
    if (saveCompany.fulfilled.match(res)) onClose()
  }
  return { company, saving, save }
}

function Foot({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className={styles.foot}>
      <button type="button" className={styles.cancel} onClick={onClose}>
        Отмена
      </button>
      <button type="button" className={styles.save} disabled={saving || disabled} onClick={onSave}>
        {saving ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  )
}

const uid = () => 'x' + Math.random().toString(36).slice(2, 9)

// ── Шапка профиля ──────────────────────────────
export function EditHeaderModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [name, setName] = useState(company.name)
  const [industry, setIndustry] = useState(company.industry)
  const [website, setWebsite] = useState(company.website)
  const [size, setSize] = useState(company.size)
  const [location, setLocation] = useState(company.location)

  return (
    <RecModal title="Профиль компании" onClose={onClose} maxWidth={620}>
      <div className={styles.sub}>Основная информация в шапке</div>
      <label className={styles.field}>
        <span className={styles.label}>Название</span>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>Индустрия</span>
          <input className={styles.input} value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Сайт</span>
          <input className={styles.input} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Размер команды</span>
          <input className={styles.input} value={size} onChange={(e) => setSize(e.target.value)} placeholder="240 человек" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Города / офисы</span>
          <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Москва · Тбилиси" />
        </label>
      </div>
      <Foot
        onClose={onClose}
        saving={saving}
        disabled={!name.trim()}
        onSave={() => save({ name: name.trim(), industry, website, size, location }, onClose)}
      />
    </RecModal>
  )
}

// ── О компании ─────────────────────────────────
export function AboutModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [about, setAbout] = useState(company.about)
  return (
    <RecModal title="О компании" onClose={onClose} maxWidth={620}>
      <label className={styles.field}>
        <span className={styles.label}>Расскажите о компании</span>
        <textarea className={styles.area} style={{ minHeight: 200 }} value={about} onChange={(e) => setAbout(e.target.value)} />
        <span className={styles.hint}>Чем занимаетесь, для кого, что отличает. Абзацы разделяйте пустой строкой.</span>
      </label>
      <Foot onClose={onClose} saving={saving} onSave={() => save({ about }, onClose)} />
    </RecModal>
  )
}

// ── Чем занимаемся ─────────────────────────────
export function DirectionsModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [items, setItems] = useState<CompanyDirection[]>(company.directions.map((d) => ({ ...d })))
  const upd = (i: number, k: 'title' | 'desc', v: string) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const del = (i: number) => setItems((arr) => arr.filter((_, j) => j !== i))
  const add = () => setItems((arr) => [...arr, { id: uid(), icon: 'bolt', title: '', desc: '' }])
  return (
    <RecModal title="Чем занимаемся" onClose={onClose} maxWidth={620}>
      <div className={styles.sub}>Направления, продукты или услуги</div>
      <div className={styles.itemEditor}>
        {items.map((d, i) => (
          <div key={d.id} className={styles.itemRow}>
            <button type="button" className={styles.del} onClick={() => del(i)} aria-label="Удалить">✕</button>
            <label className={styles.field}>
              <span className={styles.label}>Название</span>
              <input className={styles.input} value={d.title} onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Эквайринг" />
            </label>
            <label className={styles.field} style={{ marginTop: 8 }}>
              <span className={styles.label}>Описание</span>
              <textarea className={styles.area} value={d.desc} onChange={(e) => upd(i, 'desc', e.target.value)} rows={2} />
            </label>
          </div>
        ))}
        <button type="button" className={styles.addItem} onClick={add}>+ Добавить направление</button>
      </div>
      <Foot onClose={onClose} saving={saving} onSave={() => save({ directions: items.filter((d) => d.title.trim()) }, onClose)} />
    </RecModal>
  )
}

// ── Ценности и культура ────────────────────────
export function ValuesModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [items, setItems] = useState<CompanyValue[]>(company.cultureValues.map((v) => ({ ...v })))
  const upd = (i: number, k: 'title' | 'desc', v: string) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const del = (i: number) => setItems((arr) => arr.filter((_, j) => j !== i))
  const add = () => setItems((arr) => [...arr, { id: uid(), title: '', desc: '' }])
  return (
    <RecModal title="Ценности и культура" onClose={onClose} maxWidth={620}>
      <div className={styles.sub}>Во что верит команда</div>
      <div className={styles.itemEditor}>
        {items.map((v, i) => (
          <div key={v.id} className={styles.itemRow}>
            <button type="button" className={styles.del} onClick={() => del(i)} aria-label="Удалить">✕</button>
            <label className={styles.field}>
              <span className={styles.label}>Принцип</span>
              <input className={styles.input} value={v.title} onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Доверие по умолчанию" />
            </label>
            <label className={styles.field} style={{ marginTop: 8 }}>
              <span className={styles.label}>Описание</span>
              <textarea className={styles.area} value={v.desc} onChange={(e) => upd(i, 'desc', e.target.value)} rows={2} />
            </label>
          </div>
        ))}
        <button type="button" className={styles.addItem} onClick={add}>+ Добавить ценность</button>
      </div>
      <Foot onClose={onClose} saving={saving} onSave={() => save({ cultureValues: items.filter((v) => v.title.trim()) }, onClose)} />
    </RecModal>
  )
}

// ── Жизнь в компании (галерея) ─────────────────
export function GalleryModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [photos, setPhotos] = useState(company.gallery.map((g) => ({ ...g })))
  return (
    <RecModal title="Жизнь в компании" onClose={onClose} maxWidth={620}>
      <div className={styles.sub}>Фото офиса, команды, событий</div>
      <div className={styles.galleryGrid}>
        {photos.map((g) => (
          <div key={g.id} className={styles.galCell}>
            <img src={g.url} alt="" />
            <button type="button" className={styles.galDel} onClick={() => setPhotos((p) => p.filter((x) => x.id !== g.id))} aria-label="Удалить фото">✕</button>
          </div>
        ))}
        <ImageUploadField
          shape="square"
          category="posts"
          value={undefined}
          onChange={(url) => {
            if (url) setPhotos((p) => [...p, { id: uid(), url }])
          }}
          className={styles.galUpload}
        />
      </div>
      <Foot onClose={onClose} saving={saving} onSave={() => save({ gallery: photos }, onClose)} />
    </RecModal>
  )
}

// ── Обложка ────────────────────────────────────
export function BannerModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [banner, setBanner] = useState<string | undefined>(company.banner || undefined)
  return (
    <RecModal title="Обложка компании" onClose={onClose} maxWidth={560}>
      <div className={styles.sub}>Загрузи фон страницы. Рекомендуем 1600×400.</div>
      <ImageUploadField shape="wide" category="banner" value={banner} onChange={setBanner} />
      <Foot onClose={onClose} saving={saving} onSave={() => save({ banner: banner ?? '' }, onClose)} />
    </RecModal>
  )
}

// ── Логотип ────────────────────────────────────
export function LogoModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const [logo, setLogo] = useState<string | undefined>(company.logo)
  return (
    <RecModal title="Логотип компании" onClose={onClose} maxWidth={460}>
      <div className={styles.sub}>Квадратный бейдж — показывается у всех сотрудников и в постах.</div>
      <ImageUploadField shape="square" category="logo" value={logo} onChange={setLogo} />
      <Foot onClose={onClose} saving={saving} onSave={() => save({ logo }, onClose)} />
    </RecModal>
  )
}

// ── Контакты ───────────────────────────────────
export function ContactsModal({ onClose }: { onClose: () => void }) {
  const { company, saving, save } = useSaveCompany()
  const base: CompanyContact[] =
    company.contacts.length > 0
      ? company.contacts.map((c) => ({ ...c }))
      : [
          { id: uid(), kind: 'founder', name: '', position: '' },
          { id: uid(), kind: 'hr', name: '', position: '' },
        ]
  const [items, setItems] = useState<CompanyContact[]>(base)
  const upd = (i: number, k: 'name' | 'position', v: string) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  return (
    <RecModal title="Контакты компании" onClose={onClose} maxWidth={560}>
      <div className={styles.sub}>Кому писать по разным вопросам</div>
      <div className={styles.itemEditor}>
        {items.map((c, i) => (
          <div key={c.id} className={styles.itemRow}>
            <div className={styles.label} style={{ marginBottom: 8 }}>
              {c.kind === 'founder' ? 'Основатель' : 'Команда найма / HR'}
            </div>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Имя</span>
                <input className={styles.input} value={c.name} onChange={(e) => upd(i, 'name', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Должность</span>
                <input className={styles.input} value={c.position ?? ''} onChange={(e) => upd(i, 'position', e.target.value)} />
              </label>
            </div>
          </div>
        ))}
      </div>
      <Foot onClose={onClose} saving={saving} onSave={() => save({ contacts: items.filter((c) => c.name.trim()) }, onClose)} />
    </RecModal>
  )
}

// ── Поделиться ─────────────────────────────────
export function ShareModal({ shareUrl, onClose }: { shareUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {})
    setCopied(true)
  }
  const tiles = [
    { lab: 'Telegram', bg: '#229ED9' },
    { lab: 'ВКонтакте', bg: '#0077FF' },
    { lab: 'Ссылка', bg: 'var(--primary)' },
    { lab: 'QR-код', bg: '#1f2937' },
  ]
  return (
    <RecModal title="Поделиться компанией" onClose={onClose} maxWidth={480}>
      <div className={styles.sub}>Расскажите о странице кандидатам и партнёрам</div>
      <div className={styles.linkRow}>
        <span className={styles.url}>{shareUrl}</span>
        <button type="button" className={[styles.copy, copied ? styles.copyDone : ''].filter(Boolean).join(' ')} onClick={copy}>
          {copied ? '✓ Готово' : 'Копировать'}
        </button>
      </div>
      <div className={styles.shareGrid}>
        {tiles.map((t) => (
          <button key={t.lab} type="button" className={styles.shareTile} onClick={copy}>
            <span className={styles.shareIco} style={{ background: t.bg }} aria-hidden />
            <span>{t.lab}</span>
          </button>
        ))}
      </div>
    </RecModal>
  )
}
