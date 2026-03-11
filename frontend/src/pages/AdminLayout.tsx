import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarPage from './SidebarPage'; // Đường dẫn import có thể thay đổi tùy cấu trúc thư mục của bạn

export default function AdminLayout() {
    // Quản lý trạng thái đóng/mở menu trên điện thoại ở Layout chung
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-700 overflow-hidden relative">
            {/* Sidebar lúc này đứng cố định, sẽ KHÔNG BỊ RENDER LẠI khi chuyển trang */}
            <SidebarPage
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />

            {/* Đây là vùng chứa nội dung của các trang con */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Outlet sẽ tự động hiển thị AdminDashboard hoặc AccountManagementPage tùy vào URL.
                    Đồng thời truyền state menu xuống cho Header của các trang con sử dụng */}
                <Outlet context={{ isMobileMenuOpen, setIsMobileMenuOpen }} />
            </div>
        </div>
    );
}