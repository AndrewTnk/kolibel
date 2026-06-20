import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { completeOnboarding, saveProfile } from '../../features/profile/model/profileThunks'
import { saveCompany } from '../../features/company/model/companyThunks'
import type { Resume } from '../../features/profile/model/types'
import type { CompanyProfile } from '../../features/company/model/companyData'
import { SkillsEditor } from '../../features/profile/ui/SkillsEditor'
import { ExperienceEditor } from '../../features/profile/ui/ExperienceEditor'
import { ContactsEditor } from '../../features/company/ui/ContactsEditor'
import f from '../../features/profile/ui/ProfileFields.module.css'
import styles from './OnboardingPage.module.css'

/* ─── Онбординг пользователя ─────────────────────────────── */
function UserOnboarding() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const resume = useAppSelector((s) => s.profile.resume)
  const saving = useAppSelector((s) => s.profile.status === 'saving')

  const [form, setForm] = useState<Resume>(resume)
  useEffect(() => setForm(resume), [resume])

  function set<K extends keyof Resume>(key: K, value: Resume[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const canFinish = !!form.fullName.trim() && !saving

  async function finish() {
    const res = await dispatch(saveProfile(form))
    if (!saveProfile.fulfilled.match(res)) return
    await dispatch(completeOnboarding())
    navigate('/profile', { replace: true })
  }

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Общая информация</h2>
        <div className={f.field}>
          <span className={f.label}>Имя и фамилия *</span>
          <input
            className={f.input}
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            placeholder="Иван Иванов"
          />
        </div>
        <div className={f.field}>
          <span className={f.label}>Должность</span>
          <input
            className={f.input}
            value={form.jobTitle}
            onChange={(e) => set('jobTitle', e.target.value)}
            placeholder="Например, Frontend-разработчик"
          />
        </div>
        <div className={f.row}>
          <div className={f.field}>
            <span className={f.label}>Город</span>
            <input className={f.input} value={form.location} onChange={(e) => set('location', e.target.value)} />
          </div>
          <div className={f.field}>
            <span className={f.label}>Страна</span>
            <input className={f.input} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
          </div>
        </div>
        <div className={f.field}>
          <span className={f.label}>О себе</span>
          <textarea
            className={f.textarea}
            value={form.about}
            onChange={(e) => set('about', e.target.value)}
            placeholder="Коротко расскажите о себе"
          />
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Опыт работы</h2>
        <ExperienceEditor value={form.experience} onChange={(experience) => set('experience', experience)} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Навыки</h2>
        <SkillsEditor value={form.skills} onChange={(skills) => set('skills', skills)} />
      </section>

      <FinishBar canFinish={canFinish} saving={saving} onFinish={finish} />
    </>
  )
}

/* ─── Онбординг компании ─────────────────────────────────── */
function CompanyOnboarding() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const profile = useAppSelector((s) => s.company.profile)
  const saving = useAppSelector((s) => s.company.status === 'saving')

  const [form, setForm] = useState<CompanyProfile>(profile)
  useEffect(() => setForm(profile), [profile])

  function set<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const canFinish = !!form.name.trim() && !saving

  async function finish() {
    const res = await dispatch(saveCompany(form))
    if (!saveCompany.fulfilled.match(res)) return
    await dispatch(completeOnboarding())
    navigate('/profile', { replace: true })
  }

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Общая информация</h2>
        <div className={f.field}>
          <span className={f.label}>Название компании *</span>
          <input
            className={f.input}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Например, Kolibel"
          />
        </div>
        <div className={f.field}>
          <span className={f.label}>Отрасль</span>
          <input
            className={f.input}
            value={form.industry}
            onChange={(e) => set('industry', e.target.value)}
            placeholder="Например, Разработка ПО"
          />
        </div>
        <div className={f.row}>
          <div className={f.field}>
            <span className={f.label}>Город</span>
            <input className={f.input} value={form.location} onChange={(e) => set('location', e.target.value)} />
          </div>
          <div className={f.field}>
            <span className={f.label}>Страна</span>
            <input className={f.input} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
          </div>
        </div>
        <div className={f.field}>
          <span className={f.label}>О компании</span>
          <textarea
            className={f.textarea}
            value={form.about}
            onChange={(e) => set('about', e.target.value)}
            placeholder="Коротко расскажите о компании"
          />
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Специализация</h2>
        <SkillsEditor value={form.specialties} onChange={(specialties) => set('specialties', specialties)} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Контакты</h2>
        <ContactsEditor value={form.contacts} onChange={(contacts) => set('contacts', contacts)} />
      </section>

      <FinishBar canFinish={canFinish} saving={saving} onFinish={finish} />
    </>
  )
}

function FinishBar({
  canFinish,
  saving,
  onFinish,
}: {
  canFinish: boolean
  saving: boolean
  onFinish: () => void
}) {
  return (
    <div className={styles.finishBar}>
      <span className={styles.finishHint}>* — обязательное поле. Остальное можно заполнить позже.</span>
      <button type="button" className={styles.finishBtn} disabled={!canFinish} onClick={onFinish}>
        {saving ? 'Сохранение…' : 'Завершить'}
      </button>
    </div>
  )
}

export function OnboardingPage() {
  const isCompany = useAppSelector((s) => s.account.type === 'company')

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <img src="/logo/kolibel-full.png" alt="Kolibel" className={styles.logo} />
      </header>
      <main className={styles.main}>
        <div className={styles.inner}>
          <h1 className={styles.title}>{isCompany ? 'Расскажите о компании' : 'Заполните профиль'}</h1>
          <p className={styles.sub}>
            Это займёт пару минут. Обязательно только {isCompany ? 'название' : 'имя'} — остальное можно добавить позже.
          </p>
          {isCompany ? <CompanyOnboarding /> : <UserOnboarding />}
        </div>
      </main>
    </div>
  )
}
