import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../app/store/hooks";
import { authActions } from "../model/authSlice";
import { AuthForm } from "./AuthForm";
import styles from "./AuthModal.module.css";

/** Модалка «Добавить аккаунт» из меню шапки — наша полноценная авторизация (вход/регистрация).
 *  Успешный вход/регистрация при активной сессии добавляет аккаунт в реестр и делает его текущим. */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(authActions.clearError());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, dispatch]);

  return createPortal(
    <div
      className={styles.scrim}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal
      aria-label="Добавить аккаунт"
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
        <AuthForm
          addMode
          onSuccess={() => {
            onClose();
            navigate("/");
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
