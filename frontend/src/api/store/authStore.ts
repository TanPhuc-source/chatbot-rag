import { create } from "zustand";
import api from "@/lib/api";

interface AuthState {
  username: string | null;
  role: string | null;
  isLoggedIn: boolean;
  // Flag này chỉ true sau khi init() hoàn tất.
  // Cookie được browser nhận trong response /auth/login,
  // nhưng chỉ sẵn sàng gửi đi sau khi browser xử lý response đó xong.
  // init() chạy sau khi App mount → đảm bảo cookie đã flush.
  // Mọi component cần fetch API protected phải chờ cookieReady = true.
  cookieReady: boolean;
  login: (role: string, username: string) => void;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  username: null,
  role: null,
  isLoggedIn: false,
  cookieReady: false,

  init: async () => {
    try {
      const response = await api.get("/auth/me");
      set({
        username: response.data.username,
        role: response.data.role,
        isLoggedIn: true,
        cookieReady: true,
      });
    } catch (error) {
      set({ username: null, role: null, isLoggedIn: false, cookieReady: true });
    }
  },

  login: (role, username) => {
    // Sau khi login thành công, gọi init() để đồng bộ cookie → cookieReady
    set({ role, username, isLoggedIn: true, cookieReady: false });
    // init() sẽ được gọi bởi LoginPage sau khi authLogin() để set cookieReady
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Lỗi khi logout:", error);
    } finally {
      set({ role: null, username: null, isLoggedIn: false, cookieReady: false });
    }
  },
}));
