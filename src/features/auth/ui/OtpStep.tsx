import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useAppDispatch } from "../../../app/store/hooks";
import { resendSignupOtp, verifyEmailOtp } from "../model/authThunks";
import styles from "./AuthPage.module.css";

const LEN = 6;
const RESEND_SECONDS = 60;

type Props = {
  /** Почта, на которую ушёл код. */
  email: string;
  /** Код подтверждён и сессия получена — можно уводить дальше (на онбординг). */
  onVerified: () => void;
  /** Вернуться к форме (сменить почту). */
  onBack: () => void;
};

/**
 * Шаг подтверждения регистрации: ввод 6-значного кода из письма.
 * Автоподтверждение при вводе всех цифр (без кнопки) + повторная отправка через минуту.
 */
export function OtpStep({ email, onVerified, onBack }: Props) {
  const dispatch = useAppDispatch();

  const [digits, setDigits] = useState<string[]>(() => Array(LEN).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Последний проверенный код — чтобы автоподтверждение не зациклилось на той же 6-значке.
  const lastTried = useRef<string>("");

  const code = digits.join("");

  // Фокус на первом поле при появлении шага.
  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // Обратный отсчёт до повторной отправки.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn]);

  // Автоподтверждение: как только введены все 6 цифр — проверяем без нажатия кнопки.
  useEffect(() => {
    if (code.length === LEN && !verifying && lastTried.current !== code) {
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function verify(value: string) {
    lastTried.current = value;
    setVerifying(true);
    setError(null);
    const res = await dispatch(verifyEmailOtp({ email, token: value }));
    setVerifying(false);
    if (verifyEmailOtp.fulfilled.match(res)) {
      onVerified();
    } else {
      setError(res.error?.message ?? "Неверный код");
      setDigits(Array(LEN).fill(""));
      // Разрешаем повторить ввод того же кода (сброс дедупа автоподтверждения).
      lastTried.current = "";
      inputs.current[0]?.focus();
    }
  }

  function setAt(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    setDigits((d) => {
      const n = [...d];
      if (!clean) {
        n[i] = "";
        return n;
      }
      // Одна цифра — в текущее поле; несколько (автозаполнение) — распределяем дальше.
      let idx = i;
      for (const c of clean.split("")) {
        if (idx < LEN) n[idx++] = c;
      }
      return n;
    });
    if (clean) inputs.current[Math.min(i + clean.length, LEN - 1)]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    const n = Array(LEN).fill("");
    text.split("").forEach((c, idx) => (n[idx] = c));
    setDigits(n);
    inputs.current[Math.min(text.length, LEN - 1)]?.focus();
  }

  async function resend() {
    if (resendIn > 0) return;
    setError(null);
    setResent(false);
    const res = await dispatch(resendSignupOtp(email));
    if (resendSignupOtp.fulfilled.match(res)) {
      setResent(true);
      setResendIn(RESEND_SECONDS);
      lastTried.current = "";
      setDigits(Array(LEN).fill(""));
      inputs.current[0]?.focus();
    } else {
      setError(res.error?.message ?? "Не удалось отправить код");
    }
  }

  return (
    <div className={styles.otpWrap}>
      <button type="button" className={styles.otpBack} onClick={onBack}>
        ← Изменить почту
      </button>

      <h1 className={styles.headline}>Подтверди почту</h1>
      <p className={styles.subhead}>
        Мы отправили 6-значный код на <b>{email}</b>. Введи его ниже — подтверждение произойдёт
        автоматически.
      </p>

      <div className={styles.otpBoxes} onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            className={[styles.otpBox, error ? styles.otpBoxError : ""].filter(Boolean).join(" ")}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            disabled={verifying}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            aria-label={`Цифра ${i + 1}`}
          />
        ))}
      </div>

      {verifying ? <div className={styles.otpStatus}>Проверяем код…</div> : null}
      {error ? <div className={styles.serverError}>{error}</div> : null}
      {resent && !error ? <div className={styles.otpStatusOk}>Код отправлен повторно</div> : null}

      <div className={styles.otpResend}>
        {resendIn > 0 ? (
          <span>Отправить код повторно можно через {resendIn} с</span>
        ) : (
          <button type="button" onClick={() => void resend()}>
            Отправить код повторно
          </button>
        )}
      </div>
    </div>
  );
}
