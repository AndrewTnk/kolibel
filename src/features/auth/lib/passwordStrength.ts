/**
 * Оценка сложности пароля для формы регистрации.
 *
 * Минимальные требования (без них регистрация невозможна): не короче 6 символов
 * и хотя бы одна заглавная буква. Пароль, прошедший минимум, дополнительно
 * оценивается на «средний»/«надёжный» по наличию цифр, символов и длины.
 *
 * Уровни → цвет поля: invalid → красный (нельзя регистрироваться),
 * medium → серый (можно, но средний), good → зелёный (надёжный).
 */
export type PasswordLevel = 'empty' | 'invalid' | 'medium' | 'good'

export type PasswordStrength = {
  level: PasswordLevel
  /** Короткая подпись под полем (что не так / насколько надёжен). */
  label: string
  /** Можно ли регистрироваться с таким паролем (минимум выполнен). */
  canSubmit: boolean
  /** Прогресс-полоса: сколько из 3 сегментов подсвечено. */
  filled: number
}

export const MIN_PASSWORD_LENGTH = 6

/** Заглавная буква — латиница или кириллица. */
const UPPER_RE = /[A-ZА-ЯЁ]/
const DIGIT_RE = /\d/
const SYMBOL_RE = /[^A-Za-zА-Яа-яЁё0-9]/

export function evaluatePassword(pw: string): PasswordStrength {
  if (!pw) return { level: 'empty', label: '', canSubmit: false, filled: 0 }

  const longEnough = pw.length >= MIN_PASSWORD_LENGTH
  const hasUpper = UPPER_RE.test(pw)

  // Минимум не выполнен — регистрация запрещена (красный).
  if (!longEnough || !hasUpper) {
    const missing: string[] = []
    if (!longEnough) missing.push(`минимум ${MIN_PASSWORD_LENGTH} символов`)
    if (!hasUpper) missing.push('заглавную букву')
    return {
      level: 'invalid',
      label: `Добавь ${missing.join(' и ')}`,
      canSubmit: false,
      filled: 1,
    }
  }

  // Минимум пройден — оцениваем надёжность по «бонусам».
  let bonus = 0
  if (DIGIT_RE.test(pw)) bonus++
  if (SYMBOL_RE.test(pw)) bonus++
  if (pw.length >= 10) bonus++

  if (bonus >= 2) {
    return { level: 'good', label: 'Надёжный пароль', canSubmit: true, filled: 3 }
  }
  return { level: 'medium', label: 'Средний пароль — можно усилить цифрой или символом', canSubmit: true, filled: 2 }
}
