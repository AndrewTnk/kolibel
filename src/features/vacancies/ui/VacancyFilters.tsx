import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import type { EmploymentType, PostedWithin, WorkFormat, WorkSchedule } from '../model/types'
import { employmentLabels, scheduleLabels, workFormatLabels } from '../lib/labels'
import { Select, Combobox, SkillsInput } from './FilterControls'
import s from './Vacancies.module.css'

/** Форма фильтров (без «Поиск» и «Сортировка» — они в шапке выдачи). Живёт внутри FiltersModal. */
export function VacancyFilters() {
  const dispatch = useAppDispatch()
  const f = useAppSelector((st) => st.vacancies.filters)
  const items = useAppSelector((st) => st.vacanciesList.items)

  const allCities = useMemo(() => [...new Set(items.map((v) => v.city).filter(Boolean))].sort(), [items])
  const allCompanies = useMemo(
    () => [...new Set(items.map((v) => v.company).filter(Boolean))].sort(),
    [items],
  )
  const allSkills = useMemo(() => [...new Set(items.flatMap((v) => v.skills))].sort(), [items])

  return (
    <div className={s.fmGrid} aria-label="Фильтры вакансий">
      <label className={s.field}>
        <span className={s.fieldLabel}>Город</span>
        <Combobox
          value={f.city}
          onChange={(city) => dispatch(vacanciesActions.setFilters({ city }))}
          options={allCities}
          placeholder="Любой"
        />
      </label>

      <label className={s.field}>
        <span className={s.fieldLabel}>Компания</span>
        <Combobox
          value={f.company}
          onChange={(company) => dispatch(vacanciesActions.setFilters({ company }))}
          options={allCompanies}
          placeholder="Любая"
        />
      </label>

      <div className={s.field}>
        <span className={s.fieldLabel}>Формат работы</span>
        <Select
          value={f.workFormat}
          onChange={(v) => dispatch(vacanciesActions.setFilters({ workFormat: v as WorkFormat | 'all' }))}
          placeholder="Любой"
          options={[
            { value: 'all', label: 'Любой' },
            ...(Object.keys(workFormatLabels) as WorkFormat[]).map((k) => ({ value: k, label: workFormatLabels[k] })),
          ]}
        />
      </div>

      <div className={s.field}>
        <span className={s.fieldLabel}>График работы</span>
        <Select
          value={f.schedule}
          onChange={(v) => dispatch(vacanciesActions.setFilters({ schedule: v as WorkSchedule | 'all' }))}
          placeholder="Любой"
          options={[
            { value: 'all', label: 'Любой' },
            ...(Object.keys(scheduleLabels) as WorkSchedule[]).map((k) => ({ value: k, label: scheduleLabels[k] })),
          ]}
        />
      </div>

      <div className={s.field}>
        <span className={s.fieldLabel}>Занятость</span>
        <Select
          value={f.employmentType}
          onChange={(v) =>
            dispatch(vacanciesActions.setFilters({ employmentType: v as EmploymentType | 'all' }))
          }
          placeholder="Любая"
          options={[
            { value: 'all', label: 'Любая' },
            ...(Object.keys(employmentLabels) as EmploymentType[]).map((k) => ({ value: k, label: employmentLabels[k] })),
          ]}
        />
      </div>

      <div className={s.field}>
        <span className={s.fieldLabel}>Опубликовано</span>
        <Select
          value={f.postedWithin}
          onChange={(v) => dispatch(vacanciesActions.setFilters({ postedWithin: v as PostedWithin }))}
          options={[
            { value: 'any', label: 'За всё время' },
            { value: '3d', label: 'За 3 дня' },
            { value: '7d', label: 'За неделю' },
            { value: '30d', label: 'За месяц' },
          ]}
        />
      </div>

      <label className={s.field}>
        <span className={s.fieldLabel}>Зарплата от, ₽</span>
        <input
          className={s.control}
          inputMode="numeric"
          value={f.salaryMin}
          onChange={(e) => dispatch(vacanciesActions.setFilters({ salaryMin: e.target.value }))}
          placeholder="200 000"
        />
      </label>

      <label className={s.field}>
        <span className={s.fieldLabel}>Зарплата до, ₽</span>
        <input
          className={s.control}
          inputMode="numeric"
          value={f.salaryMax}
          onChange={(e) => dispatch(vacanciesActions.setFilters({ salaryMax: e.target.value }))}
          placeholder="∞"
        />
      </label>

      <div className={[s.field, s.fmSpan2].join(' ')}>
        <span className={s.fieldLabel}>Навыки</span>
        <SkillsInput
          values={f.skills}
          options={allSkills}
          onAdd={(skill) => dispatch(vacanciesActions.toggleSkill(skill))}
          onRemove={(skill) => dispatch(vacanciesActions.toggleSkill(skill))}
        />
      </div>
    </div>
  )
}
