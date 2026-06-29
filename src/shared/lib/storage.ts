import { supabase } from './supabase'

/**
 * Загрузка файлов в Supabase Storage (bucket `media`, см. миграцию 0009_storage.sql).
 *
 * Все файлы складываются в папку текущего пользователя: <uid>/<category>/<file>.
 * RLS разрешает писать только в свою папку, а читать — всем (публичный bucket),
 * поэтому возвращаем готовый публичный URL, который можно класть в БД как обычную ссылку.
 */
const BUCKET = 'media'

/** Категория-подпапка внутри папки пользователя. */
export type StorageCategory = 'avatar' | 'banner' | 'logo' | 'posts' | 'chat' | 'report' | 'article'

/** Текущий uid из активной сессии или null. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/** Безопасное уникальное имя файла с сохранением расширения. */
function makeFileName(original: string): string {
  const dot = original.lastIndexOf('.')
  const ext = dot > 0 ? original.slice(dot).toLowerCase() : ''
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${rand}${ext}`
}

/**
 * Загружает один файл и возвращает его публичный URL.
 * Кидает ошибку с человекочитаемым текстом при проблемах.
 */
export async function uploadToStorage(category: StorageCategory, file: File): Promise<string> {
  const uid = await currentUserId()
  if (!uid) throw new Error('Нет активной сессии — войдите, чтобы загружать файлы.')

  const path = `${uid}/${category}/${makeFileName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
