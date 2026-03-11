import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "@/pages/ChatPage";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
// 1. Import trang Quản lý tài khoản vừa tạo
import AccountManagementPage from "@/pages/AccountManagementPage";
import ProfilePage from "@/pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Cụm Route dành cho Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Thêm route mới cho phần accounts */}
        <Route path="/admin/accounts" element={<AccountManagementPage />} />
        {/* Route cho trang cá nhân */}
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}