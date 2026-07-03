import { RouterProvider } from "react-router-dom";
import { router } from "./app/router/router";
import { AuthBootstrap } from "./features/auth/ui/AuthBootstrap";
import { BlockedScreen } from "./features/auth/ui/BlockedScreen";
import { SupportModal } from "./features/support/ui/SupportModal";
import { ChatRealtime } from "./features/chat/ui/ChatRealtime";
import { NotificationsRealtime } from "./features/notifications/ui/NotificationsRealtime";
import { PresenceTracker } from "./features/presence/ui/PresenceTracker";

function App() {
  return (
    <>
      <AuthBootstrap />
      <ChatRealtime />
      <NotificationsRealtime />
      <PresenceTracker />
      {/* Глобальные оверлеи (мини-чат, модалка вакансии, тост) вынесены в RootLayout —
          ВНУТРЬ роутера, чтобы их <Link>/навигация работали (мини-чат ссылается на /u/:id). */}
      <RouterProvider router={router} />
      {/* Экран блокировки поверх всего: заблокированный аккаунт в приложение не пускаем. */}
      <BlockedScreen />
      {/* Модалка поддержки — ВНЕ роутера (без <Link>) и выше BlockedScreen (z 5100):
          заблокированный может оспорить блокировку. */}
      <SupportModal />
    </>
  );
}

export default App;
