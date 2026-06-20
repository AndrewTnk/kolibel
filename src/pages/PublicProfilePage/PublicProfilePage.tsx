import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { recordProfileView, normalizeSource } from '../../features/analytics/lib/analyticsApi'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { fetchPublicProfile, type PublicProfile } from '../../features/profile/lib/publicProfileApi'
import { loadNetwork, toggleFollow } from '../../features/network/model/networkThunks'
import { networkActions } from '../../features/network/model/networkSlice'
import { loadFeed } from '../../features/feed/model/feedThunks'
import { loadVacancies } from '../../features/vacancies/model/vacancyThunks'
import { vacanciesActions } from '../../features/vacancies/model/vacanciesSlice'
import {
  employmentLabels,
  formatExperienceYears,
  formatSalary,
  workFormatLabels,
} from '../../features/vacancies/lib/labels'
import { markConversationRead, startConversation } from '../../features/chat/model/chatThunks'
import { chatUiActions } from '../../features/chat/model/chatUiSlice'
import { PostCard } from '../../features/feed/ui/PostCard'
import type { FeedPost } from '../../features/feed/model/types'
import type { Vacancy } from '../../features/vacancies/model/types'
import { ProfileSheet } from '../../features/profile/ui/ProfileSheet/ProfileSheet'
import { CompanyContacts } from '../../features/company/ui/CompanyContacts'
import { fetchCompanyEmployees, type CompanyEmployee } from '../../features/company/lib/companyTeamApi'
import { Ic } from '../../features/company/ui/brandIcons'
import { ConnectionsGraph } from '../../features/network/ui/ConnectionsGraph'
import { RecommendedCompanies } from '../../shared/ui/Recommendations/RecommendedCompanies'
import { RecommendedPeople } from '../../shared/ui/Recommendations/RecommendedPeople'
import { SupportLinks } from '../../shared/ui/Recommendations/SupportLinks'
import { BlockSkeleton } from '../../shared/ui/Skeleton/Skeleton'
import brand from '../../features/company/ui/CompanyBrand.module.css'
import styles from './PublicProfilePage.module.css'

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const me = useAppSelector((s) => s.auth.user?.id)
  const followingIds = useAppSelector((s) => s.network.followingIds)
  const networkStatus = useAppSelector((s) => s.network.status)
  const publicGraphOpen = useAppSelector((s) => s.network.publicGraphOpen)
  const posts = useAppSelector((s) => s.feed.posts)

  // Полноэкранный граф (иконка в хедере на мобилке) — сбрасываем при заходе/уходе со страницы.
  useEffect(() => {
    dispatch(networkActions.closePublicGraph())
    return () => {
      dispatch(networkActions.closePublicGraph())
    }
  }, [dispatch, id])

  const [data, setData] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function report() {
    const msg = 'Спасибо! Передадим команде.'
    setToast(msg)
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2400)
  }
  const toastEl = toast ? (
    <div className={styles.toastWrap}>
      <div className={styles.toast}>{toast}</div>
    </div>
  ) : null

  const guestPreview = searchParams.get('guest') === '1'

  useEffect(() => {
    if (!id) return
    if (me && id === me && !guestPreview) {
      navigate('/profile', { replace: true })
      return
    }
    // Фиксируем просмотр чужого профиля/страницы (бэкенд отбросит дубли/самопросмотры).
    void recordProfileView(id, normalizeSource(searchParams.get('from')))
    let alive = true
    setLoading(true)
    setNotFound(false)
    fetchPublicProfile(id)
      .then((p) => {
        if (!alive) return
        if (!p) setNotFound(true)
        setData(p)
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false))
    void dispatch(loadFeed())
    void dispatch(loadVacancies())
    if (networkStatus === 'idle') void dispatch(loadNetwork())
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, me])

  const isFollowing = id ? followingIds.includes(id) : false
  const authorPosts = posts.filter((p) => p.authorId === id)

  function write() {
    if (!id) return
    void dispatch(startConversation(id)).then((res) => {
      if (startConversation.fulfilled.match(res) && res.payload) {
        dispatch(chatUiActions.openConversationInMini(res.payload))
        void dispatch(markConversationRead(res.payload))
      }
    })
  }

  // Свой профиль в режиме «как гость» — без подписки/сообщения себе, только выход.
  const selfGuest = guestPreview && !!me && id === me

  const actions = selfGuest ? (
    <div className={styles.actions}>
      <button type="button" className={styles.writeBtn} onClick={() => navigate('/profile')}>
        ← Вернуться в профиль
      </button>
    </div>
  ) : (
    <div className={styles.actions}>
      <button
        type="button"
        className={isFollowing ? styles.followDone : styles.followBtn}
        onClick={() => id && dispatch(toggleFollow(id))}
      >
        {isFollowing ? '✓ Связь' : '+ Связь'}
      </button>
      <button type="button" className={styles.writeBtn} onClick={write}>
        Написать
      </button>
    </div>
  )

  const networkName =
    data?.kind === 'company' ? data.company.name : data?.kind === 'user' ? data.resume.fullName : ''
  const networkTitle = networkName ? `Сеть «${networkName}»` : 'Сеть'

  // ── Профиль пользователя — тот же ProfileSheet, что и личный, в режиме просмотра ──
  if (!loading && id && data?.kind === 'user') {
    return (
      <>
        <ProfileSheet
          resume={data.resume}
          readOnly
          postsAuthorId={id}
          onBack={() => navigate(-1)}
          heroActions={
            <>
              {actions}
              <MoreMenu cls={styles} selfGuest={selfGuest} onReport={report} />
            </>
          }
          rail={
            <>
              <div className="hideOnMobile">
                <ConnectionsGraph
                  rootId={id}
                  title={networkTitle}
                  withStats
                  forceOpen={publicGraphOpen}
                  onForceClose={() => dispatch(networkActions.closePublicGraph())}
                />
              </div>
              <div className="hideOnMobile">
                <RecommendedPeople title="Похожие пользователи" />
              </div>
              <div className="hideOnMobile">
                <SupportLinks />
              </div>
            </>
          }
        />
        {toastEl}
      </>
    )
  }

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.inner}>
          {loading ? (
            <div className={styles.layout}>
              <div className={styles.colCenter}>
                <BlockSkeleton height={300} />
                <BlockSkeleton height={160} />
              </div>
              <aside className={styles.colRight}>
                <BlockSkeleton height={320} />
              </aside>
            </div>
          ) : notFound || !data || data.kind !== 'company' ? (
            <div className={styles.soloColumn}>
              <div className={styles.state}>Профиль не найден.</div>
            </div>
          ) : (
            <div className={styles.layout}>
              <div className={styles.colCenter}>
                <CompanyView id={id!} data={data} actions={actions} posts={authorPosts} selfGuest={selfGuest} onReport={report} />
              </div>
              <aside className={styles.colRight}>
                <div className="hideOnMobile">
                  <ConnectionsGraph
                    rootId={id}
                    title={networkTitle}
                    withStats
                    forceOpen={publicGraphOpen}
                    onForceClose={() => dispatch(networkActions.closePublicGraph())}
                  />
                </div>
                {data.company.contacts.length ? <CompanyContacts contacts={data.company.contacts} /> : null}
                <div className="hideOnMobile">
                  <RecommendedCompanies title="Похожие компании" />
                </div>
                <div className="hideOnMobile">
                  <SupportLinks />
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      {toastEl}
    </div>
  )
}

