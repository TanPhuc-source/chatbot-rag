import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      "localhost",
      ".ngrok-free.app",
      ".ngrok.io",
      ".ngrok-free.dev",
    ],
    proxy: {
      "/auth":        { target: "http://localhost:8000", changeOrigin: true },
      "/chat":        { target: "http://localhost:8000", changeOrigin: true },
      "/upload":      { target: "http://localhost:8000", changeOrigin: true },
      "/history":     { target: "http://localhost:8000", changeOrigin: true },
      "/feedback":    { target: "http://localhost:8000", changeOrigin: true },
      "/settings":    { target: "http://localhost:8000", changeOrigin: true },
      "/faq":         { target: "http://localhost:8000", changeOrigin: true },
      "/analytics":   { target: "http://localhost:8000", changeOrigin: true },
      "/ui-settings": { target: "http://localhost:8000", changeOrigin: true },
      "/permissions": { target: "http://localhost:8000", changeOrigin: true },
      "/forms":       { target: "http://localhost:8000", changeOrigin: true },
      "/uploads":     { target: "http://localhost:8000", changeOrigin: true },
      "/static":      { target: "http://localhost:8000", changeOrigin: true },
      "/health":      { target: "http://localhost:8000", changeOrigin: true },

      // Chỉ proxy đúng các API endpoint của /admin (documents, users)
      // KHÔNG proxy /admin/records, /admin/faq... vì đó là frontend routes
      "^/admin/documents": { target: "http://localhost:8000", changeOrigin: true },
      "^/admin/users":     { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});