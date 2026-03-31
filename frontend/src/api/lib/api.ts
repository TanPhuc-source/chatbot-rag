import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const api = axios.create({
  baseURL: "", // Vite proxy xử lý — cùng origin, không CORS
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    const isAuthMe = url.includes("/auth/me");
    const isLoginPage = window.location.pathname === "/login";

    // Chỉ auto-logout nếu:
    // 1. Lỗi 401 thật sự (không phải do race condition khi app mới load)
    // 2. Cookie đã được xác nhận sẵn sàng (cookieReady = true)
    // 3. Không phải đang check session init
    // 4. Không phải đang ở trang login
    const { cookieReady } = useAuthStore.getState();

    if (status === 401 && cookieReady && !isAuthMe && !isLoginPage) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
