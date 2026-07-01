import { supabase } from '../../../shared/lib/supabase'
import { uploadToStorage } from '../../../shared/lib/storage'
import type { ReportTarget } from '../model/types'

/** Предустановленные причины жалобы (станут `reports.category` — заголовок в админке). */
export const REPORT_REASONS = [
  'Спам',
  'Оскорбления и травля',
  'Мошенничество',
  'Неподходящий контент',
  'Нарушение авторских прав',
  'Нарушение правил сообщества',
  'Другое',
] as const

export type SubmitReportParams = {
  target: ReportTarget
  reason: string
  description: string
  /** Скриншоты-доказательства (особенно для жалоб из личного чата). */
  evidence?: File[]
}

/** Ответ модерации в ветке жалобы (для «живой» карточки в чате поддержки). */
export type MyReportResponse = {
  resolution: 'measures' | 'reject'
  reason: string
  comment: string
  createdAt: number
}

/** Полное состояние жалобы автора + ветка ответов (get_my_report). */
export type MyReport = {
  seq: number
  category: string
  description: string
  status: 'new' | 'reviewing' | 'resolved' | 'rejected'
  createdAt: number
  evidence: string[]
  responses: MyReportResponse[]
}

/**
 * Отправляет жалобу: грузит скриншоты в Storage (папка report) и вызывает RPC
 * `submit_report` — она атомарно пишет строку в `reports` И создаёт карточку жалобы
 * в системном чате «Поддержка Kolibel». Возвращает id созданной жалобы.
 */
export async function submitReport(p: SubmitReportParams): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const me = data.session?.user?.id
  if (!me) throw new Error('Нужно войти, чтобы отправить жалобу')

  const urls: string[] = []
  for (const file of p.evidence ?? []) {
    urls.push(await uploadToStorage('report', file))
  }

  const { data: reportId, error } = await supabase.rpc('submit_report', {
    p_target_type: p.target.type,
    p_target_id: p.target.id,
    p_category: p.reason,
    p_description: p.description.trim(),
    p_evidence: urls,
  })
  if (error) throw new Error(error.message)
  return reportId as string
}

/** «Живая» карточка жалобы: жалоба + ветка ответов модерации (RLS: только автору). */
export async function fetchMyReport(reportId: string): Promise<MyReport | null> {
  const { data, error } = await supabase.rpc('get_my_report', { p_report_id: reportId })
  if (error) throw new Error(error.message)
  if (!data) return null
  const d = data as Record<string, unknown>
  return {
    seq: Number(d.seq ?? 0),
    category: (d.category as string) ?? '',
    description: (d.description as string) ?? '',
    status: ((d.status as string) ?? 'new') as MyReport['status'],
    createdAt: Number(d.createdAt ?? 0),
    evidence: Array.isArray(d.evidence) ? (d.evidence as string[]) : [],
    responses: Array.isArray(d.responses) ? (d.responses as MyReportResponse[]) : [],
  }
}
