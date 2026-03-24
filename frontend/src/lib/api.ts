import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const api = axios.create({ baseURL: "http://127.0.0.1:8000" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ → tự động logout
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;