import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import ChatPage from '@/pages/ChatPage';
// Import trang Settings mới
import SettingPage from '@/pages/SettingPage';

export default function App() {
  return (
    // Bọc ứng dụng bằng ThemeProvider
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="accounts" element={<AccountManagementPage />} />
            <Route path="records" element={<AdminRecordsPage />} />
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