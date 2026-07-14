import { createClient } from '@supabase/supabase-js'

/**
 * Единый клиент Supabase для всего приложения.
 * Значения берутся из .env.local (см. .env.example).
 * Anon-ключ безопасно держать на фронте — доступ ограничивают RLS-политики в БД.
 */
const directUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Прямое подключение (флаг `VITE_SUPABASE_NO_PROXY=true`): клиент ходит напрямую на
 * `VITE_SUPABASE_URL`, минуя прокси `/sb`. Для self-hosted Supabase (своя локалка/VPS
 * на своём домене) — там нет Cloudflare-границы, троттлинга нет, костыль `/sb` не нужен.
 *
 * Иначе (текущий Vercel-прод): в России домен `*.supabase.co` стоит за Cloudflare,
 * который ТСПУ троттлит на границе → прямые запросы из браузера рвутся
 * (ERR_CONNECTION_RESET). Поэтому гоним все запросы через same-origin прокси `/sb`
 * (rewrite в `vercel.json` → Supabase; в dev — прокси `/sb` в `vite.config.ts`). Хоп
 * Vercel→Supabase уже вне российской границы и не троттлится.
 * (`directUrl` нужен как фолбэк вне браузера, напр. в нодовом окружении.)
 */
const noProxy = import.meta.env.VITE_SUPABASE_NO_PROXY === 'true'
const url = noProxy
  ? directUrl
  : typeof window !== 'undefined'
    ? `${window.location.origin}/sb`
    : directUrl

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