/* ── Меню «Ещё» ── */
function MoreMenu({ cls, selfGuest, onReport }: { cls: Record<string, string>; selfGuest?: boolean; onReport?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={cls.moreWrap} ref={ref}>
      <button
        type="button"
        className={cls.moreBtn || cls.btnIcon}
        aria-label="Ещё"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div className={cls.moreMenu} role="menu">
          {selfGuest ? (
            <button
              type="button"
              className={[cls.moreItem, cls.moreDanger].filter(Boolean).join(' ')}
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onReport?.()
              }}
            >
              <span className={cls.moreIco}><Ic.flag /></span>Сообщить об ошибке
            </button>
          ) : (
            <button type="button" className={cls.moreItem} role="menuitem" onClick={() => setOpen(false)}>
              Пожаловаться
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ── Профиль компании (read-only бренд-страница) ── */
type CompanyTab = 'about' | 'vacancies' | 'team' | 'posts'

/** Сворачивание секции «Показать все · N» / «Свернуть» (как в основном профиле компании). */
function Collapsible({ count, initial, children }: { count: number; initial: number; children: (open: boolean) => React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const hidden = count - initial
  return (
    <>
      {children(open)}
      {hidden > 0 ? (
        <button type="button" className={brand.expandBtn} onClick={() => setOpen((v) => !v)}>
          {open ? <>Свернуть <Ic.chevronUp /></> : <>Показать все · {count} <Ic.chevronDown /></>}
        </button>
      ) : null}
    </>
  )
}

function CompanyView({
  id,
  data,
  actions,
  posts,
  selfGuest,
  onReport,
}: {
  id: string
  data: Extract<PublicProfile, { kind: 'company' }>
  actions: React.ReactNode
  posts: FeedPost[]
  selfGuest?: boolean
  onReport?: () => void
}) {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const c = data.company
  const [tab, setTab] = useState<CompanyTab>('about')
  const [employees, setEmployees] = useState<CompanyEmployee[]>([])

  const vacancies = useAppSelector((s) => s.vacanciesList.items).filter((v) => v.companyId === id)
  const openVacancy = (v: Vacancy) => dispatch(vacanciesActions.openVacancy(v.id))

  useEffect(() => {
    if (!c.name) return
    fetchCompanyEmployees(c.name).then(setEmployees).catch(() => setEmployees([]))
  }, [c.name])

  const hasAbout = !!c.about.trim()
  const hasGallery = c.gallery.length > 0
  const hasDirections = c.directions.length > 0
  const hasValues = c.cultureValues.length > 0
  const aboutEmpty = !hasAbout && !hasGallery && !hasDirections && !hasValues

  return (
    <div className={brand.sheet}>
      <div className={brand.hero}>
        <div className={brand.banner} style={c.banner ? { backgroundImage: `url(${c.banner})` } : undefined}>
          <button type="button" className={brand.bannerBack} aria-label="Назад" onClick={() => nav(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </div>
        <div className={brand.heroBody}>
          <div className={brand.heroTop}>
            <div className={brand.logoWrap} style={{ cursor: 'default' }}>
              {c.logo || c.avatar ? (
                <img className={brand.logoImg} src={c.logo || c.avatar} alt={c.name} />
              ) : (
                <span className={brand.logoBadge}>{c.logoInitial}</span>
              )}
            </div>
            <div className={brand.heroIdent}>
              <div className={brand.heroNameRow}>
                <h1 className={brand.heroName}>{c.name}</h1>
                {c.verifiedDate ? (
                  <span className={brand.verified}>
                    <Ic.verified /> Подтверждённая
                  </span>
                ) : null}
              </div>
              {c.industry ? <div className={brand.tagline}>{c.industry}</div> : null}
              <div className={brand.heroMeta}>
                {c.location ? <span className={brand.metaPill}><Ic.mapPin /> {c.location}</span> : null}
                {c.website ? (
                  <a className={[brand.metaPill, brand.metaWeb].join(' ')} href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
                    <Ic.globe /> {c.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className={brand.heroBottom}>
            <div className={styles.bannerActions}>
              {actions}
              <MoreMenu cls={brand} selfGuest={selfGuest} onReport={onReport} />
            </div>
          </div>
        </div>

        <div className={brand.tabs} role="tablist">
          <button role="tab" className={[brand.tab, tab === 'about' ? brand.tabOn : ''].join(' ')} onClick={() => setTab('about')}>
            <Ic.building /> О компании
          </button>
          <button role="tab" className={[brand.tab, tab === 'vacancies' ? brand.tabOn : ''].join(' ')} onClick={() => setTab('vacancies')}>
            <Ic.briefcase /> Вакансии {vacancies.length ? <span className={brand.tabCount}>{vacancies.length}</span> : null}
          </button>
          <button role="tab" className={[brand.tab, tab === 'team' ? brand.tabOn : ''].join(' ')} onClick={() => setTab('team')}>
            <Ic.users /> Команда {employees.length ? <span className={brand.tabCount}>{employees.length}</span> : null}
          </button>
          <button role="tab" className={[brand.tab, tab === 'posts' ? brand.tabOn : ''].join(' ')} onClick={() => setTab('posts')}>
            <Ic.bubble /> Посты {posts.length ? <span className={brand.tabCount}>{posts.length}</span> : null}
          </button>
        </div>
      </div>

      {tab === 'about' ? (
        <div className={brand.bodyPad}>
          {hasAbout ? (
            <section className={brand.sec}>
              <div className={brand.secHead}><span className={brand.secTitle}>О компании</span></div>
              <div className={brand.aboutText}>
                {c.about.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          ) : null}

          {hasGallery ? (
            <section className={brand.sec}>
              <div className={brand.secHead}><span className={brand.secTitle}>Жизнь в компании</span></div>
              <Collapsible count={c.gallery.length} initial={3}>
                {(open) => (
                  <div className={brand.gallery}>
                    {(open ? c.gallery : c.gallery.slice(0, 3)).map((g) => (
                      <div key={g.id} className={brand.galCell}><img src={g.url} alt="" /></div>
                    ))}
                  </div>
                )}
              </Collapsible>
            </section>
          ) : null}

          {hasDirections ? (
            <section className={brand.sec}>
              <div className={brand.secHead}><span className={brand.secTitle}>Чем занимаемся</span></div>
              <Collapsible count={c.directions.length} initial={2}>
                {(open) => (
                  <div className={brand.dirGrid}>
                    {(open ? c.directions : c.directions.slice(0, 2)).map((d) => (
                      <div key={d.id} className={brand.dirCard}>
                        <span className={brand.dirIco}><Ic.bolt /></span>
                        <span className={brand.dirTitle}>{d.title}</span>
                        <span className={brand.dirDesc}>{d.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Collapsible>
            </section>
          ) : null}

          {hasValues ? (
            <section className={brand.sec}>
              <div className={brand.secHead}><span className={brand.secTitle}>Ценности и культура</span></div>
              <Collapsible count={c.cultureValues.length} initial={2}>
                {(open) => (
                  <div className={brand.valGrid}>
                    {(open ? c.cultureValues : c.cultureValues.slice(0, 2)).map((v) => (
                      <div key={v.id} className={brand.valCard}>
                        <div className={brand.valTitle}>{v.title}</div>
                        <div className={brand.valDesc}>{v.desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Collapsible>
            </section>
          ) : null}

          {aboutEmpty ? <p className={brand.emptyText}>Компания пока не заполнила сведения.</p> : null}
        </div>
      ) : null}

      {tab === 'vacancies' ? (
        <div className={brand.bodyPad}>
          <section className={brand.sec}>
            <div className={brand.secHead}><span className={brand.secTitle}>Открытые вакансии · {vacancies.length}</span></div>
            {vacancies.length ? (
              <div className={brand.vacList}>
                {vacancies.map((v) => (
                  <button key={v.id} type="button" className={brand.vacRow} onClick={() => openVacancy(v)}>
                    <span className={brand.vacIco}><Ic.briefcase /></span>
                    <span className={brand.vacMeta}>
                      <span className={brand.vacTitle}>{v.title}</span>
                      <span className={brand.vacSub}>
                        {[v.city, v.workFormats.map((f) => workFormatLabels[f]).join('/'), v.employmentTypes.map((e) => employmentLabels[e]).join('/'), formatExperienceYears(v.experienceFrom, v.experienceTo)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className={brand.vacSalary}>{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className={brand.emptyText}>Активных вакансий нет.</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'team' ? (
        <div className={brand.bodyPad}>
          <section className={brand.sec}>
            <div className={brand.secHead}><span className={brand.secTitle}>Команда · {employees.length}</span></div>
            {employees.length ? (
              <div className={brand.teamGrid}>
                {employees.map((p) => (
                  <button key={p.id} type="button" className={brand.teamCard} onClick={() => nav(`/u/${p.id}`)}>
                    {p.avatar ? <img className={brand.teamAva} src={p.avatar} alt="" /> : <span className={brand.teamAva}>{p.initials}</span>}
                    <span className={brand.teamMeta}>
                      <span className={brand.teamName}>{p.name}</span>
                      <span className={brand.teamRole}>{p.role}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className={brand.emptyText}>Пока никто не указал «{c.name}» как место работы.</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'posts' ? (
        <div className={brand.bodyPad}>
          {posts.length ? (
            <div className={brand.feed}>
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          ) : (
            <p className={brand.emptyText}>Публикаций пока нет.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
