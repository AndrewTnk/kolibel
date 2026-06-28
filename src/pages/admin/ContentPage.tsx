import { useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDate, fmtNum } from '../../features/admin/lib/format'

const PAGE_SIZE = 12
type Tab = 'posts' | 'comments'

function PostsTable() {
  const [searchRaw, setSearchRaw] = useState('')
  const [page, setPage] = useState(0)
  const search = useDebounced(searchRaw, 300)
  const { data, loading, error, reload } = useAsync(
    () => adminApi.posts({ search, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, page],
  )
  const toggle = async (id: string, removed: boolean) => {
    if (!removed && !confirm('Удалить публикацию?')) return
    await adminApi.setPostRemoved(id, !removed)
    reload()
  }
  return (
    <div className={s.tableCard}>
      <div className={s.toolbar}>
        <div className={s.search}>
          <Ic.search />
          <input
            placeholder="Поиск по автору…"
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
            <th>Автор</th>
            <th>Текст</th>
            <th>Лайки</th>
            <th>Комм.</th>
            <th>Дата</th>
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
                Публикаций нет
              </td>
            </tr>
          )}
          {data?.rows.map((p) => (
            <tr key={p.id}>
              <td>
                <div className={s.entity}>
                  <Avatar src={p.authorAvatar} name={p.authorName} square={p.authorKind === 'company'} size={30} />
                  <span style={{ fontSize: 13.5 }}>{p.authorName}</span>
                </div>
              </td>
              <td>
                <div className={s.entitySub} style={{ maxWidth: 360, whiteSpace: 'normal' }}>
                  {p.excerpt || <span className={s.cellMuted}>(без текста)</span>}
                </div>
              </td>
              <td>{fmtNum(p.likeCount)}</td>
              <td>{fmtNum(p.commentCount)}</td>
              <td className={s.cellMuted}>{fmtDate(p.createdAt)}</td>
              <td>{p.removed ? <Badge tone="red">Удалён</Badge> : <Badge tone="green">Опубликован</Badge>}</td>
              <td>
                <div className={s.rowActions}>
                  {p.removed ? (
                    <button className={`${s.btn} ${s.btnIcon} ${s.btnSuccess}`} title="Восстановить" onClick={() => toggle(p.id, true)}>
                      <Ic.restore />
                    </button>
                  ) : (
                    <button className={`${s.btn} ${s.btnIcon} ${s.btnDanger}`} title="Удалить" onClick={() => toggle(p.id, false)}>
                      <Ic.trash />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
    </div>
  )
}

function CommentsTable() {
  const [searchRaw, setSearchRaw] = useState('')
  const [page, setPage] = useState(0)
  const search = useDebounced(searchRaw, 300)
  const { data, loading, error, reload } = useAsync(
    () => adminApi.comments({ search, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, page],
  )
  const toggle = async (id: string, removed: boolean) => {
    if (!removed && !confirm('Удалить комментарий?')) return
    await adminApi.setCommentRemoved(id, !removed)
    reload()
  }
  return (
    <div className={s.tableCard}>
      <div className={s.toolbar}>
        <div className={s.search}>
          <Ic.search />
          <input
            placeholder="Поиск по автору или тексту…"
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
            <th>Автор</th>
            <th>Комментарий</th>
            <th>Дата</th>
            <th>Статус</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className={s.empty}>
                Загрузка…
              </td>
            </tr>
          )}
          {!loading && data?.rows.length === 0 && (
            <tr>
              <td colSpan={5} className={s.empty}>
                Комментариев нет
              </td>
            </tr>
          )}
          {data?.rows.map((c) => (
            <tr key={c.id}>
              <td>
                <div className={s.entity}>
                  <Avatar src={c.authorAvatar} name={c.authorName} size={30} />
                  <span style={{ fontSize: 13.5 }}>{c.authorName}</span>
                </div>
              </td>
              <td>
                <div className={s.entitySub} style={{ maxWidth: 420, whiteSpace: 'normal' }}>
                  {c.content}
                </div>
              </td>
              <td className={s.cellMuted}>{fmtDate(c.createdAt)}</td>
              <td>{c.removed ? <Badge tone="red">Удалён</Badge> : <Badge tone="green">Виден</Badge>}</td>
              <td>
                <div className={s.rowActions}>
                  {c.removed ? (
                    <button className={`${s.btn} ${s.btnIcon} ${s.btnSuccess}`} title="Восстановить" onClick={() => toggle(c.id, true)}>
                      <Ic.restore />
                    </button>
                  ) : (
                    <button className={`${s.btn} ${s.btnIcon} ${s.btnDanger}`} title="Удалить" onClick={() => toggle(c.id, false)}>
                      <Ic.trash />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
    </div>
  )
}

export function ContentPage() {
  const [tab, setTab] = useState<Tab>('posts')
  return (
    <>
      <AdminTopbar title="Модерация контента" crumbs="Главная / Публикации" />
      <div className={s.content}>
        <div className={s.tabs}>
          <button className={`${s.tab} ${tab === 'posts' ? s.tabActive : ''}`} onClick={() => setTab('posts')}>
            Публикации
          </button>
          <button className={`${s.tab} ${tab === 'comments' ? s.tabActive : ''}`} onClick={() => setTab('comments')}>
            Комментарии
          </button>
        </div>
        {tab === 'posts' ? <PostsTable /> : <CommentsTable />}
      </div>
    </>
  )
}
