import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../../shared/ui/AppHeader/AppHeader'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { supabase } from '../../../shared/lib/supabase'
import { useIsMobile } from '../../../shared/lib/useMediaQuery'
import { PostCard } from '../../feed/ui/PostCard'
import { PostComposer } from '../../feed/ui/PostComposer'
import type { FeedPost } from '../../feed/model/types'
import { loadFeed } from '../../feed/model/feedThunks'
import { loadVacancies } from '../../vacancies/model/vacancyThunks'
import { isPublicVacancy } from '../../vacancies/lib/vacancyVisibility'
import { vacanciesActions } from '../../vacancies/model/vacanciesSlice'
import { loadNetwork } from '../../network/model/networkThunks'
import type { Vacancy } from '../../vacancies/model/types'
import {
  employmentLabels,
  formatExperienceYears,
  formatSalary,
  workFormatLabels,
} from '../../vacancies/lib/labels'
import { CreateVacancyModal } from '../../vacancies/ui/CreateVacancyModal'
import { CompanyAnalyticsModal } from './CompanyAnalyticsModal/CompanyAnalyticsModal'
import { CompanyPulse } from '../../../widgets/CompanyPulse/CompanyPulse'
import { ArticlesBlock } from '../../articles/ui/ArticlesBlock'
import { SupportLinks } from '../../../shared/ui/Recommendations/SupportLinks'
import { loadAuthorArticles } from '../../articles/model/articleThunks'
import { GalleryStrip } from './GalleryStrip'
import { fetchCompanyEmployees, type CompanyEmployee } from '../lib/companyTeamApi'
import { useCompanyCompletion } from '../lib/useCompanyCompletion'
import {
  EditHeaderModal,
  BannerModal,
  LogoModal,
  AboutModal,
  DirectionsModal,
  ValuesModal,
  GalleryModal,
  ContactsModal,
  ShareModal,
} from './CompanyProfileModals'
import { BlockSkeleton } from '../../../shared/ui/Skeleton/Skeleton'
import { Ic } from './brandIcons'
import type { CompanyProfile } from '../model/companyData'
import styles from './CompanyBrand.module.css'

type Tab = 'about' | 'vacancies' | 'team' | 'posts' | 'articles'
type ModalKind =
  | 'edit-header' | 'banner' | 'logo' | 'about' | 'directions' | 'values'
  | 'gallery' | 'contacts' | 'share' | 'analytics' | 'vacancy' | null

