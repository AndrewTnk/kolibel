import { useState } from 'react'
import s from '../../features/admin/ui/admin.module.css'
import { Ic } from '../../features/admin/ui/icons'
import { AdminTopbar } from '../../features/admin/ui/AdminLayout'
import { Avatar, Badge, Pager } from '../../features/admin/ui/components'
import { useAsync, useDebounced } from '../../features/admin/lib/useAsync'
import { adminApi } from '../../features/admin/lib/adminApi'
import { fmtDate, fmtNum } from '../../features/admin/lib/format'
import { vacancyModeration } from '../../features/admin/lib/labels'
import type { VacancyModeration } from '../../features/admin/model/types'
import { ModerationReasonModal } from '../../features/admin/ui/ModerationReasonModal'
import { VACANCY_REMOVE_REASONS } from '../../features/admin/lib/moderationReasons'

const PAGE_SIZE = 12

export function VacanciesPage() {
  const [searchRaw, setSearchRaw] = useState('')
  const [mod, setMod] = useState<VacancyModeration | ''>('')
  const [page, setPage] = useState(0)
  const [delTarget, setDelTarget] = useState<{ id: string; title: string; company: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const search = useDebounced(searchRaw, 300)

  const { data, loading, error, reload } = useAsync(
    () => adminApi.vacancies({ search, moderation: mod, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, mod, page],
  )

  // Скрыть/показать/восстановить — без причины (мягкое переключение видимости).
  const setMode = async (id: string, next: VacancyModeration) => {
    await adminApi.setVacancyModeration(id, next)
    reload()
  }
  // Удаление — через модалку причины + уведомление компании.
  const confirmDelete = async (reason: string, message: string) => {
    if (!delTarget) return
    setBusy(true)
    try {
      await adminApi.removeContent('vacancy', delTarget.id, reason, message)
      setDelTarget(null)
      reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AdminTopbar title="Вакансии" crumbs="Главная / Вакансии" />
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
              value={mod}
              onChange={(e) => {
                setMod(e.target.value as VacancyModeration | '')
                setPage(0)
              }}
            >
              <option value="">Все</option>
              <option value="visible">Активные</option>
              <option value="hidden">Скрытые</option>
              <option value="removed">Удалённые</option>
            </select>
          </div>

          {error && <div className={s.error} style={{ margin: 16 }}>{error}</div>}

          <table className={s.table}>
            <thead>
              <tr>
                <th>Вакансия</th>
                <th>Компания</th>
                <th>Откликов</th>
                <th>Публикация</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className={s.empty}>
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={s.empty}>
                    Ничего не найдено
                  </td>
                </tr>
              )}
              {data?.rows.map((v) => {
                const st = vacancyModeration[v.moderation]
                return (
                  <tr key={v.id}>
                    <td>
                      <div className={s.entityName} style={{ maxWidth: 280 }}>
                        {v.title}
                      </div>
                    </td>
                    <td>
                      <div className={s.entity}>
                        <Avatar src={v.companyLogo} name={v.company} square size={28} />
                        <span style={{ fontSize: 13.5 }}>{v.company}</span>
                      </div>
                    </td>
                    <td>{fmtNum(v.applicationCount)}</td>
                    <td className={s.cellMuted}>{fmtDate(v.createdAt)}</td>
                    <td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        {v.moderation === 'visible' ? (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnWarn}`}
                            title="Скрыть"
                            onClick={() => setMode(v.id, 'hidden')}
                          >
                            <Ic.eyeOff />
                          </button>
                        ) : (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnSuccess}`}
                            title="Сделать видимой"
                            onClick={() => setMode(v.id, 'visible')}
                          >
                            <Ic.eye />
                          </button>
                        )}
                        {v.moderation === 'removed' ? (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnSuccess}`}
                            title="Восстановить"
                            onClick={() => setMode(v.id, 'visible')}
                          >
                            <Ic.restore />
                          </button>
                        ) : (
                          <button
                            className={`${s.btn} ${s.btnIcon} ${s.btnDanger}`}
                            title="Удалить"
                            onClick={() => setDelTarget({ id: v.id, title: v.title, company: v.company })}
                          >
                            <Ic.trash />
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

      {delTarget && (
        <ModerationReasonModal
          title="Удаление вакансии"
          subtitle={`${delTarget.title} · ${delTarget.company}`}
          confirmLabel="Удалить"
          reasons={VACANCY_REMOVE_REASONS}
          busy={busy}
          onCancel={() => setDelTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}
