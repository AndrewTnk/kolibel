import { createClient } from '@supabase/supabase-js'

/**
 * Единый клиент Supabase для всего приложения.
 * Значения берутся из .env.local (см. .env.example).
 * Anon-ключ безопасно держать на фронте — доступ ограничивают RLS-политики в БД.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL и/или VITE_SUPABASE_ANON_KEY. Скопируй .env.example в .env.local и впиши значения из дашборда Supabase (Project Settings → API).',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
