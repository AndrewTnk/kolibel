import { supabase } from '../../../shared/lib/supabase'

/** Перевод частых ошибок Supabase Auth на русский (локальная копия для security-операций). */
function translate(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный текущий пароль'
  if (m.includes('password should be at least')) return 'Пароль слишком короткий'
  if (m.includes('same as the existing') || m.includes('should be different'))
    return 'Новый пароль совпадает со старым'
  if (m.includes('is invalid')) return 'Некорректный email'
  if (m.includes('email address') && m.includes('already')) return 'Этот email уже используется'
  if (m.includes('rate limit') || m.includes('for security purposes'))
    return 'Слишком часто — подождите немного и повторите'
  return message
}

/**
 * Смена email. Supabase отправит письмо-подтверждение на НОВЫЙ адрес (а при
 * включённой защите — и на старый). Email в сессии меняется только после
 * перехода по ссылке из письма.
 */
export async function changeEmail(newEmail: string): Promise<void> {
  const email = newEmail.trim()
  if (!email) throw new Error('Введите новый email')
  const { error } = await supabase.auth.updateUser({ email })
  if (error) throw new Error(translate(error.message))
}

/**
 * Смена пароля. Текущий пароль проверяем повторным входом (signInWithPassword
 * для того же аккаунта — обновляет сессию, пользователь остаётся в системе),
 * затем выставляем новый через updateUser.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: sess } = await supabase.auth.getSession()
  const email = sess.session?.user?.email
  if (!email) throw new Error('Нет активной сессии')

  // 1) Проверка текущего пароля
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (signInErr) throw new Error(translate(signInErr.message))

  // 2) Установка нового
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(translate(error.message))
}
