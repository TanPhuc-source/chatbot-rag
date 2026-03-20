import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
// Import ThemeProvider vừa tạo
import { ThemeProvider } from '@/contexts/ThemeContext';

import AdminLayout from '@/pages/AdminLayout';
import AdminDashboard from '@/pages/AdminDashboard';
import AccountManagementPage from '@/pages/AccountManagementPage';
import AdminRecordsPage from '@/pages/AdminRecordsPage';
import FAQPage from '@/pages/FAQPage';
import FeedbackPage from '@/pages/FeedbackPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import BotSettingsPage from '@/pages/BotSettingsPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import UserProfilePage from '@/pages/UserProfilePage';
import ChatPage from '@/pages/ChatPage';
// Import trang Settings mới
import SettingPage from '@/pages/SettingPage';
import DocumentChunksPage from '@/pages/DocumentChunksPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import ResetPasswordPage from './auth/ResetPasswordPage';


// Redirect admin → /admin/analytics, user → ChatPage
function RootRedirect() {
  const { init, isLoggedIn, role } = useAuthStore();

  // Đảm bảo init() đã chạy để restore token từ localStorage
  useEffect(() => { init(); }, []);

  if (isLoggedIn && role === 'admin') {
    return <Navigate to="/admin/analytics" replace />;
  }
  return <ChatPage />;
}

export default function App() {
  return (
    // Bọc ứng dụng bằng ThemeProvider
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="usersProfile" element={<UserProfilePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="accounts" element={<AccountManagementPage />} />
            <Route path="records" element={<AdminRecordsPage />} />
            <Route path="records/:documentId/chunks" element={<DocumentChunksPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="bot-settings" element={<BotSettingsPage />} />
            {/* Khai báo Route cho trang Cài đặt chung */}
            <Route path="settings" element={<SettingPage />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}