import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Import các component
import AdminLayout from '@/pages/AdminLayout';
import AdminDashboard from '@/pages/AdminDashboard';
import AccountManagementPage from '@/pages/AccountManagementPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import ChatPage from '@/pages/ChatPage'; // ← THÊM

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route chính — giao diện Chat */}
        <Route path="/" element={<ChatPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* KHU VỰC ADMIN SỬ DỤNG LAYOUT */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Khi URL là "/admin", nó sẽ hiển thị AdminDashboard chui vào chỗ <Outlet /> */}
          <Route index element={<AdminDashboard />} />

          {/* Khi URL là "/admin/accounts", nó sẽ hiển thị AccountManagementPage chui vào chỗ <Outlet /> */}
          <Route path="accounts" element={<AccountManagementPage />} />
          {/* Thêm các trang con khác của Admin tại đây... */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}