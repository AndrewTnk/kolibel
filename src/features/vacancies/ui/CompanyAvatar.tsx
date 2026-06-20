import s from './Vacancies.module.css'

type Props = {
  /** Инициал или короткий текст внутри */
  initial: string
  /** URL логотипа (если есть — показываем картинку) */
  logo?: string
  /** Доп. класс с размером (например, s.vacAva) */
  className?: string
}

/** Градиентный квадрат-аватар компании с лого или инициалом. */
export function CompanyAvatar({ initial, logo, className }: Props) {
  return (
    <div className={[s.coAva, className].filter(Boolean).join(' ')} aria-hidden>
      {logo ? <img src={logo} alt="" /> : initial}
    </div>
  )
}