export function CompanyMainContent() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const c = useAppSelector((s) => s.company.profile)
  const companyLoaded = useAppSelector((s) => s.company.loaded)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const networkStatus = useAppSelector((s) => s.network.status)
  const isMobile = useIsMobile()

  // Бренд-страница показывает только активные вакансии (пауза/черновик/закрытая —
  // только в «Мои вакансии»).
  const vacancies = useAppSelector((s) => s.vacanciesList.items).filter(
    (v) => v.companyId && v.companyId === myId && isPublicVacancy(v),
  )
  const posts = useAppSelector((s) => s.feed.posts).filter((p) => p.authorId === myId)
  // Статьи компании — для счётчика на мобильной вкладке (десктоп — блок в сайдрейле).
  const articlesLoaded = useAppSelector((s) => s.articles.loadedAuthors.includes(myId ?? ''))
  const articleCount = useAppSelector((s) => (s.articles.byAuthor[myId ?? ''] ?? []).length)

  const [tab, setTab] = useState<Tab>('about')
  const [modal, setModal] = useState<ModalKind>(null)
  const [employees, setEmployees] = useState<CompanyEmployee[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    void dispatch(loadFeed())
    void dispatch(loadVacancies())
  }, [dispatch])
  useEffect(() => {
    if (networkStatus === 'idle') void dispatch(loadNetwork())
  }, [networkStatus, dispatch])
  useEffect(() => {
    if (myId && !articlesLoaded) void dispatch(loadAuthorArticles(myId))
  }, [myId, articlesLoaded, dispatch])
  // На десктопе вкладки «Статьи» нет (блок в сайдрейле) — вернёмся на «О компании», если ушли с мобилки.
  useEffect(() => {
    if (!isMobile && tab === 'articles') setTab('about')
  }, [isMobile, tab])
  useEffect(() => {
    if (!c.name) return
    fetchCompanyEmployees(c.name).then(setEmployees).catch(() => setEmployees([]))
  }, [c.name])

  function showToast(m: string) {
    setToast(m)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }
  const open = (m: ModalKind) => setModal(m)
  const close = () => setModal(null)
  const shareUrl = `${window.location.origin}/u/${myId ?? ''}`

  if (!companyLoaded) {
    return (
      <div className={styles.page}>
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.inner}>
            <BlockSkeleton height={360} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.layout}>
            <div className={styles.colCenter}>
              <div className={styles.sheet}>
                <Hero
                  c={c}
                  onOpen={open}
                  onGuest={() => myId && nav(`/u/${myId}?guest=1`)}
                  onSettings={() => nav('/settings')}
                />

                <div className={styles.tabs} role="tablist">
                  <button role="tab" className={[styles.tab, tab === 'about' ? styles.tabOn : ''].join(' ')} onClick={() => setTab('about')}>
                    <Ic.building /> О компании
                  </button>
                  <button role="tab" className={[styles.tab, tab === 'vacancies' ? styles.tabOn : ''].join(' ')} onClick={() => setTab('vacancies')}>
                    <Ic.briefcase /> Вакансии {vacancies.length ? <span className={styles.tabCount}>{vacancies.length}</span> : null}
                  </button>
                  <button role="tab" className={[styles.tab, tab === 'team' ? styles.tabOn : ''].join(' ')} onClick={() => setTab('team')}>
                    <Ic.users /> Команда {employees.length ? <span className={styles.tabCount}>{employees.length}</span> : null}
                  </button>
                  <button role="tab" className={[styles.tab, tab === 'posts' ? styles.tabOn : ''].join(' ')} onClick={() => setTab('posts')}>
                    <Ic.bubble /> Посты {posts.length ? <span className={styles.tabCount}>{posts.length}</span> : null}
                  </button>
                  {/* Статьи — отдельной вкладкой только на мобилке (на десктопе блок в сайдрейле). */}
                  {isMobile ? (
                    <button role="tab" className={[styles.tab, tab === 'articles' ? styles.tabOn : ''].join(' ')} onClick={() => setTab('articles')}>
                      <Ic.pencil /> Статьи {articleCount ? <span className={styles.tabCount}>{articleCount}</span> : null}
                    </button>
                  ) : null}
                </div>

                {tab === 'about' ? <AboutTab c={c} onOpen={open} /> : null}
                {tab === 'vacancies' ? <VacanciesTab vacancies={vacancies} onOpen={open} /> : null}
                {tab === 'team' ? <TeamTab employees={employees} companyName={c.name} onToast={showToast} onOpenPerson={(id) => nav(`/u/${id}`)} /> : null}
              </div>

              {/* Посты/статьи — вне карточки компании, на фоне страницы (как лента на главной). */}
              {tab === 'posts' ? <PostsTab posts={posts} isMobile={isMobile} /> : null}
              {tab === 'articles' && isMobile && myId ? (
                <div className={styles.postsTab}>
                  <ArticlesBlock authorId={myId} canEdit variant="page" title="Статьи компании" />
                </div>
              ) : null}
            </div>

            <div className={styles.colRail}>
              <SideRail c={c} onOpen={open} />
            </div>
          </div>
        </div>
      </main>

      {modal === 'edit-header' ? <EditHeaderModal onClose={close} /> : null}
      {modal === 'banner' ? <BannerModal onClose={close} /> : null}
      {modal === 'logo' ? <LogoModal onClose={close} /> : null}
      {modal === 'about' ? <AboutModal onClose={close} /> : null}
      {modal === 'directions' ? <DirectionsModal onClose={close} /> : null}
      {modal === 'values' ? <ValuesModal onClose={close} /> : null}
      {modal === 'gallery' ? <GalleryModal onClose={close} /> : null}
      {modal === 'contacts' ? <ContactsModal onClose={close} /> : null}
      {modal === 'share' ? <ShareModal shareUrl={shareUrl} onClose={close} /> : null}
      {modal === 'analytics' ? <CompanyAnalyticsModal onClose={close} /> : null}
      {modal === 'vacancy' ? <CreateVacancyModal onClose={close} /> : null}

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  )
}

