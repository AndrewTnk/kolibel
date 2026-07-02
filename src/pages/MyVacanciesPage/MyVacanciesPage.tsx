import { useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { loadVacancies, updateVacancyStatus } from '../../features/vacancies/model/vacancyThunks'
import { vacanciesActions } from '../../features/vacancies/model/vacanciesSlice'
import {
  fetchOwnerApplications,
  markApplicationViewed,
  updateApplicationStatus,
} from '../../features/vacancies/lib/applicationsApi'
import { fetchFolders, createFolder, setFolderItem } from '../../features/vacancies/lib/foldersApi'
import { fetchSavedCandidates, setSavedCandidate } from '../../features/vacancies/lib/savedCandidates'
import { applicantToMatchProfile, computeMatch } from '../../features/vacancies/lib/useVacancyMatch'
import { buildRejectReply } from '../../features/vacancies/lib/rejectReplies'
import { loadConversations, sendMessage, startConversation } from '../../features/chat/model/chatThunks'
import type {
  Applicant,
  Vacancy,
  VacancyFolder,
  VacancyStatus,
} from '../../features/vacancies/model/types'
import { CreateVacancyModal } from '../../features/vacancies/ui/CreateVacancyModal'
import { RejectModal } from '../../features/vacancies/ui/RejectModal/RejectModal'
import {
  CreateFolderModal,
  AssignFolderModal,
} from '../../features/vacancies/ui/FolderModals/FolderModals'
import {
  CandidateProfileModal,
  applicantToCandidate,
  type CandidateProfile,
} from '../../features/vacancies/ui/CandidateProfileModal/CandidateProfileModal'
import { CandidateWarmthBadge } from '../../features/vacancies/ui/CandidateWarmthBadge/CandidateWarmthBadge'
import { WriteModal } from '../../features/company/ui/WriteModal/WriteModal'
import { RecommendedCandidates } from '../../widgets/RecommendedCandidates/RecommendedCandidates'
import { formatPosted, formatSalary, workFormatLabels } from '../../features/vacancies/lib/labels'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import { CompanyBadge } from '../../shared/ui/CompanyBadge/CompanyBadge'
import { Icon } from './icons'
import styles from './MyVacanciesPage.module.css'

// Воронку убрали. Статус отклика теперь автоматический:
//   rejected — отклонён (через модалку отказа), viewed — компания открыла, new — ещё нет.
type AppState = 'new' | 'viewed' | 'rejected'
const APP_STATE_LABEL: Record<AppState, string> = {
  new: 'Новый',
  viewed: 'Просмотрен',
  rejected: 'Отклонён',
}
function appState(a: Applicant): AppState {
  if (a.status === 'rejected') return 'rejected'
  return a.viewedAt ? 'viewed' : 'new'
}

function vacCounts(applicants: Applicant[]) {
  let rejected = 0
  let fresh = 0 // новые = ещё не просмотрены и не отклонены
  for (const a of applicants) {
    const st = appState(a)
    if (st === 'rejected') rejected++
    else if (st === 'new') fresh++
  }
  const total = applicants.length
  return { total, new: fresh, rejected, active: total - rejected }
}

const STATUS_FILTERS: [VacancyStatus | 'all', string, () => React.ReactElement][] = [
  ['all', 'Все', Icon.grid],
  ['active', 'Активные', Icon.play],
  ['paused', 'Пауза', Icon.pause],
  ['draft', 'Черновики', Icon.edit],
  ['closed', 'Закрытые', Icon.xCircle],
]
const STATUS_LABEL: Record<VacancyStatus, string> = {
  active: 'Активна',
  paused: 'На паузе',
  draft: 'Черновик',
  closed: 'Закрыта',
}

function daysAgo(ts: number) {
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000))
}

type ModalState =
  | { kind: 'publish'; vacancy?: Vacancy }
  | { kind: 'reject'; applicationId: string; name: string; vacId: string }
  | { kind: 'createFolder' }
  | { kind: 'assign'; vacancy: Vacancy }
  | { kind: 'profile'; candidate: CandidateProfile; applicationId: string; name: string; vacId: string }
  | { kind: 'write'; userId: string; name: string }
  | null

