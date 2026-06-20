import { supabase } from '../../../shared/lib/supabase'
import type { VacancyFolder } from '../model/types'

/** Таблиц нет (миграция 0022 не применена) — считаем это «папок пока нет». */
function tablesMissing(message?: string) {
  return !!message && /vacancy_folders|vacancy_folder_items|does not exist|schema cache/i.test(message)
}

/** Папки текущей компании + их вакансии (через items). */
export async function fetchFolders(): Promise<VacancyFolder[]> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return []

  const { data: folders, error } = await supabase
    .from('vacancy_folders')
    .select('id, name, color')
    .eq('company_id', uid)
    .order('created_at', { ascending: true })
  if (error) {
    if (tablesMissing(error.message)) return []
    throw new Error(error.message)
  }

  const ids = (folders ?? []).map((f) => f.id as string)
  const itemsByFolder: Record<string, string[]> = {}
  if (ids.length) {
    const { data: items, error: itemsErr } = await supabase
      .from('vacancy_folder_items')
      .select('folder_id, vacancy_id')
      .in('folder_id', ids)
    if (itemsErr && !tablesMissing(itemsErr.message)) throw new Error(itemsErr.message)
    for (const it of items ?? []) {
      ;(itemsByFolder[it.folder_id as string] ??= []).push(it.vacancy_id as string)
    }
  }

  return (folders ?? []).map((f) => ({
    id: f.id as string,
    name: (f.name as string) ?? '',
    color: (f.color as string) ?? '#ff7f50',
    vacIds: itemsByFolder[f.id as string] ?? [],
  }))
}

/** Создать папку с именем/цветом и (опционально) начальным набором вакансий. */
export async function createFolder(input: {
  name: string
  color: string
  vacIds: string[]
}): Promise<VacancyFolder> {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) throw new Error('Нет активной сессии')

  const { data, error } = await supabase
    .from('vacancy_folders')
    .insert({ company_id: uid, name: input.name, color: input.color })
    .select('id, name, color')
    .single()
  if (error) throw new Error(error.message)

  const folderId = (data as { id: string }).id
  if (input.vacIds.length) {
    const rows = input.vacIds.map((vacancy_id) => ({ folder_id: folderId, vacancy_id }))
    const { error: itemsErr } = await supabase.from('vacancy_folder_items').insert(rows)
    if (itemsErr) throw new Error(itemsErr.message)
  }

  return {
    id: folderId,
    name: (data as { name: string }).name,
    color: (data as { color: string }).color,
    vacIds: [...input.vacIds],
  }
}

/** Добавить/убрать вакансию из папки. */
export async function setFolderItem(
  folderId: string,
  vacancyId: string,
  present: boolean,
): Promise<void> {
  if (present) {
    const { error } = await supabase
      .from('vacancy_folder_items')
      .insert({ folder_id: folderId, vacancy_id: vacancyId })
    if (error && error.code !== '23505') throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('vacancy_folder_items')
      .delete()
      .eq('folder_id', folderId)
      .eq('vacancy_id', vacancyId)
    if (error) throw new Error(error.message)
  }
}
