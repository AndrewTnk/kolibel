import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Respect the port assigned by the harness (autoPort sets PORT); fall back to Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    // Локальный аналог rewrite'а из vercel.json: `/sb/*` → Supabase. Нужен, чтобы
    // в dev работали и запросы клиента, и `/sb`-ссылки на картинки (одинаково с продом).
    // Локально ходит напрямую в Supabase — под VPN всё работает.
    proxy: {
      "/sb": {
        target: "https://oobutqfpxykxzrilhokn.supabase.co",
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/sb/, ""),
      },
      // Скриншоты сайтов для карточек-ссылок портфолио (mShots от WordPress).
      // На проде тот же rewrite в vercel.json (`/shot/*`) — хоп через Vercel, как /sb.
      "/shot": {
        target: "https://s0.wp.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/shot/, "/mshots/v1"),
      },
    },
  },
});
