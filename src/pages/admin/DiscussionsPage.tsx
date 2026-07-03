import { useEffect, useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDateTime, fmtRelative } from '../../features/admin/lib/format'
import { discussionCategory, discussionStatus } from '../../features/admin/lib/labels'
import type { AdminDiscussionRow, DiscussionBucket } from '../../features/admin/model/types'

const PAGE_SIZE = 12

// ── Детальная панель: переписка с пользователем ─────────────
function DiscussionDetail({
  id,
  onClose,
  onChanged,
}: {
  id: string
  onClose: () => void
  onChanged: () => void
}) {
  const { data: d, loading, reload } = useAsync(() => adminApi.discussion(id), [id])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReply('')
    setError(null)
  }, [id])

  const send = async () => {
    if (!reply.trim() || busy) return
    setBusy(true)
    try {
      await adminApi.replyDiscussion(id, reply)
      setReply('')
      reload()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status: 'open' | 'closed') => {
    setBusy(true)
    try {
      await adminApi.setDiscussionStatus(id, status)
      reload()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.detail}>
      <div className={s.detailHead}>
        <Ic.message />
        <span className={s.detailId}>Обращение #{id.slice(0, 8)}</span>
        <div className={s.detailNav}>
          <button className={`${s.btn} ${s.btnIcon}`} title="Закрыть панель" onClick={onClose}>
            <Ic.x />
          </button>
        </div>
      </div>

      {loading || !d ? (
        <div className={s.detailBody}>
          <div className={s.empty}>{loading ? 'Загрузка…' : 'Обращение не найдено'}</div>
        </div>
      ) : (
        <div className={s.detailBody}>
          <div>
            <div className={s.detailTitle}>{d.subject || 'Без темы'}</div>
            <div className={s.detailTitleSub}>
              {discussionCategory[d.category]} · создано {fmtDateTime(d.createdAt)}
            </div>
          </div>

          <div className={s.detailTwo}>
            <div>
              <div className={s.detailLabel}>Пользователь</div>
              <div className={s.entity}>
                <Avatar src={d.user.avatar} name={d.user.name} square={d.user.kind !== 'user'} size={30} />
                <div style={{ minWidth: 0 }}>
                  <div className={s.entityName}>{d.user.name}</div>
                  {d.user.sub ? <div className={s.entitySub}>{d.user.sub}</div> : null}
                </div>
              </div>
              <button className={s.detailLink} onClick={() => window.open(`/u/${d.user.id}`, '_blank')}>
                Открыть профиль →
              </button>
            </div>
            <div>
              <div className={s.detailLabel}>Статус</div>
              <Badge tone={discussionStatus[d.status].tone}>{discussionStatus[d.status].label}</Badge>
            </div>
          </div>

          <div>
            <div className={s.detailLabel}>Переписка</div>
            <div className={s.dcChat}>
              {d.messages.map((m) => (
                <div key={m.id} className={[s.dcRow, m.kind === 'staff' ? s.dcRowStaff : ''].join(' ')}>
                  <div className={[s.dcBubble, m.kind === 'staff' ? s.dcBubbleStaff : ''].join(' ')}>
                    {m.kind === 'staff' ? (
                      <div className={s.dcAuthor}>{m.staff?.name ?? 'Поддержка'}</div>
                    ) : null}
                    {m.body}
                    <div className={s.dcMeta}>{fmtDateTime(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error ? <div className={s.error}>{error}</div> : null}

          <div className={s.dcComposer}>
            <textarea
              className={s.commentArea}
              placeholder="Ответ пользователю (уйдёт от имени «Поддержка Kolibel»)…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {d.status === 'open' ? (
                <button className={s.btn} disabled={busy} onClick={() => void setStatus('closed')}>
                  <Ic.xCircle /> Закрыть обращение
                </button>
              ) : (
                <button className={`${s.btn} ${s.btnSuccess}`} disabled={busy} onClick={() => void setStatus('open')}>
                  <Ic.restore /> Открыть заново
                </button>
              )}
              <button
                className={`${s.btn} ${s.btnPrimary}`}
                disabled={busy || !reply.trim()}
                onClick={() => void send()}
              >
                Ответить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Страница ───────────────────────────────────────────────
export function DiscussionsPage() {
  const [bucket, setBucket] = useState<DiscussionBucket>('')
  const [searchRaw, setSearchRaw] = useState('')
  const [page, setPage] = useState(0)
  const [selId, setSelId] = useState<string | null>(null)
  const search = useDebounced(searchRaw, 300)

  const { data, loading, error, reload } = useAsync(
    () => adminApi.discussions({ bucket, search, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [bucket, search, page],
  )

  const rows: AdminDiscussionRow[] = data?.rows ?? []
  const counts = data?.counts

  const TABS: { key: DiscussionBucket; label: string; count?: number }[] = [
    { key: '', label: 'Все', count: counts?.all },
    { key: 'waiting', label: 'Ждут ответа', count: counts?.waiting },
    { key: 'open', label: 'Открытые', count: counts?.open },
    { key: 'closed', label: 'Закрытые', count: counts?.closed },
  ]

  return (
    <>
      <AdminTopbar title="Обсуждения" crumbs="Главная / Обсуждения" />
      <div className={s.content}>
        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${s.tab} ${bucket === t.key ? s.tabActive : ''}`}
              onClick={() => {
                setBucket(t.key)
                setPage(0)
              }}
            >
              {t.label}
              {t.count !== undefined && <span className={s.tabCount}>{t.count}</span>}
            </button>
          ))}
        </div>

        <div className={`${s.reportsGrid} ${selId ? '' : s.reportsGridFull}`}>
          <div className={s.tableCard}>
            <div className={s.toolbar}>
              <div className={s.search}>
                <Ic.search />
                <input
                  placeholder="Поиск по теме, пользователю или #ID…"
                  value={searchRaw}
                  onChange={(e) => {
                    setSearchRaw(e.target.value)
                    setPage(0)
                  }}
                />
              </div>
            </div>

            {error && <div className={s.error} style={{ margin: 16 }}>{error}</div>}

            <table className={s.table}>
              <thead>
                <tr>
                  <th>Тема</th>
                  <th>Пользователь</th>
                  <th>Статус</th>
                  <th>Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className={s.empty}>
                      Загрузка…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className={s.empty}>
                      Обращений нет
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={[selId === r.id ? s.rowSelected : '', r.status === 'closed' ? s.rowMuted : '']
                      .filter(Boolean)
                      .join(' ')}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelId(r.id)}
                  >
                    <td>
                      <div className={s.cellMain}>
                        <div className={s.cellMainIcon}>
                          <Ic.message />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className={s.entityName}>{r.subject || 'Без темы'}</div>
                          <div className={s.entitySub}>{discussionCategory[r.category]}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={s.entity}>
                        <Avatar src={r.user.avatar} name={r.user.name} square={r.user.kind !== 'user'} size={28} />
                        <span style={{ fontSize: 13 }}>{r.user.name}</span>
                      </div>
                    </td>
                    <td>
                      {r.waiting ? (
                        <Badge tone="yellow">Ждёт ответа</Badge>
                      ) : (
                        <Badge tone={discussionStatus[r.status].tone}>{discussionStatus[r.status].label}</Badge>
                      )}
                    </td>
                    <td className={s.cellMuted}>{fmtRelative(r.lastMessageAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
          </div>

          {selId && <DiscussionDetail id={selId} onClose={() => setSelId(null)} onChanged={reload} />}
        </div>
      </div>
    </>
  )
}
