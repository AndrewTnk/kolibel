import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Respect the port assigned by the harness (autoPort sets PORT); fall back to Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
