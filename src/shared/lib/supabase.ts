import { createClient } from '@supabase/supabase-js'

/**
 * Единый клиент Supabase для всего приложения.
 * Значения берутся из .env.local (см. .env.example).
 * Anon-ключ безопасно держать на фронте — доступ ограничивают RLS-политики в БД.
 */
const directUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * В России домен `*.supabase.co` стоит за Cloudflare, который ТСПУ троттлит на
 * границе → прямые запросы из браузера рвутся (ERR_CONNECTION_RESET) и сайт не
 * грузит данные без VPN.
 *
 * Решение: в проде гоним все запросы через same-origin прокси `/sb` (rewrite в
 * `vercel.json` → Supabase). Этот путь идёт через доступный из РФ Vercel, а хоп
 * Vercel→Supabase уже вне российской границы и не троттлится.
 *
 * В dev то же самое обеспечивает прокси `/sb` в `vite.config.ts`. Поэтому и в проде,
 * и в dev клиент ходит одинаково через `${origin}/sb` — новые загрузки в Storage
 * сразу получают проксируемый адрес, а dev и прод ведут себя одинаково.
 * (`directUrl` нужен только как фолбэк вне браузера, напр. в нодовом окружении.)
 */
const url =
  typeof window !== 'undefined' ? `${window.location.origin}/sb` : directUrl

// В браузере URL берётся из origin, поэтому VITE_SUPABASE_URL для работы НЕ обязателен
// (его отсутствие больше не валит сайт в белый экран). Обязателен только anon-ключ —
// он подставляется в каждый запрос. `url` отсутствует лишь вне браузера без directUrl.
if (!anonKey) {
  throw new Error(
    'Не задан VITE_SUPABASE_ANON_KEY. Впиши значение из дашборда Supabase (Project Settings → API) в .env.local и в переменные окружения Vercel.',
  )
}
if (!url) {
  throw new Error('Нет URL Supabase: задай VITE_SUPABASE_URL (нужен вне браузера).')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
