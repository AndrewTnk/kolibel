import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import {
  signOut,
  switchAccount,
} from "../../../features/auth/model/authThunks.ts";
import {
  getSavedAccounts,
  removeSavedAccount,
  type SavedAccount,
} from "../../../features/auth/lib/accountsStore";
import { useIsMobile } from "../../lib/useMediaQuery";
import { vacanciesActions } from "../../../features/vacancies/model/vacanciesSlice";
import { profileActions } from "../../../features/profile/model/profileSlice";
import { companyActions } from "../../../features/company/model/companySlice";
import { networkActions } from "../../../features/network/model/networkSlice";
import { NotificationsMenu } from "../../../features/notifications/ui/NotificationsMenu";
import { MobilePostComposer } from "../../../features/feed/ui/MobilePostComposer";
import { AuthModal } from "../../../features/auth/ui/AuthModal";
import { GlobalSearch } from "../../../features/search/ui/GlobalSearch";
import { BottomNav } from "../BottomNav/BottomNav";
import styles from "./AppHeader.module.css";

/** Название текущего раздела для мобильного тайтл-бара (по маршруту). */
function pageTitleFor(pathname: string): string {
  if (pathname === "/") return "Главная";
  if (pathname.startsWith("/vacancies") || pathname.startsWith("/my-vacancies"))
    return "Вакансии";
  if (pathname.startsWith("/profile")) return "Профиль";
  if (pathname.startsWith("/network")) return "Сеть";
  if (pathname.startsWith("/chat")) return "Чат";
  if (pathname.startsWith("/settings")) return "Настройки";
  if (pathname.startsWith("/u/")) return "Профиль";
  return "";
}

