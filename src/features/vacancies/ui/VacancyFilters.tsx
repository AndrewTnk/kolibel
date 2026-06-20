import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { vacanciesActions } from '../model/vacanciesSlice'
import type { EmploymentType, PostedWithin, WorkFormat } from '../model/types'
import { employmentLabels, workFormatLabels } from '../lib/labels'
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
        <input
          className={s.control}
          list="vacancy-cities"
          value={f.city}
          onChange={(e) => dispatch(vacanciesActions.setFilters({ city: e.target.value }))}
          placeholder="Любой"
        />
        <datalist id="vacancy-cities">
          {allCities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className={s.field}>
        <span className={s.fieldLabel}>Компания</span>
        <input
          className={s.control}
          list="vacancy-companies"
          value={f.company}
          onChange={(e) => dispatch(vacanciesActions.setFilters({ company: e.target.value }))}
          placeholder="Любая"
        />
        <datalist id="vacancy-companies">
          {allCompanies.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className={s.field}>
        <span className={s.fieldLabel}>Формат работы</span>
        <select
          className={s.control}
          value={f.workFormat}
          onChange={(e) =>
            dispatch(vacanciesActions.setFilters({ workFormat: e.target.value as WorkFormat | 'all' }))
          }
        >
          <option value="all">Любой</option>
          {(Object.keys(workFormatLabels) as WorkFormat[]).map((k) => (
            <option key={k} value={k}>
              {workFormatLabels[k]}
            </option>
          ))}
        </select>
      </label>

      <label className={s.field}>
        <span className={s.fieldLabel}>Занятость</span>
        <select
          className={s.control}
          value={f.employmentType}
          onChange={(e) =>
            dispatch(
              vacanciesActions.setFilters({ employmentType: e.target.value as EmploymentType | 'all' }),
            )
          }
        >
          <option value="all">Любая</option>
          {(Object.keys(employmentLabels) as EmploymentType[]).map((k) => (
            <option key={k} value={k}>
              {employmentLabels[k]}
            </option>
          ))}
        </select>
      </label>

      <label className={s.field}>
        <span className={s.fieldLabel}>Опубликовано</span>
        <select
          className={s.control}
          value={f.postedWithin}
          onChange={(e) =>
            dispatch(vacanciesActions.setFilters({ postedWithin: e.target.value as PostedWithin }))
          }
        >
          <option value="any">За всё время</option>
          <option value="3d">За 3 дня</option>
          <option value="7d">За неделю</option>
          <option value="30d">За месяц</option>
        </select>
      </label>

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
        <div className={s.skillChips}>
          {allSkills.map((skill) => {
            const active = f.skills.includes(skill)
            return (
              <button
                key={skill}
                type="button"
                className={[s.skillChip, active ? s.skillChipActive : ''].filter(Boolean).join(' ')}
                onClick={() => dispatch(vacanciesActions.toggleSkill(skill))}
              >
                {skill}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
