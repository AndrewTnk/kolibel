import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../../app/store/hooks'
import { createVacancy, updateVacancy } from '../model/vacancyThunks'
import type { EmploymentType, Vacancy, WorkFormat, WorkSchedule } from '../model/types'
import { employmentLabels, scheduleLabels, workFormatLabels } from '../lib/labels'
import { SkillsEditor } from '../../profile/ui/SkillsEditor'
import { RichEditor } from '../../../shared/ui/RichEditor/RichEditor'
import styles from './CreateVacancyModal.module.css'

const workFormatOptions = Object.keys(workFormatLabels) as WorkFormat[]
const employmentOptions = Object.keys(employmentLabels) as EmploymentType[]
const scheduleOptions = Object.keys(scheduleLabels) as WorkSchedule[]

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}


/**
 * Создание / редактирование вакансии (бывш. CreateVacancyModal).
 * `vacancy` задан → режим редактирования. Создание поддерживает черновик/публикацию.
 */
export function CreateVacancyModal({
  vacancy,
  onClose,
}: {
  vacancy?: Vacancy
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const editing = !!vacancy
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(vacancy?.title ?? '')
  const [city, setCity] = useState(vacancy?.city ?? '')
  const [workFormats, setWorkFormats] = useState<WorkFormat[]>(vacancy?.workFormats ?? ['hybrid'])
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>(vacancy?.employmentTypes ?? ['full'])
  const [schedule, setSchedule] = useState<WorkSchedule | undefined>(vacancy?.schedule)
  const [expFrom, setExpFrom] = useState(vacancy?.experienceFrom != null ? String(vacancy.experienceFrom) : '')
  const [expTo, setExpTo] = useState(vacancy?.experienceTo != null ? String(vacancy.experienceTo) : '')
  const [salaryFrom, setSalaryFrom] = useState(vacancy?.salaryFrom != null ? String(vacancy.salaryFrom) : '')
  const [salaryTo, setSalaryTo] = useState(vacancy?.salaryTo != null ? String(vacancy.salaryTo) : '')
  const [skills, setSkills] = useState<string[]>(vacancy?.skills ?? [])
  const [description, setDescription] = useState(vacancy?.description ?? '')
  const [responsibilities, setResponsibilities] = useState((vacancy?.conditions ?? []).join('\n'))
  const [requirements, setRequirements] = useState((vacancy?.requirements ?? []).join('\n'))

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function num(v: string) {
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  function numYears(v: string) {
    if (v.trim() === '') return undefined
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
  }
  function lines(v: string) {
    return v
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }

  async function save(status: 'active' | 'draft', e?: FormEvent) {
    e?.preventDefault()
    const t = title.trim()
    if (!t || saving) return
    setSaving(true)
    const input = {
      title: t,
      city,
      workFormats,
      employmentTypes,
      schedule,
      experienceFrom: numYears(expFrom),
      experienceTo: numYears(expTo),
      salaryFrom: num(salaryFrom),
      salaryTo: num(salaryTo),
      skills,
      description,
      responsibilities: lines(responsibilities),
      requirements: lines(requirements),
      status,
    }
    const res = editing
      ? await dispatch(updateVacancy({ id: vacancy!.id, input }))
      : await dispatch(createVacancy(input))
    setSaving(false)
    if (updateVacancy.fulfilled.match(res) || createVacancy.fulfilled.match(res)) onClose()
  }

  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => save('active', e)}
        aria-label={editing ? 'Редактирование вакансии' : 'Новая вакансия'}
      >
        <div className={styles.head}>
          <div>
            <div className={styles.title}>{editing ? 'Редактировать вакансию' : 'Новая вакансия'}</div>
            {editing ? <div className={styles.sub}>{vacancy!.title}</div> : null}
          </div>
          <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <label className={[styles.field, styles.span2].join(' ')}>
              <span className={styles.label}>Название должности</span>
              <input
                className={styles.control}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Product Designer"
                autoFocus
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Город</span>
              <input
                className={styles.control}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Москва / Удалённо"
              />
            </label>

            <div className={styles.field}>
              <span className={styles.label}>Зарплата</span>
              <div className={styles.row}>
                <input className={styles.control} inputMode="numeric" value={salaryFrom} onChange={(e) => setSalaryFrom(e.target.value)} placeholder="от" aria-label="Зарплата от" />
                <input className={styles.control} inputMode="numeric" value={salaryTo} onChange={(e) => setSalaryTo(e.target.value)} placeholder="до" aria-label="Зарплата до" />
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Формат работы</span>
              <div className={styles.chips}>
                {workFormatOptions.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={[styles.chip, workFormats.includes(k) ? styles.chipOn : ''].join(' ')}
                    onClick={() => setWorkFormats(toggle(workFormats, k))}
                  >
                    {workFormatLabels[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Занятость</span>
              <div className={styles.chips}>
                {employmentOptions.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={[styles.chip, employmentTypes.includes(k) ? styles.chipOn : ''].join(' ')}
                    onClick={() => setEmploymentTypes(toggle(employmentTypes, k))}
                  >
                    {employmentLabels[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>График работы</span>
              <div className={styles.chips}>
                {scheduleOptions.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={[styles.chip, schedule === k ? styles.chipOn : ''].join(' ')}
                    onClick={() => setSchedule((cur) => (cur === k ? undefined : k))}
                  >
                    {scheduleLabels[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Требуемый опыт, лет</span>
              <div className={styles.row}>
                <input className={styles.control} inputMode="numeric" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} placeholder="от" aria-label="Опыт от" />
                <input className={styles.control} inputMode="numeric" value={expTo} onChange={(e) => setExpTo(e.target.value)} placeholder="до" aria-label="Опыт до" />
              </div>
            </div>

            <div className={[styles.field, styles.span2].join(' ')}>
              <span className={styles.label}>Навыки</span>
              <SkillsEditor value={skills} onChange={setSkills} hideLabel placeholder="Начните вводить навык…" />
            </div>

            <div className={[styles.field, styles.span2].join(' ')}>
              <span className={styles.label}>Описание</span>
              <RichEditor
                value={description}
                onChange={setDescription}
                placeholder="Чем будет заниматься кандидат, про команду и продукт…"
              />
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Обязанности (по строке)</span>
              <textarea className={styles.area} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} placeholder={'Дизайн ключевых сценариев\nПроверка гипотез'} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Требования (по строке)</span>
              <textarea className={styles.area} value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder={'3+ года опыта\nСильное портфолио'} />
            </label>

          </div>
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Отмена
          </button>
          {!editing ? (
            <button type="button" className={styles.draft} disabled={!title.trim() || saving} onClick={() => save('draft')}>
              Черновик
            </button>
          ) : null}
          <button type="submit" className={styles.publish} disabled={!title.trim() || saving}>
            {saving ? 'Сохранение…' : editing ? 'Сохранить изменения' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
