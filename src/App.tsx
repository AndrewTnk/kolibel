import { RouterProvider } from "react-router-dom";
import { router } from "./app/router/router";
import { AuthBootstrap } from "./features/auth/ui/AuthBootstrap";
import { ChatRealtime } from "./features/chat/ui/ChatRealtime";
import { NotificationsRealtime } from "./features/notifications/ui/NotificationsRealtime";

function App() {
  return (
    <>
      <AuthBootstrap />
      <ChatRealtime />
      <NotificationsRealtime />
      {/* Глобальные оверлеи (мини-чат, модалка вакансии, тост) вынесены в RootLayout —
          ВНУТРЬ роутера, чтобы их <Link>/навигация работали (мини-чат ссылается на /u/:id). */}
      <RouterProvider router={router} />
    </>
  );
}

export default App;