// ── Hero ──────────────────────────────────────
function Hero({
  c, onOpen, onGuest, onSettings,
}: {
  c: CompanyProfile
  onOpen: (m: ModalKind) => void
  onGuest: () => void
  onSettings: () => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!moreOpen) return
    function onDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [moreOpen])

  const more = (fn: () => void) => () => { setMoreOpen(false); fn() }

  return (
    <div className={styles.hero}>
      <div
        className={styles.banner}
        style={c.banner ? { backgroundImage: `url(${c.banner})` } : undefined}
        role="button"
        aria-label="Сменить обложку"
        onClick={() => onOpen('banner')}
      >
        <button type="button" className={styles.bannerEdit} onClick={(e) => { e.stopPropagation(); onOpen('banner') }}>
          <Ic.pencil /> <span className={styles.bannerEditLabel}>Сменить обложку</span>
        </button>
      </div>

      <div className={styles.heroBody}>
        <div className={styles.heroTop}>
          <button type="button" className={styles.logoWrap} onClick={() => onOpen('logo')} aria-label="Сменить логотип">
            {c.logo || c.avatar ? (
              <img className={styles.logoImg} src={c.logo || c.avatar} alt={c.name} />
            ) : (
              <span className={styles.logoBadge}>{c.logoInitial}</span>
            )}
          </button>
          <div className={styles.heroIdent}>
            <div className={styles.heroNameRow}>
              <h1 className={styles.heroName}>{c.name}</h1>
              {c.verifiedDate ? (
                <span className={styles.verified}>
                  <Ic.verified /> Подтверждённая
                </span>
              ) : null}
            </div>
            {c.industry ? <div className={styles.tagline}>{c.industry}</div> : null}
            <div className={styles.heroMeta}>
              {c.location ? <span className={styles.metaPill}><Ic.mapPin /> {c.location}</span> : null}
              {c.website ? (
                <a className={[styles.metaPill, styles.metaWeb].join(' ')} href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
                  <Ic.globe /> {c.website.replace(/^https?:\/\//, '')}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.heroBottom}>
          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimary} onClick={() => onOpen('edit-header')}>
              <Ic.pencil /> <span className={styles.btnLabel}>Редактировать</span>
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => onOpen('vacancy')}>
              <Ic.plus /> <span className={styles.btnLabel}>Вакансия</span>
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => onOpen('share')}>
              <Ic.share /> <span className={styles.btnLabel}>Поделиться</span>
            </button>
            <div className={styles.moreWrap} ref={moreRef}>
              <button type="button" className={styles.btnIcon} onClick={() => setMoreOpen((v) => !v)} aria-label="Ещё">
                <Ic.more />
              </button>
              {moreOpen ? (
                <div className={styles.moreMenu} role="menu">
                  <button type="button" className={styles.moreItem} onClick={more(onGuest)}>
                    <span className={styles.moreIco}><Ic.eye /></span>Открыть как гость
                  </button>
                  <div className={styles.moreSep} />
                  <button type="button" className={styles.moreItem} onClick={more(onSettings)}>
                    <span className={styles.moreIco}><Ic.settings /></span>
                    <span>Настройки<br />приватности</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────
function SecHead({ title, onEdit, onAdd }: { title: string; onEdit?: () => void; onAdd?: () => void }) {
  return (
    <div className={styles.secHead}>
      <span className={styles.secTitle}>{title}</span>
      {onAdd ? <button type="button" className={styles.secEdit} onClick={onAdd} aria-label="Добавить"><Ic.plus /></button> : null}
      {onEdit ? <button type="button" className={styles.secEdit} onClick={onEdit} aria-label="Редактировать"><Ic.pencil /></button> : null}
    </div>
  )
}

function Collapsible({ count, initial, children }: { count: number; initial: number; children: (open: boolean) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const hidden = count - initial
  return (
    <>
      {children(open)}
      {hidden > 0 ? (
        <button type="button" className={styles.expandBtn} onClick={() => setOpen((v) => !v)}>
          {open ? <>Свернуть <Ic.chevronUp /></> : <>Показать все · {count} <Ic.chevronDown /></>}
        </button>
      ) : null}
    </>
  )
}

// ── Tab: О компании ───────────────────────────
function AboutTab({ c, onOpen }: { c: CompanyProfile; onOpen: (m: ModalKind) => void }) {
  // Пустые секции не показываем — заполнение через чек-лист «Готовность профиля».
  const hasAbout = !!c.about.trim()
  const hasGallery = c.gallery.length > 0
  const hasDirections = c.directions.length > 0
  const hasValues = c.cultureValues.length > 0
  const allEmpty = !hasAbout && !hasGallery && !hasDirections && !hasValues

  return (
    <div className={styles.bodyPad}>
      {hasAbout ? (
        <section className={styles.sec}>
          <SecHead title="О компании" onEdit={() => onOpen('about')} />
          <div className={styles.aboutText}>
            {c.about.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>
      ) : null}

      {hasGallery ? (
        <section className={styles.sec}>
          <SecHead title="Жизнь в компании" onAdd={() => onOpen('gallery')} />
          <GalleryStrip photos={c.gallery} onPhotoClick={() => onOpen('gallery')} />
        </section>
      ) : null}

      {hasDirections ? (
        <section className={styles.sec}>
          <SecHead title="Чем занимаемся" onEdit={() => onOpen('directions')} />
          <Collapsible count={c.directions.length} initial={2}>
            {(open) => (
              <div className={styles.dirGrid}>
                {(open ? c.directions : c.directions.slice(0, 2)).map((d) => (
                  <button key={d.id} type="button" className={styles.dirCard} onClick={() => onOpen('directions')}>
                    <span className={styles.dirLeft}>
                      <span className={styles.dirIco}><Ic.bolt /></span>
                      <span className={styles.dirTitle}>{d.title}</span>
                    </span>
                    <span className={styles.dirDesc}>{d.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </Collapsible>
        </section>
      ) : null}

      {hasValues ? (
        <section className={styles.sec}>
          <SecHead title="Ценности и культура" onEdit={() => onOpen('values')} />
          <Collapsible count={c.cultureValues.length} initial={2}>
            {(open) => (
              <div className={styles.valGrid}>
                {(open ? c.cultureValues : c.cultureValues.slice(0, 2)).map((v) => (
                  <div key={v.id} className={styles.valCard}>
                    <div className={styles.valTitle}>{v.title}</div>
                    <div className={styles.valDesc}>{v.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </Collapsible>
        </section>
      ) : null}

      {allEmpty ? (
        <p className={styles.emptyText}>
          Разделы пока не заполнены. Загляни в «Готовность профиля» справа — там быстрые ссылки на каждый раздел.
        </p>
      ) : null}
    </div>
  )
}

// ── Tab: Вакансии ─────────────────────────────
function VacanciesTab({ vacancies, onOpen }: { vacancies: Vacancy[]; onOpen: (m: ModalKind) => void }) {
  const dispatch = useAppDispatch()
  return (
    <div className={styles.bodyPad}>
      <section className={styles.sec}>
        <SecHead title={`Открытые вакансии · ${vacancies.length}`} onAdd={() => onOpen('vacancy')} />
        {vacancies.length ? (
          <div className={styles.vacList}>
            {vacancies.map((v) => (
              <button key={v.id} type="button" className={styles.vacRow} onClick={() => dispatch(vacanciesActions.openVacancy(v.id))}>
                <span className={styles.vacIco}><Ic.briefcase /></span>
                <span className={styles.vacMeta}>
                  <span className={styles.vacTitle}>{v.title}</span>
                  <span className={styles.vacSub}>
                    {[v.city, v.workFormats.map((f) => workFormatLabels[f]).join('/'), v.employmentTypes.map((e) => employmentLabels[e]).join('/'), formatExperienceYears(v.experienceFrom, v.experienceTo)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className={styles.vacSalary}>{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</span>
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className={styles.vacNew} onClick={() => onOpen('vacancy')}>
          <span className={styles.vacNewIco}><Ic.plus /></span>
          <span className={styles.vacNewTx}>
            <span className={styles.vacNewT}>Опубликовать вакансию</span>
            <span className={styles.vacNewS}>Появится в профиле и в общей ленте — кандидаты смогут откликнуться сразу</span>
          </span>
        </button>
      </section>
    </div>
  )
}

// ── Tab: Команда ──────────────────────────────
function TeamTab({ employees, companyName, onToast, onOpenPerson }: {
  employees: CompanyEmployee[]
  companyName: string
  onToast: (m: string) => void
  onOpenPerson: (id: string) => void
}) {
  return (
    <div className={styles.bodyPad}>
      <section className={styles.sec}>
        <SecHead title={`Команда · ${employees.length} ${employees.length === 1 ? 'человек' : 'человек'}`} />
        {employees.length ? (
          <div className={styles.teamGrid}>
            {employees.map((p) => (
              <button key={p.id} type="button" className={styles.teamCard} onClick={() => onOpenPerson(p.id)}>
                {p.avatar ? <img className={styles.teamAva} src={p.avatar} alt="" /> : <span className={styles.teamAva}>{p.initials}</span>}
                <span className={styles.teamMeta}>
                  <span className={styles.teamName}>{p.name}</span>
                  <span className={styles.teamRole}>{p.role}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>Пока никто не указал «{companyName}» как место работы.</p>
        )}
        <div className={styles.teamInvite}>
          <button type="button" className={styles.btnTonal} onClick={() => onToast('Ссылка-приглашение скопирована')}>
            <Ic.plus /> Пригласить сотрудников
          </button>
        </div>
        <p className={styles.teamHint}>
          Здесь показаны люди, указавшие «{companyName}» местом работы. Логотип появляется в их профилях автоматически.
        </p>
      </section>
    </div>
  )
}

// ── Tab: Посты ────────────────────────────────
function PostsTab({ posts, isMobile }: { posts: FeedPost[]; isMobile: boolean }) {
  return (
    <div className={styles.postsTab}>
      {/* Композер нового поста — как в профиле пользователя (только веб;
          на мобилке создание поста — из иконки «+» в шапке). */}
      {!isMobile ? <PostComposer compact /> : null}
      {posts.length ? (
        <div className={styles.feed}>
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      ) : (
        <p className={styles.emptyText}>Публикаций пока нет.</p>
      )}
    </div>
  )
}

// ── Side rail ─────────────────────────────────
function SideRail({ c, onOpen }: { c: CompanyProfile; onOpen: (m: ModalKind) => void }) {
  const nav = useNavigate()
  const completion = useCompanyCompletion()
  const remaining = completion.items.filter((i) => !i.done).length
  const [expanded, setExpanded] = useState(false)
  const myId = useAppSelector((s) => s.auth.user?.id)

  // Контакты привязываются к реальному профилю (userId + аватар) при выборе в редакторе —
  // фото и переход берутся прямо из контакта. Для СТАРЫХ контактов без userId оставляем
  // фолбэк: резолвим имя → профиль по точному совпадению full_name.
  const legacyNames = c.contacts.filter((ct) => !ct.userId).map((ct) => ct.name.trim()).filter(Boolean)
  const contactsKey = legacyNames.join('|')
  const [contactProfiles, setContactProfiles] = useState<Record<string, { id: string; avatar?: string }>>({})
  useEffect(() => {
    const names = Array.from(new Set(legacyNames))
    if (!names.length) {
      setContactProfiles({})
      return
    }
    let alive = true
    void (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('full_name', names)
      if (!alive || !data) return
      const map: Record<string, { id: string; avatar?: string }> = {}
      for (const p of data as { id: string; full_name: string | null; avatar_url: string | null }[]) {
        const key = (p.full_name ?? '').trim().toLowerCase()
        if (key && !map[key]) map[key] = { id: p.id, avatar: p.avatar_url ?? undefined }
      }
      setContactProfiles(map)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsKey])

  return (
    <>
      {completion.percent >= 100 ? null : (
      <div className={styles.card}>
        <div className={styles.cardLabel}>Готовность профиля</div>
        <div className={styles.compRow}>
          <div className={styles.compRing} style={{ ['--p' as string]: `${completion.percent}%` }}>
            <span>{completion.percent}%</span>
          </div>
          <div className={styles.compMeta}>
            <div className={styles.compTitle}>Почти готово</div>
            <div className={styles.compSub}>
              {`Заполни ещё ${remaining} — и страница станет заметнее`}
            </div>
          </div>
        </div>
        {expanded ? (
          <div className={styles.compList}>
            {completion.items.map((it) => (
              <button
                key={it.id}
                type="button"
                className={[styles.compItem, it.done ? styles.compDone : ''].join(' ')}
                onClick={() => !it.done && it.target && onOpen(it.target as ModalKind)}
                disabled={it.done}
              >
                <span className={styles.compCheck}>{it.done ? <Ic.check /> : null}</span>
                <span className={styles.compText}>{it.text}</span>
                {!it.done ? <span className={styles.compArr}><Ic.arrowRight /></span> : null}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className={styles.compToggle} onClick={() => setExpanded((v) => !v)}>
          {expanded ? <>Свернуть <Ic.chevronUp /></> : <>Что заполнить <Ic.chevronDown /></>}
        </button>
      </div>
      )}

      <CompanyPulse />

      {myId ? <ArticlesBlock authorId={myId} canEdit title="Статьи компании" /> : null}

      <div className={styles.card}>
        <div className={styles.contactsHead}>
          <span className={styles.cardLabel} style={{ margin: 0 }}>Контакты</span>
          <button type="button" className={styles.secEdit} onClick={() => onOpen('contacts')} aria-label="Редактировать контакты">
            <Ic.pencil />
          </button>
        </div>
        {c.contacts.length ? (
          <div className={styles.contactsList}>
            {c.contacts.map((ct) => {
              const prof = ct.userId
                ? { id: ct.userId, avatar: ct.avatar }
                : contactProfiles[ct.name.trim().toLowerCase()]
              const inner = (
                <>
                  <span className={styles.contactAva}>
                    {prof?.avatar ? (
                      <img src={prof.avatar} alt="" className={styles.contactAvaImg} />
                    ) : (
                      (ct.name || '?').slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className={styles.contactMeta}>
                    <div className={styles.contactName}>{ct.name}</div>
                    <div className={styles.contactRole}>
                      {ct.kind === 'founder' ? 'Основатель' : 'Команда найма'}
                      {ct.position ? ` · ${ct.position}` : ''}
                    </div>
                  </div>
                </>
              )
              return prof ? (
                <button
                  key={ct.id}
                  type="button"
                  className={[styles.contactRow, styles.contactRowClickable].join(' ')}
                  onClick={() => nav(`/u/${prof.id}`)}
                >
                  {inner}
                </button>
              ) : (
                <div key={ct.id} className={styles.contactRow}>
                  {inner}
                </div>
              )
            })}
          </div>
        ) : (
          <button type="button" className={styles.emptyAdd} onClick={() => onOpen('contacts')}>+ Добавить контакты</button>
        )}
      </div>

      <SupportLinks />
    </>
  )
}
