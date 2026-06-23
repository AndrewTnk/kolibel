import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { blocksActions } from './blocksSlice'
import type { BlockedEntry } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

type BlockRow = { blocker_id: string; blocked_id: string; created_at: string }

export type LoadBlocksResult = {
  /** Те, кого Я заблокировал — с данными (для списка в настройках). */
  mine: BlockedEntry[]
  /** Объединение обеих сторон (кого скрывать друг от друга в поиске/рекомендациях/чате). */
  hiddenIds: string[]
}

/** Дотягивает имя/тип/аватар для набора id (профиль или компания). */
async function enrich(ids: string[]): Promise<Map<string, { name: string; kind: 'user' | 'company'; avatar?: string }>> {
  const map = new Map<string, { name: string; kind: 'user' | 'company'; avatar?: string }>()
  if (!ids.length) return map
  const [profs, comps] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, account_type').in('id', ids),
    supabase.from('companies').select('id, name, logo_url, avatar_url').in('id', ids),
  ])
  for (const p of (profs.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null; account_type: string | null }[]) {
    map.set(p.id, {
      name: p.full_name?.trim() || 'Пользователь',
      kind: p.account_type === 'company' ? 'company' : 'user',
      avatar: p.avatar_url ?? undefined,
    })
  }
  for (const c of (comps.data ?? []) as { id: string; name: string | null; logo_url: string | null; avatar_url: string | null }[]) {
    map.set(c.id, {
      name: c.name?.trim() || 'Компания',
      kind: 'company',
      avatar: c.logo_url ?? c.avatar_url ?? undefined,
    })
  }
  return map
}

/** Загрузка блокировок (обе стороны) текущего пользователя. */
export const loadBlocks = createAsyncThunk<LoadBlocksResult, void>('blocks/load', async () => {
  const me = await currentUserId()
  if (!me) return { mine: [], hiddenIds: [] }
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id, created_at')
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as BlockRow[]

  const mineRows = rows.filter((r) => r.blocker_id === me)
  const hiddenIds = [
    ...new Set(rows.map((r) => (r.blocker_id === me ? r.blocked_id : r.blocker_id))),
  ]

  const details = await enrich(mineRows.map((r) => r.blocked_id))
  const mine: BlockedEntry[] = mineRows.map((r) => {
    const d = details.get(r.blocked_id)
    return {
      id: r.blocked_id,
      name: d?.name ?? 'Пользователь',
      kind: d?.kind ?? 'user',
      avatar: d?.avatar,
      createdAt: r.created_at,
    }
  })
  // новые сверху
  mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { mine, hiddenIds }
})

/** Заблокировать пользователя/компанию. */
export const blockUser = createAsyncThunk<void, string>('blocks/block', async (targetId, { dispatch }) => {
  const me = await currentUserId()
  if (!me || !targetId || targetId === me) return
  dispatch(blocksActions.addHidden(targetId)) // оптимистично прячем
  const { error } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: targetId })
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw new Error(error.message)
  }
  void dispatch(loadBlocks()) // подтянуть детали для списка
})

/** Разблокировать. */
export const unblockUser = createAsyncThunk<string, string>('blocks/unblock', async (targetId, { dispatch }) => {
  const me = await currentUserId()
  if (!me) return targetId
  dispatch(blocksActions.removeBlocked(targetId)) // оптимистично
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', me)
    .eq('blocked_id', targetId)
  if (error) throw new Error(error.message)
  return targetId
})
