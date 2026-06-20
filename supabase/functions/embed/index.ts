// ============================================================
// Edge Function: embed  (ЗАГОТОВКА v2 — семантический матчинг)
// Считает эмбеддинг текста вакансии/профиля и сохраняет его в колонку
// `embedding` (см. миграцию 0026). Вызывается после создания/изменения
// вакансии или профиля (с фронта или из БД-вебхука).
//
// Настройка (см. README рядом):
//   supabase secrets set EMBEDDINGS_API_KEY=...        # ключ провайдера
//   supabase secrets set EMBEDDINGS_PROVIDER=voyage    # voyage | openai
//   supabase functions deploy embed
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY доступны в окружении функции
// автоматически — нужны для записи вектора в обход RLS.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

type EmbedRequest = { kind: 'vacancy' | 'profile'; id: string }

const PROVIDER = Deno.env.get('EMBEDDINGS_PROVIDER') ?? 'voyage'
const API_KEY = Deno.env.get('EMBEDDINGS_API_KEY') ?? ''

/** Зовёт провайдера эмбеддингов и возвращает вектор. */
async function embed(text: string): Promise<number[]> {
  if (!API_KEY) throw new Error('EMBEDDINGS_API_KEY не задан (supabase secrets set …)')

  if (PROVIDER === 'openai') {
    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      // text-embedding-3-small = 1536 → поменяй размерность в миграции под модель.
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    })
    const j = await r.json()
    return j.data[0].embedding
  }

  // Voyage AI (многоязычная, рекомендуется Anthropic). voyage-multilingual-2 = 1024.
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'voyage-multilingual-2', input: text }),
  })
  const j = await r.json()
  return j.data[0].embedding
}

/** Собирает текст для эмбеддинга из строки вакансии/профиля. */
function buildText(kind: EmbedRequest['kind'], row: Record<string, unknown>): string {
  if (kind === 'vacancy') {
    return [
      row.title,
      (row.skills as string[] | null)?.join(', '),
      (row.requirements as string[] | null)?.join('. '),
      (row.conditions as string[] | null)?.join('. '),
      row.description,
    ]
      .filter(Boolean)
      .join('\n')
  }
  // profile (резюме)
  const exp = (row.experience as { role?: string; company?: string; summary?: string }[] | null) ?? []
  return [
    row.job_title,
    row.headline,
    (row.skills as string[] | null)?.join(', '),
    row.about,
    exp.map((e) => [e.role, e.company, e.summary].filter(Boolean).join(' ')).join('. '),
  ]
    .filter(Boolean)
    .join('\n')
}

Deno.serve(async (req) => {
  try {
    const { kind, id } = (await req.json()) as EmbedRequest
    if (!kind || !id) return new Response('kind и id обязательны', { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const table = kind === 'vacancy' ? 'vacancies' : 'profiles'
    const { data: row, error } = await supabase.from(table).select('*').eq('id', id).single()
    if (error || !row) return new Response('строка не найдена', { status: 404 })

    const vector = await embed(buildText(kind, row))
    const { error: upErr } = await supabase.from(table).update({ embedding: vector }).eq('id', id)
    if (upErr) return new Response(upErr.message, { status: 500 })

    return new Response(JSON.stringify({ ok: true, dims: vector.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
