/**
 * Локальный реестр аккаунтов, которые входили на этом устройстве (как в Steam/YouTube).
 * Храним refresh/access токены, чтобы быстро переключаться без повторного ввода пароля.
 * Активную сессию ведёт сам supabase-js; здесь — отдельный список для переключения.
 */
export type SavedAccountKind = 'user' | 'company'

export type SavedAccount = {
  id: string
  email: string
  name: string
  accountType: SavedAccountKind
  avatar?: string
  refreshToken: string
  accessToken: string
  savedAt: number
}

const KEY = 'kolibel:accounts'

function read(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedAccount[]) : []
  } catch {
    return []
  }
}

function write(list: SavedAccount[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function getSavedAccounts(): SavedAccount[] {
  return read().sort((a, b) => b.savedAt - a.savedAt)
}

/** Добавить/обновить аккаунт (по id). Аватар сохраняется, если новый не передан. */
export function upsertAccount(acc: Omit<SavedAccount, 'savedAt'>) {
  const list = read()
  const i = list.findIndex((a) => a.id === acc.id)
  const prev = i >= 0 ? list[i] : undefined
  const merged: SavedAccount = {
    ...acc,
    avatar: acc.avatar ?? prev?.avatar,
    savedAt: Date.now(),
  }
  if (i >= 0) list[i] = merged
  else list.push(merged)
  write(list)
}

/**
 * Обновить имя/аватар сохранённого аккаунта (когда подгрузился профиль).
 * Имя для компании живёт в `companies.name`, а не в `user_metadata`, поэтому
 * актуальные имя+фото берём из загруженного профиля — иначе в меню переключения
 * не-текущий аккаунт-компания показывался как «email» + заглушка.
 */
export function setAccountIdentity(
  id: string,
  patch: { name?: string; avatar?: string },
) {
  const list = read()
  const i = list.findIndex((a) => a.id === id)
  if (i < 0) return
  const cur = list[i]
  const next = { ...cur }
  let changed = false
  const name = patch.name?.trim()
  if (name && name !== cur.name) {
    next.name = name
    changed = true
  }
  if (patch.avatar && patch.avatar !== cur.avatar) {
    next.avatar = patch.avatar
    changed = true
  }
  if (changed) {
    list[i] = next
    write(list)
  }
}

/** Забыть аккаунт (убрать из списка переключения). */
export function removeSavedAccount(id: string) {
  write(read().filter((a) => a.id !== id))
}
