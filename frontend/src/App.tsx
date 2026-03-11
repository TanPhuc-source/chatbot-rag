import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Import các component
import AdminLayout from '@/pages/AdminLayout';
import AdminDashboard from '@/pages/AdminDashboard';
import AccountManagementPage from '@/pages/AccountManagementPage';
import LoginPage from '@/pages/LoginPage'; // Giả sử bạn có trang Login
import ProfilePage from '@/pages/ProfilePage'; // Giả sử bạn có trang Profile

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Giả sử bạn có route Login ở ngoài */}
        <Route path="/login" element={<LoginPage />} />

        {/* KHU VỰC ADMIN SỬ DỤNG LAYOUT */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Khi URL là "/admin", nó sẽ hiển thị AdminDashboard chui vào chỗ <Outlet /> */}
          <Route index element={<AdminDashboard />} />

          {/* Khi URL là "/admin/accounts", nó sẽ hiển thị AccountManagementPage chui vào chỗ <Outlet /> */}
          <Route path="accounts" element={<AccountManagementPage />} />
          {/* Thêm route cho trang Profile nếu cần */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Thêm các trang con khác của Admin tại đây... */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}