import { useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDate, fmtRelative } from '../../features/admin/lib/format'
import { accountStatus } from '../../features/admin/lib/labels'
import { useAppSelector } from '../../app/store/hooks'
import type { AccountStatus } from '../../features/admin/model/types'

const PAGE_SIZE = 12

export function UsersPage() {
  const isAdmin = useAppSelector((st) => st.admin.role === 'admin')
  const [searchRaw, setSearchRaw] = useState('')
  const [status, setStatus] = useState<AccountStatus | ''>('')
  const [page, setPage] = useState(0)
  const search = useDebounced(searchRaw, 300)

  const { data, loading, error, reload } = useAsync(
    () => adminApi.users({ search, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, status, page],
  )

  const onSearch = (v: string) => {
    setSearchRaw(v)
    setPage(0)
  }
  const onStatus = (v: AccountStatus | '') => {
    setStatus(v)
    setPage(0)
  }

  const setUserStatus = async (id: string, next: AccountStatus) => {
    await adminApi.setAccountStatus(id, next)
    reload()
  }
  const toggleRole = async (id: string, hasRole: boolean) => {
    if (hasRole) {
      if (!confirm('Снять роль модератора с пользователя?')) return
      await adminApi.revokeRole(id)
    } else {
      await adminApi.grantRole(id, 'moderator')
    }
    reload()
  }

  return (
    <>
      <AdminTopbar title="Пользователи" crumbs="Главная / Пользователи" />
      <div className={s.content}>
        <div className={s.tableCard}>
          <div className={s.toolbar}>
            <div className={s.search}>
              <Ic.search />
              <input
                placeholder="Поиск по имени или email…"
                value={searchRaw}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <select className={s.select} value={status} onChange={(e) => onStatus(e.target.value as AccountStatus | '')}>
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
                <th>Пользователь</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Регистрация</th>
                <th>Активность</th>
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
              {data?.rows.map((u) => {
                const st = accountStatus[u.status]
                return (
                  <tr key={u.id}>
                    <td>
                      <div className={s.entity}>
                        <Avatar src={u.avatar} name={u.name} />
                        <div style={{ minWidth: 0 }}>
                          <div className={s.entityName}>{u.name}</div>
                          {u.jobTitle && <div className={s.entitySub}>{u.jobTitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={s.cellMuted}>{u.email}</td>
                    <td>
                      {u.role === 'admin' ? (
                        <Badge tone="red">Admin</Badge>
                      ) : u.role === 'moderator' ? (
                        <Badge tone="blue">Модератор</Badge>
                      ) : (
                        <span className={s.cellMuted}>—</span>
                      )}
                    </td>
                    <td className={s.cellMuted}>{fmtDate(u.createdAt)}</td>
                    <td className={s.cellMuted}>{u.lastSeen ? fmtRelative(u.lastSeen) : '—'}</td>
                    <td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        <button
                          className={`${s.btn} ${s.btnIcon}`}
                          title="Открыть профиль"
                          onClick={() => window.open(`/u/${u.id}`, '_blank')}
                        >
                          <Ic.eye />
                        </button>
                        {isAdmin && u.role !== 'admin' && (
                          <button
                            className={`${s.btn} ${s.btnIcon}`}
                            title={u.role === 'moderator' ? 'Снять модератора' : 'Назначить модератором'}
                            onClick={() => toggleRole(u.id, u.role === 'moderator')}
                          >
                            <Ic.shield />
                          </button>
                        )}
                        {u.status === 'active' ? (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnDanger}`}
                            title="Заблокировать"
                            onClick={() => confirm(`Заблокировать «${u.name}»?`) && setUserStatus(u.id, 'blocked')}
                          >
                            <Ic.ban />
                          </button>
                        ) : (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnSuccess}`}
                            title="Разблокировать"
                            onClick={() => setUserStatus(u.id, 'active')}
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
    </>
  )
}
