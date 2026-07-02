import { createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../../shared/lib/supabase'
import { rowToItem, type PortfolioRow } from '../lib/mapPortfolio'
import type { PortfolioDraft, PortfolioItem } from './types'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/** Портфолио владельца (вкладка в профиле — свой и публичный). */
export const loadPortfolio = createAsyncThunk<PortfolioItem[], string>(
  'portfolio/load',
  async (ownerId) => {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as PortfolioRow[]).map(rowToItem)
  },
)

/** Добавить работу. */
export const createPortfolioItem = createAsyncThunk<PortfolioItem, PortfolioDraft>(
  'portfolio/create',
  async (draft) => {
    const uid = await currentUserId()
    if (!uid) throw new Error('Не авторизован')
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert({
        owner_id: uid,
        kind: draft.kind,
        title: draft.title,
        url: draft.url,
        cover_url: draft.coverUrl ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToItem(data as PortfolioRow)
  },
)

/** Обновить работу. */
export const updatePortfolioItem = createAsyncThunk<PortfolioItem, PortfolioDraft & { id: string }>(
  'portfolio/update',
  async (draft) => {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update({
        kind: draft.kind,
        title: draft.title,
        url: draft.url,
        cover_url: draft.coverUrl ?? null,
      })
      .eq('id', draft.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToItem(data as PortfolioRow)
  },
)

/** Удалить работу. */
export const deletePortfolioItem = createAsyncThunk<string, string>(
  'portfolio/delete',
  async (id) => {
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return id
  },
)
