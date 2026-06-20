import { useEffect, useState } from "react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../app/store/hooks";
import { useMediaQuery } from "../../../shared/lib/useMediaQuery";
import { AuthForm } from "./AuthForm";
import { GraphHero } from "./GraphHero";
import styles from "./AuthPage.module.css";

export function AuthPage() {
  const nav = useNavigate();
  const location = useLocation();

  const session = useAppSelector((s) => s.auth.session);

  // Интро-анимация на мобилке: сначала правая часть (граф) на весь экран,
  // затем плавный переход к форме. Срабатывает там же, где скрыт `.right` (≤920px).
  const isNarrow = useMediaQuery("(max-width: 920px)");
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [intro, setIntro] = useState(isNarrow && !prefersReduced);
  const [introHiding, setIntroHiding] = useState(false);

  // Авто-уход интро через паузу.
  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => setIntroHiding(true), 2200);
    return () => window.clearTimeout(t);
  }, [intro]);

  // Когда интро начало прятаться — размонтируем после завершения перехода.
  useEffect(() => {
    if (!introHiding) return;
    const t = window.setTimeout(() => setIntro(false), 650);
    return () => window.clearTimeout(t);
  }, [introHiding]);

  const from = (location.state as any)?.from as string | undefined;
  // Режим добавления аккаунта: открыто из переключателя при активной сессии
  const addMode = new URLSearchParams(location.search).get("add") === "1";

  if (session && !addMode) return <Navigate to={from ?? "/"} replace />;

  const rightContent = (
    <>
      <GraphHero density={1} />
      <div className={styles.rightOverlay}>
        <div className={styles.heroEyebrow}>
          <img src="/logo/kolibel-full.png" alt="Kolibel" />
          <span>сеть профессионалов</span>
        </div>

        <div className={styles.heroText}>
          <h2 className={styles.heroTitle}>
            Здесь связи становятся <b>возможностями</b>.
          </h2>
          <p className={styles.heroSub}>
            Вакансии, компании и нужные люди — в одной тёплой сети. Один профиль открывает двери ко
            всем остальным.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.num}>12K+</div>
              <div className={styles.lab}>специалистов</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.num}>1 800</div>
              <div className={styles.lab}>компаний</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.num}>3 400</div>
              <div className={styles.lab}>вакансий</div>
            </div>
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legItem}>
            <span className={styles.legDot} style={{ background: "#ff7f50" }} />
            Ты и связи
          </span>
          <span className={styles.legItem}>
            <span className={styles.legDot} style={{ background: "#f3b89e" }} />
            2-й круг
          </span>
          <span className={styles.legItem}>
            <span className={[styles.legDot, styles.legDotSq].join(" ")} style={{ background: "#ff7f50" }} />
            Компании
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.auth}>
      {/* ЛЕВО — форма */}
      <div className={styles.left}>
        <div className={styles.brandRow}>
          <NavLink to="/" aria-label="Kolibel">
            <img src="/logo/kolibel-full.png" alt="Kolibel" className={styles.brandLogo} />
          </NavLink>
        </div>

        <div className={styles.formWrap}>
          <AuthForm
            addMode={addMode}
            onSuccess={() => nav(from ?? "/", { replace: true })}
          />
        </div>

        <div className={styles.leftFoot}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            О нас
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Тех. поддержка
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Справочный центр
          </a>
        </div>
      </div>

      {/* ПРАВО — живой граф связей (на десктопе) */}
      <div className={styles.right}>{!isNarrow ? rightContent : null}</div>

      {/* Интро на мобилке: граф на весь экран → плавный переход к форме (тап — пропустить) */}
      {intro ? (
        <div
          className={[styles.intro, introHiding ? styles.introHiding : ""].join(" ")}
          onClick={() => setIntroHiding(true)}
          role="button"
          tabIndex={0}
          aria-label="Продолжить ко входу"
        >
          {rightContent}
        </div>
      ) : null}
    </div>
  );
}