export function MyVacanciesPage() {
  const dispatch = useAppDispatch()
  const allItems = useAppSelector((s) => s.vacanciesList.items)
  const vacLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const createVacancyOpen = useAppSelector((s) => s.vacancies.createVacancyOpen)
  const foldersModalOpen = useAppSelector((s) => s.vacancies.foldersModalOpen)

  const [statusFilter, setStatusFilter] = useState<VacancyStatus | 'all'>('all')
  const [activeFolder, setActiveFolder] = useState<string>('all')
  const [folders, setFolders] = useState<VacancyFolder[]>([])
  const [applicantsByVacancy, setApplicantsByVacancy] = useState<Record<string, Applicant[]>>({})
  const [appsLoading, setAppsLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  // Фильтр кандидатов в правом сайдбаре открытой вакансии.
  const [candFilter, setCandFilter] = useState<'all' | 'favorite' | 'rejected'>('all')
  // Сортировка откликов: по мэтчу (по умолчанию) или по дате отклика.
  const [sortBy, setSortBy] = useState<'match' | 'date'>('match')
  // Избранные кандидаты — множество profile_id (серверный шорт-лист, приватно).
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const myVacancies = useMemo(
    () => allItems.filter((v) => v.companyId && v.companyId === myId),
    [allItems, myId],
  )

  useEffect(() => {
    void dispatch(loadVacancies())
    fetchOwnerApplications()
      .then(setApplicantsByVacancy)
      .catch(() => setApplicantsByVacancy({}))
      .finally(() => setAppsLoading(false))
    fetchFolders()
      .then(setFolders)
      .catch(() => setFolders([]))
    fetchSavedCandidates()
      .then(setFavorites)
      .catch(() => setFavorites(new Set()))
  }, [dispatch])

  // Открытие модалки публикации из хедера (мобилка): сбрасываем флаг и открываем модалку.
  useEffect(() => {
    if (!createVacancyOpen) return
    setModal({ kind: 'publish' })
    dispatch(vacanciesActions.closeCreateVacancy())
  }, [createVacancyOpen, dispatch])

  // Сбрасываем UI-флаги хедера при уходе со страницы.
  useEffect(
    () => () => {
      dispatch(vacanciesActions.closeFoldersModal())
      dispatch(vacanciesActions.closeCreateVacancy())
    },
    [dispatch],
  )

  function showToast(m: string) {
    setToast(m)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  const applicantsOf = (id: string) => applicantsByVacancy[id] ?? []
  const statusOf = (v: Vacancy): VacancyStatus => v.status ?? 'active'
  const foldersOf = (vacId: string) => folders.filter((f) => f.vacIds.includes(vacId))

  const activeFolderObj = activeFolder === 'all' ? null : folders.find((f) => f.id === activeFolder)

  const visibleVacancies = useMemo(
    () =>
      myVacancies.filter((v) => {
        if (statusFilter !== 'all' && statusOf(v) !== statusFilter) return false
        if (activeFolderObj && !activeFolderObj.vacIds.includes(v.id)) return false
        return true
      }),
    [myVacancies, statusFilter, activeFolderObj],
  )

  const stats = useMemo(() => {
    let activeVac = 0
    let newApplies = 0
    for (const v of myVacancies) {
      if (statusOf(v) === 'active') activeVac++
      for (const a of applicantsOf(v.id)) if (appState(a) === 'new') newApplies++
    }
    return { activeVac, newApplies }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myVacancies, applicantsByVacancy])

  const detailVac = detailId ? myVacancies.find((v) => v.id === detailId) ?? null : null
  const detailApplicants = detailVac ? applicantsOf(detailVac.id) : []
  const candCounts = {
    all: detailApplicants.length,
    favorite: detailApplicants.filter((a) => favorites.has(a.userId)).length,
    rejected: detailApplicants.filter((a) => a.status === 'rejected').length,
  }
  const filteredApplicants =
    candFilter === 'favorite'
      ? detailApplicants.filter((a) => favorites.has(a.userId))
      : candFilter === 'rejected'
        ? detailApplicants.filter((a) => a.status === 'rejected')
        : detailApplicants
  // По мэтчу — лучший кандидат сверху; по дате — как пришло из БД (created_at desc).
  const shownApplicants =
    sortBy === 'match' && detailVac
      ? [...filteredApplicants].sort(
          (a, b) =>
            (computeMatch(detailVac, applicantToMatchProfile(b)).score ?? -1) -
            (computeMatch(detailVac, applicantToMatchProfile(a)).score ?? -1),
        )
      : filteredApplicants

  function selectVac(v: Vacancy) {
    if (statusOf(v) === 'draft') {
      setModal({ kind: 'publish', vacancy: v })
      return
    }
    setDetailId(v.id)
    setCandFilter('all')
    window.scrollTo({ top: 0 })
  }
  function backToList() {
    setDetailId(null)
  }

  // Выбор папки из полноэкранной модалки (мобилка): фильтруем список и возвращаемся к нему.
  function pickFolder(id: string) {
    setActiveFolder(id)
    setDetailId(null)
    dispatch(vacanciesActions.closeFoldersModal())
  }

  // Ключ избранного — profile_id кандидата (звёздочка относится к человеку).
  function toggleFavorite(candidateId: string) {
    const present = !favorites.has(candidateId)
    setFavorites((prev) => {
      const next = new Set(prev)
      if (present) next.add(candidateId)
      else next.delete(candidateId)
      return next
    })
    void setSavedCandidate(candidateId, present).catch(() => {
      fetchSavedCandidates().then(setFavorites).catch(() => {})
    })
  }

  // ── Оптимистичные мутации ──────────────────────────
  function patchApplicant(appId: string, patch: Partial<Applicant>) {
    setApplicantsByVacancy((prev) => {
      const next: Record<string, Applicant[]> = {}
      for (const [vid, list] of Object.entries(prev)) {
        next[vid] = list.map((a) => (a.id === appId ? { ...a, ...patch } : a))
      }
      return next
    })
  }

  // Отметить отклик просмотренным при открытии профиля кандидата (авто-статус «просмотрен»).
  function markViewed(a: Applicant) {
    if (a.viewedAt) return
    patchApplicant(a.id, { viewedAt: Date.now() })
    void markApplicationViewed(a.id).catch(() => {
      fetchOwnerApplications().then(setApplicantsByVacancy).catch(() => {})
    })
  }

  async function confirmReject(
    m: { applicationId: string; name: string; vacId: string },
    reason: string,
    notify: boolean,
  ) {
    const appId = m.applicationId
    const applicant = (applicantsByVacancy[m.vacId] ?? []).find((a) => a.id === appId)
    const willNotify = notify && !!applicant?.userId
    patchApplicant(appId, { status: 'rejected' })
    setModal(null)
    showToast(willNotify ? 'Кандидат отклонён · автоответ отправлен в чат' : 'Кандидат отклонён')
    try {
      await updateApplicationStatus(appId, 'rejected')
    } catch {
      fetchOwnerApplications().then(setApplicantsByVacancy).catch(() => {})
      return
    }
    // Вежливый автоответ в чат кандидату (→ уведомление через триггер БД на новое сообщение).
    if (willNotify && applicant) {
      const vacTitle = allItems.find((v) => v.id === m.vacId)?.title ?? 'вакансия'
      const firstName = (applicant.name || m.name).split(' ')[0]
      const text = buildRejectReply(reason, vacTitle, firstName)
      try {
        const res = await dispatch(startConversation(applicant.userId))
        if (startConversation.fulfilled.match(res) && res.payload) {
          await dispatch(sendMessage({ conversationId: res.payload, text }))
          // Перезагружаем список бесед — гарантируем, что новая беседа с
          // сообщением попадёт в чат компании (а не отсеется как пустая).
          await dispatch(loadConversations())
        }
      } catch {
        /* отказ уже проставлен; автоответ — best-effort */
      }
    }
  }

  async function toggleStatus(v: Vacancy) {
    const next: VacancyStatus = statusOf(v) === 'active' ? 'paused' : 'active'
    await dispatch(updateVacancyStatus({ id: v.id, status: next }))
    showToast(next === 'paused' ? 'Вакансия на паузе' : 'Вакансия снова активна')
  }

  async function closeVacancy(v: Vacancy) {
    if (
      !window.confirm(
        `Закрыть вакансию «${v.title}»? Она перестанет показываться соискателям и останется только в разделе «Закрытые».`,
      )
    )
      return
    await dispatch(updateVacancyStatus({ id: v.id, status: 'closed' }))
    showToast('Вакансия закрыта')
  }

  async function reopenVacancy(v: Vacancy) {
    await dispatch(updateVacancyStatus({ id: v.id, status: 'active' }))
    showToast('Вакансия снова активна')
  }

  async function onCreateFolder(input: { name: string; color: string; vacIds: string[] }) {
    setModal(null)
    try {
      const folder = await createFolder(input)
      setFolders((fs) => [...fs, folder])
      showToast(`Папка «${folder.name}» создана`)
    } catch {
      showToast('Не удалось создать папку')
    }
  }

  async function toggleFolderItem(folderId: string, vacId: string, present: boolean) {
    setFolders((fs) =>
      fs.map((f) =>
        f.id === folderId
          ? {
              ...f,
              vacIds: present ? [...f.vacIds, vacId] : f.vacIds.filter((x) => x !== vacId),
            }
          : f,
      ),
    )
    try {
      await setFolderItem(folderId, vacId, present)
    } catch {
      fetchFolders().then(setFolders).catch(() => {})
    }
  }

  const loading = !vacLoaded || appsLoading
  const folderCount = (f: VacancyFolder) => f.vacIds.filter((id) => myVacancies.some((v) => v.id === id)).length

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.pageTop}>
            <div>
              <h1 className={styles.pageTitle}>Мои вакансии</h1>
              <div className={styles.pageSub}>
                {stats.activeVac} активных · {stats.newApplies} новых откликов ждут ответа
              </div>
            </div>
            <button type="button" className={styles.publishBtn} onClick={() => setModal({ kind: 'publish' })}>
              <Icon.plus /> Опубликовать вакансию
            </button>
          </div>

          <div className={styles.layout}>
            <div className={styles.center}>
              {!detailId ? (
                <div className={styles.listToolbar}>
                  <span className={styles.lbl}>Статус:</span>
                  {STATUS_FILTERS.map(([k, l, Ico]) => (
                    <button
                      key={k}
                      type="button"
                      className={[styles.statusPill, statusFilter === k ? styles.statusOn : ''].filter(Boolean).join(' ')}
                      onClick={() => setStatusFilter(k)}
                      title={l}
                      aria-label={l}
                    >
                      <span className={styles.statusIco} aria-hidden><Ico /></span>
                      <span className={styles.statusText}>{l}</span>
                    </button>
                  ))}
                  {activeFolderObj ? (
                    <button
                      type="button"
                      className={[styles.statusPill, styles.statusOn, styles.folderPill].join(' ')}
                      onClick={() => setActiveFolder('all')}
                    >
                      <Icon.folder /> {activeFolderObj.name} ✕
                    </button>
                  ) : null}
                </div>
              ) : null}

              {loading ? (
                <div className={styles.vacList}>
                  <BlockSkeleton height={210} />
                  <BlockSkeleton height={210} />
                </div>
              ) : detailVac ? (
                <DetailPane
                  v={detailVac}
                  applicants={shownApplicants}
                  totalCount={detailApplicants.length}
                  newCount={detailApplicants.filter((a) => appState(a) === 'new').length}
                  favorites={favorites}
                  onToggleFav={toggleFavorite}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onBack={backToList}
                  onEdit={() => setModal({ kind: 'publish', vacancy: detailVac })}
                  onOpenProfile={(a) => {
                    markViewed(a)
                    const m = computeMatch(detailVac, applicantToMatchProfile(a))
                    setModal({
                      kind: 'profile',
                      candidate: applicantToCandidate(a, {
                        score: m.score,
                        matchedSkills: m.matchedSkills,
                        appliedFor: detailVac.title,
                      }),
                      applicationId: a.id,
                      name: a.name,
                      vacId: detailVac.id,
                    })
                  }}
                  onWrite={(a) => setModal({ kind: 'write', userId: a.userId, name: a.name })}
                  onReject={(a) =>
                    setModal({ kind: 'reject', applicationId: a.id, name: a.name, vacId: detailVac.id })
                  }
                />
              ) : (
                <div className={styles.vacList}>
                  {visibleVacancies.length === 0 ? (
                    <div className={styles.empty}>Нет вакансий по этому фильтру.</div>
                  ) : null}
                  {visibleVacancies.map((v) => (
                    <MyVacCard
                      key={v.id}
                      v={v}
                      status={statusOf(v)}
                      applicants={applicantsOf(v.id)}
                      folders={foldersOf(v.id)}
                      selected={false}
                      onSelect={() => selectVac(v)}
                      onEdit={() => setModal({ kind: 'publish', vacancy: v })}
                      onAssignFolder={() => setModal({ kind: 'assign', vacancy: v })}
                      onToggleStatus={() => toggleStatus(v)}
                      onCloseVacancy={() => closeVacancy(v)}
                      onReopen={() => reopenVacancy(v)}
                      onPromote={() => showToast('Вакансия поднята в выдаче')}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className={[styles.sidebar, 'hideOnMobile'].join(' ')} aria-label="Папки и кандидаты">
              {detailVac ? (
                /* Открыта вакансия → сайдбар = фильтр кандидатов (без создания). */
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Кандидаты</div>
                  <div className={styles.folderList}>
                    {(
                      [
                        ['all', 'Все', '#9ca3af'],
                        ['favorite', 'Избранные', '#f59e0b'],
                        ['rejected', 'Отказ', '#ef4444'],
                      ] as const
                    ).map(([key, label, color]) => (
                      <button
                        key={key}
                        type="button"
                        className={[styles.folderItem, candFilter === key ? styles.folderOn : ''].filter(Boolean).join(' ')}
                        onClick={() => setCandFilter(key)}
                      >
                        <span className={styles.fIco} style={{ background: color }}>
                          {key === 'favorite' ? <Icon.star /> : key === 'rejected' ? <Icon.xCircle /> : <Icon.user />}
                        </span>
                        <span className={styles.fName}>{label}</span>
                        <span className={styles.fCount}>{candCounts[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Папки</div>
                  <div className={styles.folderList}>
                    <button
                      type="button"
                      className={[styles.folderItem, activeFolder === 'all' ? styles.folderOn : ''].filter(Boolean).join(' ')}
                      onClick={() => setActiveFolder('all')}
                    >
                      <span className={styles.fIco} style={{ background: '#9ca3af' }}><Icon.folder /></span>
                      <span className={styles.fName}>Все вакансии</span>
                      <span className={styles.fCount}>{myVacancies.length}</span>
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={[styles.folderItem, activeFolder === f.id ? styles.folderOn : ''].filter(Boolean).join(' ')}
                        onClick={() => setActiveFolder(f.id)}
                      >
                        <span className={styles.fIco} style={{ background: f.color }}><Icon.folder /></span>
                        <span className={styles.fName}>{f.name}</span>
                        <span className={styles.fCount}>{folderCount(f)}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className={styles.addFolderBtn} onClick={() => setModal({ kind: 'createFolder' })}>
                    <Icon.folderPlus /> Новая папка
                  </button>
                </div>
              )}

              <RecommendedCandidates />
            </aside>
          </div>
        </div>
      </main>

      {modal?.kind === 'publish' ? (
        <CreateVacancyModal vacancy={modal.vacancy} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === 'reject' ? (
        <RejectModal
          name={modal.name}
          onConfirm={(reason, notify) => confirmReject(modal, reason, notify)}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'createFolder' ? (
        <CreateFolderModal
          vacancies={myVacancies
            .filter((v) => statusOf(v) !== 'closed')
            .map((v) => ({ id: v.id, title: v.title, sub: v.workFormats.map((f) => workFormatLabels[f]).join('/') }))}
          onCreate={onCreateFolder}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'assign' ? (
        <AssignFolderModal
          vacancyTitle={modal.vacancy.title}
          vacancyId={modal.vacancy.id}
          folders={folders}
          onToggle={(folderId, present) => toggleFolderItem(folderId, modal.vacancy.id, present)}
          onNew={() => setModal({ kind: 'createFolder' })}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'profile' ? (
        <CandidateProfileModal
          candidate={modal.candidate}
          onWrite={(c) => setModal({ kind: 'write', userId: c.userId, name: c.name })}
          onReject={() =>
            setModal({ kind: 'reject', applicationId: modal.applicationId, name: modal.name, vacId: modal.vacId })
          }
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'write' ? (
        <WriteModal userId={modal.userId} name={modal.name} onClose={() => setModal(null)} />
      ) : null}

      {foldersModalOpen ? (
        <div
          className={styles.fmOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Папки"
          onClick={() => dispatch(vacanciesActions.closeFoldersModal())}
        >
          <div className={styles.fmPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fmHead}>
              <div className={styles.fmTitle}>Папки</div>
              <button
                type="button"
                className={styles.fmClose}
                aria-label="Закрыть"
                onClick={() => dispatch(vacanciesActions.closeFoldersModal())}
              >
                ✕
              </button>
            </div>
            <div className={styles.fmBody}>
              <div className={styles.folderList}>
                <button
                  type="button"
                  className={[styles.folderItem, activeFolder === 'all' ? styles.folderOn : ''].filter(Boolean).join(' ')}
                  onClick={() => pickFolder('all')}
                >
                  <span className={styles.fIco} style={{ background: '#9ca3af' }}><Icon.folder /></span>
                  <span className={styles.fName}>Все вакансии</span>
                  <span className={styles.fCount}>{myVacancies.length}</span>
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={[styles.folderItem, activeFolder === f.id ? styles.folderOn : ''].filter(Boolean).join(' ')}
                    onClick={() => pickFolder(f.id)}
                  >
                    <span className={styles.fIco} style={{ background: f.color }}><Icon.folder /></span>
                    <span className={styles.fName}>{f.name}</span>
                    <span className={styles.fCount}>{folderCount(f)}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.addFolderBtn}
                onClick={() => {
                  dispatch(vacanciesActions.closeFoldersModal())
                  setModal({ kind: 'createFolder' })
                }}
              >
                <Icon.folderPlus /> Новая папка
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={styles.toast}>
          <span className={styles.toastIco}><Icon.check /></span>
          {toast}
        </div>
      ) : null}
    </div>
  )
}

// ── Карточка вакансии ──────────────────────────────
function MyVacCard({
  v,
  status,
  applicants,
  folders,
  selected,
  onSelect,
  onEdit,
  onAssignFolder,
  onToggleStatus,
  onCloseVacancy,
  onReopen,
  onPromote,
}: {
  v: Vacancy
  status: VacancyStatus
  applicants: Applicant[]
  folders: VacancyFolder[]
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onAssignFolder: () => void
  onToggleStatus: () => void
  onCloseVacancy: () => void
  onReopen: () => void
  onPromote: () => void
}) {
  const c = vacCounts(applicants)
  const conv = v.views ? `${Math.round((c.total / v.views) * 1000) / 10}%` : '—'
  const isOpen = status === 'active' || status === 'paused'
  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation()
    fn()
  }

  return (
    <article
      className={[styles.myVac, styles[status], selected ? styles.myVacSel : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect()
      }}
    >
      <div className={styles.myVacTop}>
        <div className={styles.myVacTitleWrap}>
          <h3 className={styles.myVacTitle}>{v.title}</h3>
          <div className={styles.myVacMeta}>
            {[v.city, v.workFormats.map((f) => workFormatLabels[f]).join('/'), formatSalary(v.salaryFrom, v.salaryTo, v.currency)]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {folders.length ? (
            <div className={styles.vFolderTags}>
              {folders.map((f) => (
                <span key={f.id} className={styles.vFolderTag}>
                  <span className={styles.vFolderDot} style={{ background: f.color }} />
                  {f.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <span className={[styles.vStatus, styles[`st_${status}`]].join(' ')}>
          <span className={styles.vStatusDot} />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className={styles.railCounts}>
        <span className={styles.rc}>
          <b>{c.new}</b> новых
        </span>
        <span className={styles.rc}>·</span>
        <span className={styles.rc}>{c.total} всего</span>
      </div>

      <div className={styles.vMetrics}>
        <div className={[styles.vMetric, c.new > 0 ? styles.vMetricHot : ''].filter(Boolean).join(' ')}>
          <div className={styles.vMetricN}>
            {c.total} {c.new > 0 ? <span className={styles.vMetricNew}>+{c.new}</span> : null}
          </div>
          <div className={styles.vMetricL}>откликов</div>
        </div>
        <div className={styles.vMetric}>
          <div className={styles.vMetricN}>{(v.views ?? 0).toLocaleString('ru-RU')}</div>
          <div className={styles.vMetricL}>просмотров</div>
        </div>
        <div className={styles.vMetric}>
          <div className={styles.vMetricN}>{conv}</div>
          <div className={styles.vMetricL}>в отклик</div>
        </div>
        <div className={styles.vMetric}>
          <div className={styles.vMetricN}>{c.active}</div>
          <div className={styles.vMetricL}>в работе</div>
        </div>
      </div>

      <div className={styles.vFoot}>
        <div className={styles.vFootInfo}>
          <span>{status === 'draft' ? 'Не опубликована' : `${daysAgo(v.postedAt)} дн. назад`}</span>
        </div>
        <div className={styles.vActions}>
          <button className={styles.vAct} title="Папки" onClick={(e) => stop(e, onAssignFolder)}>
            <Icon.folder />
          </button>
          <button className={styles.vAct} title="Редактировать" onClick={(e) => stop(e, onEdit)}>
            <Icon.edit />
          </button>
          {isOpen ? (
            <button
              className={styles.vAct}
              title={status === 'active' ? 'Поставить на паузу' : 'Возобновить'}
              onClick={(e) => stop(e, onToggleStatus)}
            >
              {status === 'active' ? <Icon.pause /> : <Icon.play />}
            </button>
          ) : null}
          {isOpen ? (
            <button className={styles.vAct} title="Закрыть вакансию" onClick={(e) => stop(e, onCloseVacancy)}>
              <Icon.xCircle />
            </button>
          ) : null}
          {status === 'closed' ? (
            <button className={styles.vAct} title="Возобновить вакансию" onClick={(e) => stop(e, onReopen)}>
              <Icon.play />
            </button>
          ) : null}
          {status === 'active' ? (
            <button className={styles.vAct} title="Продвинуть" onClick={(e) => stop(e, onPromote)}>
              <Icon.rocket />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// ── Панель откликов выбранной вакансии ──────────────
function DetailPane({
  v,
  applicants,
  totalCount,
  newCount,
  favorites,
  onToggleFav,
  sortBy,
  onSortChange,
  onBack,
  onEdit,
  onOpenProfile,
  onWrite,
  onReject,
}: {
  v: Vacancy
  /** Уже отфильтрованный и отсортированный список. */
  applicants: Applicant[]
  totalCount: number
  newCount: number
  favorites: Set<string>
  onToggleFav: (appId: string) => void
  sortBy: 'match' | 'date'
  onSortChange: (s: 'match' | 'date') => void
  onBack: () => void
  onEdit: () => void
  onOpenProfile: (a: Applicant) => void
  onWrite: (a: Applicant) => void
  onReject: (a: Applicant) => void
}) {
  return (
    <div>
      <div className={styles.dpHead}>
        <button type="button" className={styles.dpBack} onClick={onBack}>
          <Icon.back /> Все вакансии
        </button>
        <div className={styles.dpTitleWrap}>
          <div className={styles.dpTitle}>{v.title}</div>
          <div className={styles.dpSub}>
            {totalCount} откликов · {newCount} новых
          </div>
        </div>
        <button type="button" className={styles.dpEdit} onClick={onEdit}>
          <Icon.edit /> Вакансия
        </button>
      </div>

      <div className={styles.sortRow}>
        <span className={styles.sortLbl}>Сортировка:</span>
        {(
          [
            ['match', 'По мэтчу'],
            ['date', 'По дате'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={[styles.sortBtn, sortBy === key ? styles.sortOn : ''].filter(Boolean).join(' ')}
            onClick={() => onSortChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.appList}>
        {applicants.map((a) => (
          <ApplicantRow
            key={a.id}
            v={v}
            a={a}
            favorite={favorites.has(a.userId)}
            onToggleFav={() => onToggleFav(a.userId)}
            onOpenProfile={() => onOpenProfile(a)}
            onWrite={() => onWrite(a)}
            onReject={() => onReject(a)}
          />
        ))}
        {applicants.length === 0 ? <div className={styles.empty}>В этом списке пока нет кандидатов.</div> : null}
      </div>
    </div>
  )
}

// ── Строка отклика (с раскрытием «О себе» + письмо) ──
function ApplicantRow({
  v,
  a,
  favorite,
  onToggleFav,
  onOpenProfile,
  onWrite,
  onReject,
}: {
  v: Vacancy
  a: Applicant
  favorite: boolean
  onToggleFav: () => void
  onOpenProfile: () => void
  onWrite: () => void
  onReject: () => void
}) {
  const state = appState(a)
  // Переиспользуем существующие CSS-классы пилюль: viewed красим нейтральным 'contacted'.
  const pillKind = state === 'viewed' ? 'contacted' : state
  const match = computeMatch(v, applicantToMatchProfile(a))
  const about = a.about ?? ''
  const cover = a.note ?? ''
  const aboutLong = about.length > 130
  const coverLong = cover.length > 130
  const [openAbout, setOpenAbout] = useState(false)
  const [openCover, setOpenCover] = useState(false)

  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation()
    fn()
  }

  return (
    <article
      className={[styles.appRow, state === 'rejected' ? styles.appRejected : ''].filter(Boolean).join(' ')}
      onClick={onOpenProfile}
    >
      <div className={styles.appAva}>
        {a.avatar ? <img src={a.avatar} alt="" /> : a.avatarInitials}
      </div>
      <div className={styles.appInfo}>
        <div className={styles.appName}>
          {a.name}
          <CompanyBadge logo={a.companyLogo} title={a.company} size={14} />
        </div>
        <div className={styles.appRole}>
          {[a.jobTitle || 'Кандидат', a.company, a.location].filter(Boolean).join(' · ')}
        </div>
        <div className={styles.appMetaLine}>
          <span className={styles.appTime}>
            <Icon.clock /> {formatPosted(a.appliedAt)}
          </span>
          <span className={styles.appDot} />
          <span className={[styles.appStagePill, styles[`pill_${pillKind}`]].join(' ')}>
            <span className={[styles.appStageDot, styles[`dot_${pillKind}`]].join(' ')} />
            {APP_STATE_LABEL[state]}
          </span>
          <CandidateWarmthBadge candidateId={a.userId} />
        </div>
      </div>
      <div className={styles.appRight}>
        {match.score != null ? (
          <span className={styles.appMatch}>
            <b>{match.score}%</b> мэтч
          </span>
        ) : null}
        <div className={styles.appQuick}>
          <button
            className={[styles.aqBtn, favorite ? styles.aqStarOn : ''].filter(Boolean).join(' ')}
            title={favorite ? 'Убрать из избранных' : 'В избранные'}
            onClick={(e) => stop(e, onToggleFav)}
          >
            <Icon.star />
          </button>
          <button className={styles.aqBtn} title="Профиль" onClick={(e) => stop(e, onOpenProfile)}>
            <Icon.user />
          </button>
          <button className={styles.aqBtn} title="Написать" onClick={(e) => stop(e, onWrite)}>
            <Icon.send />
          </button>
          <button className={[styles.aqBtn, styles.aqDanger].join(' ')} title="Отклонить" onClick={(e) => stop(e, onReject)}>
            <Icon.xCircle />
          </button>
        </div>
      </div>

      {about || cover ? (
        <div className={styles.appBody} onClick={(e) => e.stopPropagation()}>
          {about ? (
            <div className={styles.appBlk}>
              <div className={styles.appBlkT}>
                <Icon.user /> О себе
              </div>
              <div className={[styles.appBlkTx, aboutLong && !openAbout ? styles.clamp : ''].filter(Boolean).join(' ')}>
                {about}
              </div>
              {aboutLong ? (
                <button
                  type="button"
                  className={[styles.appMore, openAbout ? styles.appMoreOpen : ''].filter(Boolean).join(' ')}
                  onClick={() => setOpenAbout((o) => !o)}
                >
                  {openAbout ? 'Свернуть' : 'Читать полностью'} <Icon.chevD />
                </button>
              ) : null}
            </div>
          ) : null}
          {cover ? (
            <div className={styles.appBlk}>
              <div className={styles.appBlkT}>
                <Icon.doc /> Сопроводительное письмо
              </div>
              <div className={styles.appCover}>
                <div className={[styles.appBlkTx, coverLong && !openCover ? styles.clamp : ''].filter(Boolean).join(' ')}>
                  {cover}
                </div>
                {coverLong ? (
                  <button
                    type="button"
                    className={[styles.appMore, openCover ? styles.appMoreOpen : ''].filter(Boolean).join(' ')}
                    onClick={() => setOpenCover((o) => !o)}
                  >
                    {openCover ? 'Свернуть' : 'Читать полностью'} <Icon.chevD />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
