import { useEffect, useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, EntityCell, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDateTime, fmtRelative } from '../../features/admin/lib/format'
import { reportStatus, reportPriority, targetType } from '../../features/admin/lib/labels'
import type {
  ReportBucket,
  ReportTargetType,
  ReportPriority,
  AdminReportRow,
  ReportResolution,
} from '../../features/admin/model/types'

const PAGE_SIZE = 10

const TARGET_ICON: Record<ReportTargetType, keyof typeof Ic> = {
  user: 'users',
  company: 'company',
  post: 'post',
  comment: 'message',
  vacancy: 'briefcase',
}

const ACTION_LABEL: Record<string, string> = {
  created: 'Жалоба создана',
  assigned: 'Назначена модератору',
  measures: 'Приняты меры',
  warn: 'Вынесено предупреждение',
  block: 'Объект заблокирован',
  reject: 'Жалоба отклонена',
  comment: 'Добавлен комментарий',
  status: 'Изменён статус',
}

function openEntity(type: ReportTargetType, id: string) {
  if (type === 'user' || type === 'company') window.open(`/u/${id}`, '_blank')
  else if (type === 'post') window.open(`/?post=${id}`, '_blank')
  else if (type === 'vacancy') window.open('/vacancies', '_blank')
}

// ── Детальная панель жалобы ────────────────────────────────
function ReportDetail({
  id,
  onClose,
  onPrev,
  onNext,
  onChanged,
  toast,
}: {
  id: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  onChanged: () => void
  toast: (m: string) => void
}) {
  const { data: r, loading, reload } = useAsync(() => adminApi.report(id), [id])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setComment('')
  }, [id])

  const act = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true)
    try {
      await fn()
      toast(msg)
      reload()
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  const resolve = (res: ReportResolution, msg: string) => act(() => adminApi.resolveReport(id, res, comment), msg)

  if (loading || !r)
    return (
      <div className={s.detail}>
        <div className={s.detailPlaceholder}>{loading ? 'Загрузка…' : 'Жалоба не найдена'}</div>
      </div>
    )

  const stt = reportStatus[r.status]
  const TargetIcon = Ic[TARGET_ICON[r.targetType]]

  return (
    <div className={s.detail}>
      <div className={s.detailHead}>
        <span className={s.detailId}>Жалоба #{r.id.slice(0, 8)}</span>
        <Badge tone={stt.tone}>{stt.label}</Badge>
        <div className={s.detailNav}>
          <button className={`${s.btn} ${s.btnIcon}`} disabled={!onPrev} onClick={onPrev} aria-label="Предыдущая">
            <Ic.chevronLeft />
          </button>
          <button className={`${s.btn} ${s.btnIcon}`} disabled={!onNext} onClick={onNext} aria-label="Следующая">
            <Ic.chevronRight />
          </button>
          <button className={`${s.btn} ${s.btnIcon}`} onClick={onClose} aria-label="Закрыть">
            <Ic.x />
          </button>
        </div>
      </div>

      <div className={s.detailBody}>
        <div>
          <div className={s.detailTitle}>
            <TargetIcon style={{ width: 22, height: 22, color: 'var(--a-primary)' }} />
            {r.category || 'Жалоба'}
          </div>
          <div className={s.detailTitleSub}>
            Тип: {targetType[r.targetType]} · Подана {fmtDateTime(r.createdAt)}
          </div>
        </div>

        <div className={s.detailTwo}>
          <div>
            <div className={s.detailLabel}>На кого подана</div>
            <EntityCell e={r.target} />
            <button className={s.detailLink} onClick={() => openEntity(r.targetType, r.target.id)}>
              Перейти <Ic.external style={{ width: 13, height: 13 }} />
            </button>
          </div>
          <div>
            <div className={s.detailLabel}>Кем подана</div>
            <EntityCell e={r.reporter} />
            {r.reporter && (
              <button className={s.detailLink} onClick={() => window.open(`/u/${r.reporter?.id}`, '_blank')}>
                В профиль <Ic.external style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </div>

        {r.description && (
          <div>
            <div className={s.detailLabel}>Содержание жалобы</div>
            <div className={s.contentText}>{r.description}</div>
          </div>
        )}

        {r.content && (
          <div>
            <div className={s.detailLabel}>Контент</div>
            <div className={s.contentBox}>
              <div className={s.contentMeta}>
                <TargetIcon style={{ width: 14, height: 14 }} />
                {r.content.kind === 'post' ? 'Публикация' : 'Комментарий'} от {fmtDateTime(r.content.createdAt)}
                {r.content.removed && ' · удалён'}
              </div>
              <div className={s.contentText}>{r.content.text || '(без текста)'}</div>
              {r.targetType === 'post' && (
                <button className={s.detailLink} onClick={() => openEntity('post', r.target.id)}>
                  Открыть публикацию <Ic.external style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <div className={s.detailLabel}>Действия модератора</div>
          <div className={s.actionGrid}>
            <button className={`${s.btn} ${s.btnSuccess}`} disabled={busy} onClick={() => resolve('measures', 'Меры приняты')}>
              <Ic.check /> Принять меры
            </button>
            <button className={`${s.btn} ${s.btnWarn}`} disabled={busy} onClick={() => resolve('warn', 'Предупреждение вынесено')}>
              <Ic.warning /> Предупредить
            </button>
            <button
              className={`${s.btn} ${s.btnDanger}`}
              disabled={busy}
              onClick={() => confirm('Заблокировать объект жалобы?') && resolve('block', 'Объект заблокирован')}
            >
              <Ic.ban /> Заблокировать
            </button>
            <button className={`${s.btn}`} disabled={busy} onClick={() => resolve('reject', 'Жалоба отклонена')}>
              <Ic.xCircle /> Отклонить
            </button>
          </div>
        </div>

        <div>
          <div className={s.detailLabel}>История действий</div>
          <div className={s.history}>
            <div className={s.historyItem}>
              <div className={s.historyDot}>
                <Ic.flag />
              </div>
              <div>
                <div>Жалоба создана</div>
                <div className={s.historyMeta}>
                  {fmtRelative(r.createdAt)} · {r.reporter?.name ?? '—'}
                </div>
              </div>
            </div>
            {r.history.map((h) => (
              <div key={h.id} className={s.historyItem}>
                <div className={s.historyDot}>
                  <Ic.dot />
                </div>
                <div>
                  <div>
                    {ACTION_LABEL[h.action] ?? h.action}
                    {h.note && <span className={s.historyMeta}> — {h.note}</span>}
                  </div>
                  <div className={s.historyMeta}>
                    {fmtRelative(h.createdAt)} · {h.actor?.name ?? '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={s.detailLabel}>Комментарий модератора</div>
          <textarea
            className={s.commentArea}
            placeholder="Добавьте комментарий…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={busy || !comment.trim()}
              onClick={() => act(() => adminApi.addReportComment(id, comment), 'Комментарий сохранён')}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Страница ───────────────────────────────────────────────
export function ReportsPage() {
  const [bucket, setBucket] = useState<ReportBucket>('')
  const [type, setType] = useState<ReportTargetType | ''>('')
  const [priority, setPriority] = useState<ReportPriority | ''>('')
  const [searchRaw, setSearchRaw] = useState('')
  const [page, setPage] = useState(0)
  const [selId, setSelId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const search = useDebounced(searchRaw, 300)

  const { data, loading, error, reload } = useAsync(
    () => adminApi.reports({ bucket, type, priority, search, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [bucket, type, priority, search, page],
  )

  const toast = (m: string) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg(null), 2500)
  }

  const rows: AdminReportRow[] = data?.rows ?? []
  const selIndex = rows.findIndex((r) => r.id === selId)
  const counts = data?.counts

  const resetPage = () => setPage(0)

  const TABS: { key: ReportBucket; label: string; count?: number }[] = [
    { key: '', label: 'Все жалобы', count: counts?.all },
    { key: 'reviewing', label: 'На рассмотрении', count: counts?.reviewing },
    { key: 'attention', label: 'Требуют внимания', count: counts?.attention },
    { key: 'resolved', label: 'Обработано', count: counts?.resolved },
    { key: 'rejected', label: 'Отклонено', count: counts?.rejected },
  ]

  const METRICS: { label: string; value: number | undefined; icon: keyof typeof Ic; color: string; bg: string }[] = [
    { label: 'Всего жалоб', value: counts?.all, icon: 'warning', color: 'var(--a-primary)', bg: 'var(--a-primary-soft)' },
    { label: 'На рассмотрении', value: counts?.reviewing, icon: 'clock', color: 'var(--a-yellow)', bg: 'var(--a-yellow-soft)' },
    { label: 'Требуют внимания', value: counts?.attention, icon: 'flag', color: 'var(--a-red)', bg: 'var(--a-red-soft)' },
    { label: 'Обработано', value: counts?.resolved, icon: 'checkCircle', color: 'var(--a-green)', bg: 'var(--a-green-soft)' },
    { label: 'Отклонено', value: counts?.rejected, icon: 'ban', color: 'var(--a-muted)', bg: 'var(--a-card-2)' },
  ]

  return (
    <>
      <AdminTopbar
        title="Жалобы и модерация"
        crumbs="Главная / Жалобы"
        actions={
          <button className={s.btn}>
            <Ic.download /> Экспорт
          </button>
        }
      />
      <div className={s.content}>
        {/* Метрики */}
        <div className={s.metricGrid}>
          {METRICS.map((m) => {
            const Icon = Ic[m.icon]
            return (
              <div key={m.label} className={s.metric}>
                <div className={s.metricTop}>
                  <div className={s.metricIcon} style={{ background: m.bg, color: m.color }}>
                    <Icon />
                  </div>
                  <div className={s.metricLabel}>{m.label}</div>
                </div>
                <div className={s.metricValue}>{m.value ?? '—'}</div>
              </div>
            )
          })}
        </div>

        {/* Табы */}
        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${s.tab} ${bucket === t.key ? s.tabActive : ''}`}
              onClick={() => {
                setBucket(t.key)
                resetPage()
              }}
            >
              {t.label}
              {t.count !== undefined && <span className={s.tabCount}>{t.count}</span>}
            </button>
          ))}
        </div>

        <div className={`${s.reportsGrid} ${selId ? '' : s.reportsGridFull}`}>
          {/* Список */}
          <div className={s.tableCard}>
            <div className={s.toolbar}>
              <select
                className={s.select}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as ReportTargetType | '')
                  resetPage()
                }}
              >
                <option value="">Все типы</option>
                {(Object.keys(targetType) as ReportTargetType[]).map((k) => (
                  <option key={k} value={k}>
                    {targetType[k]}
                  </option>
                ))}
              </select>
              <select
                className={s.select}
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as ReportPriority | '')
                  resetPage()
                }}
              >
                <option value="">Все приоритеты</option>
                <option value="high">Высокий</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
              <div className={s.search}>
                <Ic.search />
                <input
                  placeholder="Поиск по жалобам…"
                  value={searchRaw}
                  onChange={(e) => {
                    setSearchRaw(e.target.value)
                    resetPage()
                  }}
                />
              </div>
            </div>

            {error && <div className={s.error} style={{ margin: 16 }}>{error}</div>}

            <table className={s.table}>
              <thead>
                <tr>
                  <th>Жалоба</th>
                  <th>Тип</th>
                  <th>На кого</th>
                  <th>Кем подана</th>
                  <th>Приоритет</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className={s.empty}>
                      Загрузка…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className={s.empty}>
                      Жалоб нет
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const stt = reportStatus[r.status]
                  const pr = reportPriority[r.priority]
                  const Icon = Ic[TARGET_ICON[r.targetType]]
                  return (
                    <tr
                      key={r.id}
                      className={selId === r.id ? s.rowSelected : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelId(r.id)}
                    >
                      <td>
                        <div className={s.cellMain}>
                          <div className={s.cellMainIcon}>
                            <Icon />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className={s.entityName}>{r.category || 'Жалоба'}</div>
                            <div className={s.entitySub}>{targetType[r.targetType]}</div>
                          </div>
                        </div>
                      </td>
                      <td className={s.cellMuted}>{targetType[r.targetType]}</td>
                      <td>
                        <div className={s.entity}>
                          <Avatar src={r.target.avatar} name={r.target.name} square={r.target.kind !== 'user'} size={28} />
                          <span style={{ fontSize: 13 }}>{r.target.name}</span>
                        </div>
                      </td>
                      <td>
                        {r.reporter ? (
                          <div className={s.entity}>
                            <Avatar src={r.reporter.avatar} name={r.reporter.name} square={r.reporter.kind !== 'user'} size={28} />
                            <span style={{ fontSize: 13 }}>{r.reporter.name}</span>
                          </div>
                        ) : (
                          <span className={s.cellMuted}>—</span>
                        )}
                      </td>
                      <td>
                        <Badge tone={pr.tone}>{pr.label}</Badge>
                      </td>
                      <td>
                        <Badge tone={stt.tone}>{stt.label}</Badge>
                      </td>
                      <td className={s.cellMuted}>{fmtDateTime(r.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
          </div>

          {/* Детальная панель */}
          {selId && (
            <ReportDetail
              id={selId}
              onClose={() => setSelId(null)}
              onPrev={selIndex > 0 ? () => setSelId(rows[selIndex - 1].id) : undefined}
              onNext={selIndex >= 0 && selIndex < rows.length - 1 ? () => setSelId(rows[selIndex + 1].id) : undefined}
              onChanged={reload}
              toast={toast}
            />
          )}
        </div>
      </div>

      {toastMsg && <div className={s.toast}>{toastMsg}</div>}
    </>
  )
}
