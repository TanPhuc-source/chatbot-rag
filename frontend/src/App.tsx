import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/contexts/ThemeContext';
import axios from 'axios';

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
import PermissionsPage from '@/pages/PermissionsPage';

const API = 'http://127.0.0.1:8000';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { init, logout } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      init(); // không có token, init bình thường
      setReady(true);
      return;
    }
    // Verify token với backend
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => { init(); setReady(true); })
      .catch(() => { logout(); setReady(true); }); // token hết hạn → logout
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

// Guard cho toàn bộ khu vực admin (admin + staff)
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'admin' && role !== 'staff') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Guard chỉ admin — không thể override bằng permission (dashboard, accounts, settings, permissions)
function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/admin/records" replace />;
  return <>{children}</>;
}

// Guard theo feature permission — admin luôn qua, staff kiểm tra /permissions/me
function FeatureGuard({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { setAllowed(false); return; }
    if (role === 'admin') { setAllowed(true); return; }
    const token = localStorage.getItem('access_token');
    axios.get(`${API}/permissions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setAllowed(res.data[feature] === true))
      .catch(() => setAllowed(false));
  }, [isLoggedIn, role, feature]);

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (allowed === null) return null; // loading
  if (!allowed) return <Navigate to="/admin/records" replace />;
  return <>{children}</>;
}

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

            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>

              {/* ── Admin only ── */}
              <Route index           element={<AdminOnlyGuard><AdminDashboard /></AdminOnlyGuard>} />
              <Route path="accounts"    element={<AdminOnlyGuard><AccountManagementPage /></AdminOnlyGuard>} />
              <Route path="permissions" element={<AdminOnlyGuard><PermissionsPage /></AdminOnlyGuard>} />
              <Route path="settings"    element={<AdminOnlyGuard><SettingPage /></AdminOnlyGuard>} />

              {/* ── Có thể cấp thêm cho staff ── */}
              <Route path="analytics"   element={<FeatureGuard feature="analytics"><AnalyticsPage /></FeatureGuard>} />
              <Route path="bot-settings" element={<FeatureGuard feature="bot_settings"><BotSettingsPage /></FeatureGuard>} />

              {/* ── Staff mặc định (AdminGuard bên ngoài đã đủ) ── */}
              <Route path="records"  element={<AdminRecordsPage />} />
              <Route path="records/:documentId/chunks" element={<DocumentChunksPage />} />
              <Route path="faq"      element={<FAQPage />} />
              <Route path="feedback" element={<FeedbackPage />} />

            </Route>
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </ThemeProvider>
  );
}