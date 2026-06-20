import { useAppSelector } from '../../../app/store/hooks'

export type CompletionItem = {
  id: string
  text: string
  done: boolean
  /** Какую модалку/действие открыть по клику (для невыполненных). */
  target?: string
}

export type CompanyCompletion = {
  percent: number
  items: CompletionItem[]
}

/** Готовность профиля компании — по факту заполнения реальных секций. */
export function useCompanyCompletion(): CompanyCompletion {
  const c = useAppSelector((s) => s.company.profile)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const vacanciesCount = useAppSelector(
    (s) => s.vacanciesList.items.filter((v) => v.companyId && v.companyId === myId).length,
  )

  const items: CompletionItem[] = [
    { id: 'about', text: 'Описание компании заполнено', done: !!c.about.trim(), target: 'about' },
    { id: 'logo', text: 'Логотип и обложка загружены', done: !!(c.logo || c.avatar) && !!c.banner, target: 'banner' },
    {
      id: 'directions',
      text: c.directions.length ? `Направления добавлены (${c.directions.length})` : 'Добавить направления',
      done: c.directions.length > 0,
      target: 'directions',
    },
    { id: 'values', text: 'Ценности заполнены', done: c.cultureValues.length > 0, target: 'values' },
    {
      id: 'vacancy',
      text: vacanciesCount ? `Опубликованы вакансии (${vacanciesCount})` : 'Опубликовать вакансию',
      done: vacanciesCount > 0,
      target: 'vacancy',
    },
    {
      id: 'gallery',
      text: c.gallery.length ? 'Фото из жизни команды' : 'Добавить фото из жизни команды',
      done: c.gallery.length > 0,
      target: 'gallery',
    },
  ]

  const done = items.filter((i) => i.done).length
  const percent = Math.round((done / items.length) * 100)
  return { percent, items }
}
