import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
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
import SettingPage from '@/pages/SettingPage';
import DocumentChunksPage from '@/pages/DocumentChunksPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import ResetPasswordPage from './auth/ResetPasswordPage';


// Khởi tạo auth từ localStorage một lần duy nhất cho toàn app
// Đặt ở App level để mọi guard đều thấy trạng thái đúng sau F5
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { init } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init();
    setReady(true);
  }, []);

  // Chờ restore xong mới render để tránh flash redirect sai
  if (!ready) return null;
  return <>{children}</>;
}

// Guard cho các route admin — cho vào nếu đã login và có role admin hoặc staff
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'admin' && role !== 'staff') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Guard chỉ dành cho admin — staff bị redirect về /admin/records
function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/admin/records" replace />;
  return <>{children}</>;
}

// Root redirect
function RootRedirect() {
  const { isLoggedIn, role } = useAuthStore();
  if (isLoggedIn && role === 'admin') return <Navigate to="/admin/analytics" replace />;
  if (isLoggedIn && role === 'staff') return <Navigate to="/admin/records" replace />;
  return <ChatPage />;
}
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthInitializer>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="usersProfile" element={<UserProfilePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminOnlyGuard><AdminDashboard /></AdminOnlyGuard>} />
            <Route path="accounts" element={<AdminOnlyGuard><AccountManagementPage /></AdminOnlyGuard>} />
            <Route path="records" element={<AdminRecordsPage />} />
            <Route path="records/:documentId/chunks" element={<DocumentChunksPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="analytics" element={<AdminOnlyGuard><AnalyticsPage /></AdminOnlyGuard>} />
            <Route path="bot-settings" element={<AdminOnlyGuard><BotSettingsPage /></AdminOnlyGuard>} />
            <Route path="settings" element={<AdminOnlyGuard><SettingPage /></AdminOnlyGuard>} />
          </Route>
        </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </ThemeProvider>
  );
}