import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarPage from './SidebarPage';

export default function AdminLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        // Thêm dark:bg-[#0d0d0d] và dark:text-slate-300 vào đây
        <div className="flex h-screen bg-slate-50 dark:bg-[#0d0d0d] font-sans text-slate-700 dark:text-slate-300 overflow-hidden relative transition-colors duration-200">
            <SidebarPage
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Outlet context={{ isMobileMenuOpen, setIsMobileMenuOpen }} />
            </div>
        </div>
    );
}