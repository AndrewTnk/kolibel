import { supabase } from '../../../shared/lib/supabase'
import type {
  Overview,
  ListResult,
  AdminUser,
  AdminCompany,
  AdminVacancy,
  AdminPost,
  AdminComment,
  ReportListResult,
  AdminReportDetail,
  AdminAnalytics,
  AccountStatus,
  VacancyModeration,
  ReportBucket,
  ReportResolution,
  ReportTargetType,
  ReportPriority,
  AdminRole,
} from '../model/types'

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

type Page = { search?: string; limit?: number; offset?: number }

/** Все вызовы админских RPC. Доступ гейтится ролью на стороне БД (security definer). */
export const adminApi = {
  // ── Чтение ──────────────────────────────────────────────
  overview: () => rpc<Overview>('get_admin_overview'),

  users: (p: Page & { status?: AccountStatus | '' } = {}) =>
    rpc<ListResult<AdminUser>>('get_admin_users', {
      p_search: p.search ?? '',
      p_status: p.status ?? '',
      p_limit: p.limit ?? 20,
      p_offset: p.offset ?? 0,
    }),

  companies: (p: Page & { status?: AccountStatus | '' } = {}) =>
    rpc<ListResult<AdminCompany>>('get_admin_companies', {
      p_search: p.search ?? '',
      p_status: p.status ?? '',
      p_limit: p.limit ?? 20,
      p_offset: p.offset ?? 0,
    }),

  vacancies: (p: Page & { moderation?: VacancyModeration | '' } = {}) =>
    rpc<ListResult<AdminVacancy>>('get_admin_vacancies', {
      p_search: p.search ?? '',
      p_moderation: p.moderation ?? '',
      p_limit: p.limit ?? 20,
      p_offset: p.offset ?? 0,
    }),

  posts: (p: Page & { state?: '' | 'removed' | 'active' } = {}) =>
    rpc<ListResult<AdminPost>>('get_admin_posts', {
      p_search: p.search ?? '',
      p_state: p.state ?? '',
      p_limit: p.limit ?? 20,
      p_offset: p.offset ?? 0,
    }),

  comments: (p: Page & { state?: '' | 'removed' | 'active' } = {}) =>
    rpc<ListResult<AdminComment>>('get_admin_comments', {
      p_search: p.search ?? '',
      p_state: p.state ?? '',
      p_limit: p.limit ?? 20,
      p_offset: p.offset ?? 0,
    }),

  reports: (
    p: Page & { bucket?: ReportBucket; type?: ReportTargetType | ''; priority?: ReportPriority | '' } = {},
  ) =>
    rpc<ReportListResult>('get_admin_reports', {
      p_bucket: p.bucket ?? '',
      p_type: p.type ?? '',
      p_priority: p.priority ?? '',
      p_search: p.search ?? '',
      p_limit: p.limit ?? 10,
      p_offset: p.offset ?? 0,
    }),

  report: (id: string) => rpc<AdminReportDetail | null>('get_admin_report', { p_id: id }),

  analytics: () => rpc<AdminAnalytics>('get_admin_analytics'),

  // ── Действия ────────────────────────────────────────────
  setAccountStatus: (id: string, status: AccountStatus) =>
    rpc<void>('admin_set_account_status', { p_id: id, p_status: status }),

  setVacancyModeration: (id: string, moderation: VacancyModeration) =>
    rpc<void>('admin_set_vacancy_moderation', { p_id: id, p_moderation: moderation }),

  setPostRemoved: (id: string, removed: boolean) =>
    rpc<void>('admin_set_post_removed', { p_id: id, p_removed: removed }),

  setCommentRemoved: (id: string, removed: boolean) =>
    rpc<void>('admin_set_comment_removed', { p_id: id, p_removed: removed }),

  assignReport: (id: string) => rpc<void>('admin_assign_report', { p_id: id }),

  addReportComment: (id: string, note: string) =>
    rpc<void>('admin_add_report_comment', { p_id: id, p_note: note }),

  resolveReport: (id: string, resolution: ReportResolution, note = '') =>
    rpc<void>('admin_resolve_report', { p_id: id, p_resolution: resolution, p_note: note }),

  // ── Роли (admin only) ───────────────────────────────────
  grantRole: (userId: string, role: AdminRole) =>
    rpc<void>('admin_grant_role', { p_user_id: userId, p_role: role }),

  revokeRole: (userId: string) => rpc<void>('admin_revoke_role', { p_user_id: userId }),
}
