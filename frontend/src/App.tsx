import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/contexts/ThemeContext';
import api from '@/lib/api';

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
import PermissionsPage from '@/pages/PermissionsPage';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { init } = useAuthStore();
  const [ready, setReady] = useState(false);
  const initialized = useRef(false); // ngăn StrictMode gọi 2 lần

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    init().finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'admin' && role !== 'staff') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/admin/records" replace />;
  return <>{children}</>;
}

function FeatureGuard({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { isLoggedIn, role, cookieReady } = useAuthStore();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Chờ cookieReady — đảm bảo cookie đã flush trước khi fetch permissions
    if (!isLoggedIn || !cookieReady) { setAllowed(null); return; }
    if (role === 'admin') { setAllowed(true); return; }
    let cancelled = false;
    api.get('/permissions/me')
      .then(res => { if (!cancelled) setAllowed(res.data[feature] === true); })
      .catch(() => { if (!cancelled) setAllowed(false); });
    return () => { cancelled = true; };
  }, [isLoggedIn, cookieReady, role, feature]);

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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthInitializer>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="usersProfile" element={<UserProfilePage />} />

            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index           element={<AdminOnlyGuard><AdminDashboard /></AdminOnlyGuard>} />
              <Route path="accounts"    element={<AdminOnlyGuard><AccountManagementPage /></AdminOnlyGuard>} />
              <Route path="permissions" element={<AdminOnlyGuard><PermissionsPage /></AdminOnlyGuard>} />
              <Route path="settings"    element={<AdminOnlyGuard><SettingPage /></AdminOnlyGuard>} />
              <Route path="analytics"   element={<FeatureGuard feature="analytics"><AnalyticsPage /></FeatureGuard>} />
              <Route path="bot-settings" element={<FeatureGuard feature="bot_settings"><BotSettingsPage /></FeatureGuard>} />
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