export function AppHeader({ hideBarOnMobile = false }: { hideBarOnMobile?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const pageTitle = pageTitleFor(pathname);
  const user = useAppSelector((s) => s.auth.user);
  const resume = useAppSelector((s) => s.profile.resume);
  const company = useAppSelector((s) => s.company.profile);
  const accountType = useAppSelector((s) => s.account.type);
  const isCompany = accountType === "company";
  const adminRole = useAppSelector((s) => s.admin.role);

  const links = [
    { to: "/", label: "Главная" },
    isCompany
      ? { to: "/my-vacancies", label: "Мои вакансии" }
      : { to: "/vacancies", label: "Вакансии" },
    { to: "/profile", label: "Профиль" },
    { to: "/network", label: "Сеть" },
    { to: "/chat", label: "Чат" },
  ];
  const recSearch = useAppSelector((s) => s.network.recSearch);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [netSearchOpen, setNetSearchOpen] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const netInputRef = useRef<HTMLInputElement | null>(null);
  // Имя текущего аккаунта берём из загруженного профиля (компания → companies.name,
  // юзер → profiles.full_name). Метаданные/почта — только запасной вариант.
  const metaName =
    (user?.user_metadata as any)?.full_name?.toString?.() ||
    (user?.user_metadata as any)?.name?.toString?.() ||
    (user?.email ? user.email.split("@")[0] : "");
  const name = isCompany
    ? company.name?.trim() || metaName || "Компания"
    : resume.fullName?.trim() || metaName || "Профиль";
  // Фото текущего аккаунта: у компании — бейдж-лого (или фото профиля), у юзера — аватар.
  const myAvatar = isCompany ? company.logo || company.avatar : resume.avatar;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase() || "U";
  // Лимит устройства — максимум 3 аккаунта (текущий + до 2 дополнительных).
  const MAX_ACCOUNTS = 3;
  const totalAccounts = accounts.some((a) => a.id === user?.id)
    ? accounts.length
    : accounts.length + 1;
  const canAddAccount = totalAccounts < MAX_ACCOUNTS;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Фокус в поле поиска сети при раскрытии.
  useEffect(() => {
    if (netSearchOpen) netInputRef.current?.focus();
  }, [netSearchOpen]);

  // На некоторых экранах (чат) верхний бар на мобилке скрываем, но таб-бар оставляем.
  const showBar = !(isMobile && hideBarOnMobile);

  return (
    <>
      {showBar ? (
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.left}>
            {isMobile ? (
              <div
                className={[
                  styles.mobileTitle,
                  netSearchOpen ? styles.mobileTitleHidden : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pageTitle}
              </div>
            ) : (
              <>
                <NavLink to="/" className={styles.brand} aria-label="Kolibel">
                  <img
                    src="/logo/kolibel-full.png"
                    alt="Kolibel"
                    className={`${styles.brandImg} ${styles.brandLight}`}
                  />
                  <img
                    src="/logo/kolibel-full-dark.png"
                    alt="Kolibel"
                    className={`${styles.brandImg} ${styles.brandDark}`}
                  />
                </NavLink>

                <nav className={styles.nav} aria-label="Навигация">
                  {links.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.to === "/"}
                      className={({ isActive }) =>
                        [styles.navLink, isActive ? styles.navLinkActive : ""].join(
                          " ",
                        )
                      }
                    >
                      {l.label}
                    </NavLink>
                  ))}
                </nav>

                <GlobalSearch />
              </>
            )}
          </div>

          <div className={styles.right}>
            {/* Поиск (выезжает влево) + граф сети — на вкладке «Сеть» (мобилка) */}
            {isMobile && pathname.startsWith("/network") ? (
              <>
                <div
                  className={[
                    styles.netSearch,
                    netSearchOpen ? styles.netSearchOpen : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    ref={netInputRef}
                    className={styles.netSearchInput}
                    value={recSearch}
                    onChange={(e) =>
                      dispatch(networkActions.setRecSearch(e.target.value))
                    }
                    placeholder="Поиск в сети"
                    aria-label="Поиск в сети"
                  />
                  <button
                    type="button"
                    className={styles.hdrIconBtn}
                    aria-label="Поиск"
                    onClick={() =>
                      setNetSearchOpen((v) => {
                        if (v) dispatch(networkActions.setRecSearch(""));
                        return !v;
                      })
                    }
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.2-3.2" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.hdrIconBtn}
                  aria-label="Состав сети"
                  title="Состав сети"
                  onClick={() => dispatch(networkActions.openGraphModal())}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="5" cy="6" r="2.2" />
                    <circle cx="18" cy="7" r="2.2" />
                    <circle cx="12" cy="17" r="2.4" />
                    <path d="M7 7.2 10.5 15M16.4 8.6 13 15.2M7 6.4h8.8" />
                  </svg>
                </button>
              </>
            ) : null}

            {/* Иконки аналитики и нового поста — на своём профиле (мобилка, юзер и компания) */}
            {isMobile && pathname === "/profile" ? (
              <>
                <button
                  type="button"
                  className={styles.hdrIconBtn}
                  aria-label="Аналитика профиля"
                  title="Аналитика профиля"
                  onClick={() =>
                    dispatch(
                      isCompany
                        ? companyActions.openAnalytics()
                        : profileActions.openAnalytics(),
                    )
                  }
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 3v18h18" />
                    <path d="m7 14 3-4 3 3 4-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.hdrIconBtn}
                  aria-label="Новый пост"
                  title="Новый пост"
                  onClick={() => setComposerOpen(true)}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </>
            ) : null}

            {/* «+» Опубликовать вакансию + Папки — на «Мои вакансии» (мобилка, компания) */}
            {isMobile && pathname.startsWith("/my-vacancies") ? (
              <>
                <button
                  type="button"
                  className={styles.hdrIconBtn}
                  aria-label="Опубликовать вакансию"
                  title="Опубликовать вакансию"
                  onClick={() => dispatch(vacanciesActions.openCreateVacancy())}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.hdrIconBtn}
                  aria-label="Папки"
                  title="Папки"
                  onClick={() => dispatch(vacanciesActions.openFoldersModal())}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </button>
              </>
            ) : null}

            {/* Иконка графа сети — на чужом профиле (мобилка): открывает граф на весь экран */}
            {isMobile && pathname.startsWith("/u/") ? (
              <button
                type="button"
                className={styles.hdrIconBtn}
                aria-label="Сеть профиля"
                title="Сеть профиля"
                onClick={() => dispatch(networkActions.openPublicGraph())}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="5" cy="6" r="2.2" />
                  <circle cx="18" cy="7" r="2.2" />
                  <circle cx="12" cy="17" r="2.4" />
                  <path d="M7 7.2 10.5 15M16.4 8.6 13 15.2M7 6.4h8.8" />
                </svg>
              </button>
            ) : null}

            {/* Иконка откликов — на странице вакансий (мобилка, соискатель) */}
            {isMobile && pathname.startsWith("/vacancies") && !isCompany ? (
              <button
                type="button"
                className={styles.hdrIconBtn}
                aria-label="Мои отклики"
                title="Мои отклики"
                onClick={() => dispatch(vacanciesActions.openApplications())}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="m9 14 2 2 4-4" />
                </svg>
              </button>
            ) : null}

            {!isMobile || isHome ? (
              <>
                {isMobile ? (
                  <button
                    type="button"
                    className={styles.hdrIconBtn}
                    aria-label="Новый пост"
                    title="Новый пост"
                    onClick={() => setComposerOpen(true)}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                ) : null}

                <NotificationsMenu />
              </>
            ) : null}

            {/* Кнопка-аккаунт (фото + меню) — на каждой странице, последняя в правом углу */}
            <div className={styles.userMenu} ref={menuRef}>
              <button
                className={[
                  styles.userBtn,
                  isCompany ? styles.userBtnSquare : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setMenuOpen((v) => {
                    if (!v) setAccounts(getSavedAccounts());
                    return !v;
                  });
                }}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={name}
                title={name}
              >
                <span className={styles.userAvatar} aria-hidden>
                  {myAvatar ? <img src={myAvatar} alt="" /> : initials}
                </span>
              </button>

              {menuOpen ? (
                <div className={styles.acctMenu} role="menu">
                  {(() => {
                    const hasCurrent = accounts.some((a) => a.id === user?.id);
                    const rows: {
                      id: string;
                      name: string;
                      role: string;
                      avatar?: string;
                      type: string;
                      current: boolean;
                    }[] = accounts.map((a) => {
                      const current = a.id === user?.id;
                      return {
                        id: a.id,
                        // текущий аккаунт — имя/фото из загруженного профиля (реестр может быть устаревшим)
                        name: current ? name : a.name,
                        role:
                          a.accountType === "company"
                            ? "Компания"
                            : "Личный профиль",
                        avatar: current ? myAvatar : a.avatar,
                        type: a.accountType,
                        current,
                      };
                    });
                    if (!hasCurrent && user?.id) {
                      rows.unshift({
                        id: user.id,
                        name,
                        role: isCompany ? "Компания" : "Личный профиль",
                        avatar: myAvatar,
                        type: isCompany ? "company" : "user",
                        current: true,
                      });
                    }
                    return rows.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        role="menuitem"
                        className={[
                          styles.acctRow,
                          r.current ? styles.acctRowCur : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={r.current}
                        onClick={() => {
                          setMenuOpen(false);
                          void dispatch(switchAccount(r.id)).then((res) => {
                            if (switchAccount.fulfilled.match(res)) nav("/");
                          });
                        }}
                        title={r.name}
                      >
                        <span
                          className={[
                            styles.acctAv,
                            r.type === "company" ? styles.acctAvSquare : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden
                        >
                          {r.avatar ? (
                            <img src={r.avatar} alt="" />
                          ) : (
                            r.name
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase() || "U"
                          )}
                        </span>
                        <span className={styles.acctMeta}>
                          <span className={styles.acctNm}>{r.name}</span>
                          <span className={styles.acctRo}>{r.role}</span>
                        </span>
                        {r.current ? (
                          <span className={styles.acctBadge}>текущий</span>
                        ) : null}
                      </button>
                    ));
                  })()}

                  <div className={styles.acctSep} />

                  {canAddAccount ? (
                    <button
                      className={[styles.acctAct, styles.acctActAdd].join(" ")}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setNewAccountOpen(true);
                      }}
                    >
                      <span className={styles.acctActIco}>+</span> Добавить
                      аккаунт
                    </button>
                  ) : (
                    <div className={styles.acctLimit}>
                      Можно войти максимум в {MAX_ACCOUNTS} аккаунта
                    </div>
                  )}
                  {adminRole ? (
                    <button
                      className={styles.acctAct}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        nav("/admin");
                      }}
                    >
                      <span className={styles.acctActIco} aria-hidden>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
                        </svg>
                      </span>{" "}
                      Админ-панель
                    </button>
                  ) : null}
                  <button
                    className={styles.acctAct}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      nav("/settings");
                    }}
                  >
                    <span className={styles.acctActIco} aria-hidden>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8" />
                      </svg>
                    </span>{" "}
                    Настройки аккаунта
                  </button>
                  <button
                    className={styles.acctAct}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      // Выход = убрать текущий аккаунт из реестра переключения.
                      // Если остаётся другой — сразу переключаемся на него,
                      // иначе полный выход на окно авторизации.
                      const others = getSavedAccounts().filter(
                        (a) => a.id !== user?.id,
                      );
                      if (user?.id) removeSavedAccount(user.id);
                      if (others.length > 0) {
                        void dispatch(switchAccount(others[0].id)).then(
                          (res) => {
                            if (switchAccount.fulfilled.match(res)) {
                              nav("/");
                            } else {
                              void dispatch(signOut());
                              nav("/auth", { replace: true });
                            }
                          },
                        );
                      } else {
                        void dispatch(signOut());
                        nav("/auth", { replace: true });
                      }
                    }}
                  >
                    <span className={styles.acctActIco} aria-hidden>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>{" "}
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {newAccountOpen ? (
          <AuthModal onClose={() => setNewAccountOpen(false)} />
        ) : null}
      </header>
      ) : null}

      {composerOpen ? (
        <MobilePostComposer onClose={() => setComposerOpen(false)} />
      ) : null}

      <BottomNav />
    </>
  );
}
