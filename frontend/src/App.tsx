import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Import các component
import AdminLayout from '@/pages/AdminLayout';
import AdminDashboard from '@/pages/AdminDashboard';
import AccountManagementPage from '@/pages/AccountManagementPage';
import AdminRecordsPage from '@/pages/AdminRecordsPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import ChatPage from '@/pages/ChatPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route chính — giao diện Chat */}
        <Route path="/" element={<ChatPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* KHU VỰC ADMIN SỬ DỤNG LAYOUT */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Khi URL là "/admin", nó sẽ hiển thị AdminDashboard chui vào chỗ <Outlet /> */}
          <Route index element={<AdminDashboard />} />

          {/* /admin/accounts → Quản lý tài khoản */}
          <Route path="accounts" element={<AccountManagementPage />} />

          {/* /admin/records → Quản lý hồ sơ tài liệu */}
          <Route path="records" element={<AdminRecordsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}