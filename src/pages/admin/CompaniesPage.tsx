import { useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDate, fmtNum } from '../../features/admin/lib/format'
import { accountStatus } from '../../features/admin/lib/labels'
import { useAppSelector } from '../../app/store/hooks'
import type { AccountStatus } from '../../features/admin/model/types'
import { ModerationReasonModal } from '../../features/admin/ui/ModerationReasonModal'
import { ACCOUNT_BLOCK_REASONS } from '../../features/admin/lib/moderationReasons'

const PAGE_SIZE = 12

export function CompaniesPage() {
  const isAdmin = useAppSelector((st) => st.admin.role === 'admin')
  const [searchRaw, setSearchRaw] = useState('')
  const [status, setStatus] = useState<AccountStatus | ''>('')
  const [page, setPage] = useState(0)
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const search = useDebounced(searchRaw, 300)

  const { data, loading, error, reload } = useAsync(
    () => adminApi.companies({ search, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, status, page],
  )

  // Издатели обновлений платформы (admin only; не-админу вернётся пустой список).
  const { data: publisherIds, reload: reloadPublishers } = useAsync(() => adminApi.publisherIds(), [])

  const togglePublisher = async (id: string, has: boolean) => {
    if (has && !confirm('Снять роль издателя обновлений с компании?')) return
    await adminApi.setPublisher(id, !has)
    reloadPublishers()
  }

  const setStatusFor = async (id: string, next: AccountStatus) => {
    await adminApi.setAccountStatus(id, next)
    reload()
  }
  const confirmBlock = async (reason: string, message: string) => {
    if (!blockTarget) return
    setBusy(true)
    try {
      await adminApi.setAccountStatus(blockTarget.id, 'blocked', reason, message)
      setBlockTarget(null)
      reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AdminTopbar title="Компании" crumbs="Главная / Компании" />
      <div className={s.content}>
        <div className={s.tableCard}>
          <div className={s.toolbar}>
            <div className={s.search}>
              <Ic.search />
              <input
                placeholder="Поиск по названию…"
                value={searchRaw}
                onChange={(e) => {
                  setSearchRaw(e.target.value)
                  setPage(0)
                }}
              />
            </div>
            <select
              className={s.select}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as AccountStatus | '')
                setPage(0)
              }}
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
              <option value="deleted">Удалённые</option>
            </select>
          </div>

          {error && <div className={s.error} style={{ margin: 16 }}>{error}</div>}

          <table className={s.table}>
            <thead>
              <tr>
                <th>Компания</th>
                <th>Основатель</th>
                <th>Вакансий</th>
                <th>Подписчиков</th>
                <th>Регистрация</th>
                <th>Статус</th>
                <th />
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
              {!loading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={s.empty}>
                    Ничего не найдено
                  </td>
                </tr>
              )}
              {data?.rows.map((c) => {
                const st = accountStatus[c.status]
                const isPublisher = (publisherIds ?? []).includes(c.id)
                return (
                  <tr key={c.id}>
                    <td>
                      <div className={s.entity}>
                        <Avatar src={c.logo} name={c.name} square />
                        <div style={{ minWidth: 0 }}>
                          <div className={s.entityName}>{c.name}</div>
                          {c.industry && <div className={s.entitySub}>{c.industry}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={s.cellMuted}>{c.founder || '—'}</td>
                    <td>{fmtNum(c.vacancyCount)}</td>
                    <td>{fmtNum(c.followerCount)}</td>
                    <td className={s.cellMuted}>{fmtDate(c.createdAt)}</td>
                    <td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        {isAdmin ? (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${isPublisher ? s.btnSuccess : ''}`}
                            title={
                              isPublisher
                                ? 'Издатель обновлений платформы — нажмите, чтобы снять роль'
                                : 'Сделать издателем обновлений (статьи «Update»)'
                            }
                            onClick={() => togglePublisher(c.id, isPublisher)}
                          >
                            <Ic.post />
                          </button>
                        ) : null}
                        <button
                          className={`${s.btn} ${s.btnIcon}`}
                          title="Открыть страницу"
                          onClick={() => window.open(`/u/${c.id}`, '_blank')}
                        >
                          <Ic.eye />
                        </button>
                        {c.status === 'active' ? (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnDanger}`}
                            title="Заблокировать"
                            onClick={() => setBlockTarget({ id: c.id, name: c.name })}
                          >
                            <Ic.ban />
                          </button>
                        ) : (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnSuccess}`}
                            title="Разблокировать"
                            onClick={() => setStatusFor(c.id, 'active')}
                          >
                            <Ic.restore />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
        </div>
      </div>

      {blockTarget && (
        <ModerationReasonModal
          title="Блокировка компании"
          subtitle={blockTarget.name}
          confirmLabel="Заблокировать"
          reasons={ACCOUNT_BLOCK_REASONS}
          busy={busy}
          onCancel={() => setBlockTarget(null)}
          onConfirm={confirmBlock}
        />
      )}
    </>
  )
}
