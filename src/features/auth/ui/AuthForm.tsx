import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { authActions } from "../model/authSlice";
import { signIn, signUp } from "../model/authThunks.ts";
import { Button } from "../../../shared/ui/Button/Button";
import { Input } from "../../../shared/ui/Input/Input";
import styles from "./AuthPage.module.css";

type Mode = "login" | "register";
type AccountKind = "user" | "company";

function isEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v);
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function CompanyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="11" height="18" rx="1.5" />
      <path d="M15 8h5v13H4M8 7h3M8 11h3M8 15h3" />
    </svg>
  );
}

type Props = {
  /** Вызывается после успешного входа/регистрации. */
  onSuccess: () => void;
  /** Режим добавления аккаунта (модалка в шапке): меняет подсказки. */
  addMode?: boolean;
};

/** Форма авторизации (вход/регистрация) — общая для страницы `/auth` и модалки «Добавить аккаунт». */
export function AuthForm({ onSuccess, addMode = false }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);

  const [mode, setMode] = useState<Mode>("login");
  const [accountKind, setAccountKind] = useState<AccountKind>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const busy = status === "loading";
  const isRegister = mode === "register";

  const validation = useMemo(() => {
    const e: Record<string, string | null> = { email: null, password: null, password2: null };
    if (email && !isEmail(email)) e.email = "Проверь email";
    if (password && password.length < 6) e.password = "Минимум 6 символов";
    if (mode === "register" && password2 && password2 !== password) e.password2 = "Пароли не совпадают";
    return e;
  }, [email, password, password2, mode]);

  function switchMode(m: Mode) {
    dispatch(authActions.clearError());
    setMode(m);
    setTouched({});
  }

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(authActions.clearError());
    setTouched({ email: true, password: true, password2: true });

    if (!email || !isEmail(email)) return;
    if (!password || password.length < 6) return;
    if (mode === "register") {
      if (!password2 || password2 !== password) return;
      const res = await dispatch(
        signUp({
          email,
          password,
          fullName: fullName.trim() || undefined,
          accountType: accountKind,
        }),
      );
      if (signUp.fulfilled.match(res)) onSuccess();
      return;
    }

    const res = await dispatch(signIn({ email, password }));
    if (signIn.fulfilled.match(res)) onSuccess();
  }

  const submitDisabled =
    busy ||
    !email ||
    !password ||
    (mode === "register" && (!password2 || password2 !== password)) ||
    !!validation.email ||
    !!validation.password ||
    !!validation.password2;

  const pwToggle = (
    <button
      type="button"
      className={styles.eye}
      onClick={() => setShowPw((s) => !s)}
      aria-label={showPw ? "Скрыть пароль" : "Показать пароль"}
      tabIndex={-1}
    >
      <EyeIcon off={showPw} />
    </button>
  );

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Авторизация">
        <button
          type="button"
          className={[styles.tab, !isRegister ? styles.tabActive : ""].join(" ")}
          onClick={() => switchMode("login")}
          role="tab"
          aria-selected={!isRegister}
        >
          Вход
        </button>
        <button
          type="button"
          className={[styles.tab, isRegister ? styles.tabActive : ""].join(" ")}
          onClick={() => switchMode("register")}
          role="tab"
          aria-selected={isRegister}
        >
          Регистрация
        </button>
      </div>

      <h1 className={styles.headline}>{isRegister ? "Создай аккаунт" : "С возвращением"}</h1>
      <p className={styles.subhead}>
        {addMode
          ? isRegister
            ? "Новый профиль — переключаться можно в любой момент."
            : "Войди в другой аккаунт — он добавится к текущему."
          : isRegister
            ? "Пара шагов — и ты в сети профессионалов."
            : "Рады видеть снова. Войди, чтобы продолжить."}
      </p>

      <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        {isRegister ? (
          <>
            <div className={styles.segmented} role="tablist" aria-label="Тип аккаунта">
              <button
                type="button"
                role="tab"
                aria-selected={accountKind === "user"}
                className={[styles.segItem, accountKind === "user" ? styles.segItemActive : ""].join(" ")}
                onClick={() => setAccountKind("user")}
              >
                <PersonIcon /> Я ищу работу
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={accountKind === "company"}
                className={[styles.segItem, accountKind === "company" ? styles.segItemActive : ""].join(" ")}
                onClick={() => setAccountKind("company")}
              >
                <CompanyIcon /> Я компания
              </button>
            </div>

            <Input
              label={accountKind === "company" ? "Название компании" : "Имя"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete={accountKind === "company" ? "organization" : "name"}
              placeholder={accountKind === "company" ? "Компания" : "Имя"}
            />
          </>
        ) : null}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => touch("email")}
          autoComplete="email"
          placeholder="Email"
          error={touched.email ? validation.email : null}
        />

        <Input
          label="Пароль"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => touch("password")}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
          error={touched.password ? validation.password : null}
          hint={isRegister ? "Минимум 6 символов" : undefined}
          endAdornment={pwToggle}
        />

        {isRegister ? (
          <Input
            label="Повтори пароль"
            type={showPw ? "text" : "password"}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onBlur={() => touch("password2")}
            autoComplete="new-password"
            placeholder="••••••••"
            error={touched.password2 ? validation.password2 : null}
          />
        ) : null}

        {!isRegister ? (
          <div className={styles.rowBetween}>
            <label className={styles.check}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className={styles.box}>
                <CheckMark />
              </span>
              Запомнить меня
            </label>
            <button
              type="button"
              className={styles.forgot}
              onClick={() => {
                /* TODO: страница/модалка восстановления пароля — /auth/forgot */
              }}
            >
              Забыли пароль?
            </button>
          </div>
        ) : null}

        {error ? <div className={styles.serverError}>{error}</div> : null}

        <Button type="submit" fullWidth className={styles.submit} disabled={submitDisabled}>
          {busy ? "Подожди…" : isRegister ? "Зарегистрироваться" : "Войти"}
        </Button>

        <div className={styles.swap}>
          {isRegister ? (
            <>
              Уже есть аккаунт?{" "}
              <button type="button" onClick={() => switchMode("login")}>
                Войти
              </button>
            </>
          ) : (
            <>
              Нет аккаунта?{" "}
              <button type="button" onClick={() => switchMode("register")}>
                Регистрация
              </button>
            </>
          )}
        </div>

        <div className={styles.disclaimer}>
          Продолжая, ты соглашаешься с{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>
            условиями
          </a>{" "}
          и{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>
            политикой данных
          </a>
          .
        </div>
      </form>
    </>
  );
}
