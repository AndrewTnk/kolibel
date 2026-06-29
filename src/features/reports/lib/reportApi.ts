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

/**
 * Отправляет жалобу: грузит скриншоты в Storage (папка report) и пишет строку
 * в `reports` (RLS: reporter_id = auth.uid()). Дальше она появляется в админке.
 */
export async function submitReport(p: SubmitReportParams): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const me = data.session?.user?.id
  if (!me) throw new Error('Нужно войти, чтобы отправить жалобу')

  const urls: string[] = []
  for (const file of p.evidence ?? []) {
    urls.push(await uploadToStorage('report', file))
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: me,
    target_type: p.target.type,
    target_id: p.target.id,
    category: p.reason,
    description: p.description.trim(),
    evidence: urls,
  })
  if (error) throw new Error(error.message)
}
