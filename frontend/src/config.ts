/**
 * config.ts — URL gốc của backend, đọc từ env một chỗ duy nhất.
 *
 * Khi chạy local:     VITE_API_URL không set → dùng "" (proxy qua Vite)
 * Khi dùng ngrok:     VITE_API_URL=https://xxxx.ngrok-free.app
 * Khi build production: VITE_API_URL=https://your-domain.com
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default API_BASE;