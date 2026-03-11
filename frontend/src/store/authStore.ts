import { create } from "zustand";

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isLoggedIn: boolean;
  login: (token: string, role: string, username: string) => void;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  isLoggedIn: false,

  init: () => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    const username = localStorage.getItem("username");
    if (token) set({ token, role, username, isLoggedIn: true });
  },

  login: (token, role, username) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user_role", role);
    localStorage.setItem("username", username);
    set({ token, role, username, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("username");
    set({ token: null, role: null, username: null, isLoggedIn: false });
  },
}));