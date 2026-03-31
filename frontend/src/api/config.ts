// Tất cả API call phải đi qua Vite proxy (cùng origin) — không hardcode URL backend
// Dùng api instance từ @/lib/api cho axios calls
// Dùng BASE_URL chỉ cho những chỗ BẮT BUỘC dùng fetch() trực tiếp (xhr upload, v.v.)
export const BASE_URL = "";  // proxy xử lý — để trống = cùng origin
