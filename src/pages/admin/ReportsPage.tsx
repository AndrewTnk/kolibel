import { useEffect, useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, EntityCell, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDateTime, fmtRelative } from '../../features/admin/lib/format'
import { reportStatus, reportPriority, targetType } from '../../features/admin/lib/labels'
import { reasonsForTarget } from '../../features/admin/lib/moderationReasons'
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

// Варианты решения (выбор → подтверждение «Сохранить»).
// «Принять меры» применяет действие автоматически по типу цели:
// пост/коммент → удалить, юзер/компания → заблокировать, вакансия → снять.
const RESOLUTIONS: { res: ReportResolution; label: string; icon: keyof typeof Ic; cls: string }[] = [
  { res: 'measures', label: 'Принять меры', icon: 'check', cls: 'btnSuccess' },
  { res: 'reject', label: 'Отклонить', icon: 'xCircle', cls: 'btn' },
]

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
  const [selected, setSelected] = useState<ReportResolution | null>(null)
  const [reasonKey, setReasonKey] = useState('')
  const [busy, setBusy] = useState(false)

  // Причины зависят от типа цели жалобы (контент → удаление, аккаунт → блокировка).
  const reasons = reasonsForTarget(r?.targetType ?? 'post')

  useEffect(() => {
    setComment('')
    setSelected(null)
    setReasonKey('')
  }, [id])

  const copyId = (value: string) => {
    void navigator.clipboard?.writeText(value)
    toast('ID скопирован')
  }

  // Выбор решения. При «Принять меры» подставляем первую причину и её шаблон.
  const pickResolution = (res: ReportResolution) => {
    if (selected === res) {
      setSelected(null)
      return
    }
    setSelected(res)
    if (res === 'measures') {
      const first = reasons[0]
      setReasonKey(first?.key ?? '')
      setComment(first?.message ?? '')
    } else {
      setReasonKey('')
      setComment('')
    }
  }

  const pickReason = (key: string) => {
    setReasonKey(key)
    const found = reasons.find((x) => x.key === key)
    if (found) setComment(found.message)
  }

  // Применить выбранное решение (+ причину/комментарий), уведомить обе стороны.
  const saveDecision = async () => {
    if (!selected) return
    const reasonLabel = selected === 'measures' ? reasons.find((x) => x.key === reasonKey)?.label ?? '' : ''
    setBusy(true)
    try {
      await adminApi.resolveReport(id, selected, comment, reasonLabel)
      toast('Решение сохранено, уведомления отправлены')
      reload()
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !r)
    return (
      <div className={s.detail}>
        <div className={s.detailPlaceholder}>{loading ? 'Загрузка…' : 'Жалоба не найдена'}</div>
      </div>
    )

  const stt = reportStatus[r.status]
  const TargetIcon = Ic[TARGET_ICON[r.targetType]]
  // Решение уже принято — повторно отвечать нельзя.
  const decided = r.status === 'resolved' || r.status === 'rejected'

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
            {r.targetProfileId && (
              <button className={s.detailLink} onClick={() => window.open(`/u/${r.targetProfileId}`, '_blank')}>
                Перейти в профиль <Ic.external style={{ width: 13, height: 13 }} />
              </button>
            )}
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
            <div className={s.detailLabel}>Объект жалобы</div>
            <div className={s.contentBox}>
              <div className={s.contentMeta}>
                <TargetIcon style={{ width: 14, height: 14 }} />
                {r.content.kind === 'post' ? 'Публикация' : 'Комментарий'} от {fmtDateTime(r.content.createdAt)}
                {r.content.removed && ' · удалён'}
              </div>
              {r.content.kind === 'comment' && r.content.commentId && (
                <div className={s.idRow}>
                  <span className={s.idLabel}>ID коммента</span>
                  <span className={s.idValue}>{r.content.commentId}</span>
                  <button className={s.copyBtn} title="Скопировать" onClick={() => copyId(r.content!.commentId!)}>
                    <Ic.copy />
                  </button>
                </div>
              )}
              {r.content.postId && (
                <div className={s.idRow}>
                  <span className={s.idLabel}>ID поста</span>
                  <span className={s.idValue}>{r.content.postId}</span>
                  <button className={s.copyBtn} title="Скопировать" onClick={() => copyId(r.content!.postId!)}>
                    <Ic.copy />
                  </button>
                </div>
              )}
              {r.content.postId && (
                <button
                  className={s.detailLink}
                  style={{ marginTop: 10 }}
                  onClick={() => window.open(`/?post=${r.content?.postId}`, '_blank')}
                >
                  Открыть публикацию <Ic.external style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {r.evidence.length > 0 && (
          <div>
            <div className={s.detailLabel}>Доказательства</div>
            <div className={s.evidence}>
              {r.evidence.slice(0, 4).map((url, i) => (
                <button key={i} className={s.evidenceThumb} onClick={() => window.open(url, '_blank')} title="Открыть">
                  <img src={url} alt="" />
                </button>
              ))}
              {r.evidence.length > 4 && (
                <button className={s.evidenceMore} onClick={() => window.open(r.evidence[4], '_blank')}>
                  +{r.evidence.length - 4}
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <div className={s.detailLabel}>Действия модератора</div>
          {decided ? (
            <div className={s.decidedNote}>
              <Ic.checkCircle style={{ width: 18, height: 18, color: 'var(--a-green)' }} />
              Решение по жалобе уже принято — ответ отправлен автору.
            </div>
          ) : (
            <>
              <div className={s.actionGrid}>
                {RESOLUTIONS.map(({ res, label, icon, cls }) => {
                  const ResIcon = Ic[icon]
                  return (
                    <button
                      key={res}
                      className={`${s.btn} ${s[cls]} ${selected === res ? s.actionSelected : ''}`}
                      disabled={busy}
                      onClick={() => pickResolution(res)}
                    >
                      <ResIcon /> {label}
                    </button>
                  )
                })}
              </div>
              {selected === 'measures' && (
                <>
                  <div className={s.detailLabel} style={{ marginTop: 12 }}>
                    Причина (
                    {r.targetType === 'user' || r.targetType === 'company' ? 'блокировка аккаунта' : 'удаление контента'})
                  </div>
                  <select
                    className={s.select}
                    style={{ width: '100%' }}
                    value={reasonKey}
                    onChange={(e) => pickReason(e.target.value)}
                  >
                    {reasons.map((r2) => (
                      <option key={r2.key} value={r2.key}>
                        {r2.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <textarea
                className={s.commentArea}
                style={{ marginTop: 10 }}
                placeholder={
                  selected === 'measures'
                    ? 'Сообщение нарушителю и автору жалобы…'
                    : 'Комментарий модерации (виден автору жалобы)…'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !selected} onClick={saveDecision}>
                  Сохранить
                </button>
              </div>
            </>
          )}
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
                  const closed = r.status === 'resolved' || r.status === 'rejected'
                  return (
                    <tr
                      key={r.id}
                      className={[selId === r.id ? s.rowSelected : '', closed ? s.rowMuted : '']
                        .filter(Boolean)
                        .join(' ')}
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
