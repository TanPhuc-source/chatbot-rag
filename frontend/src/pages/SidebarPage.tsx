import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard, BrainCircuit, Settings, LogOut, X,
    FolderOpen, ShieldCheck, User as UserIcon, ChevronUp
} from 'lucide-react';

import logoImage from '../components/images/images.jpg';

const SCHOOL_INFO = {
    LOGO_URL: logoImage,
    NAME: "Trường Đại Học Đồng Tháp",
    DEPT: "Trung Tâm Ngoại Ngữ Và Tin Học"
};

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

// Kiểu dữ liệu nhận về từ API
interface UserProfile {
    username: string;
    email: string;
    full_name: string | null;
    role: string;
}

export default function SidebarPage({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    // FETCH THÔNG TIN USER TỪ API
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const response = await axios.get('http://127.0.0.1:8000/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setCurrentUser(response.data);
                } catch (error) {
                    console.error("Lỗi lấy thông tin user:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    const handleLogout = () => {
        const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất?');
        if (confirmed) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_role');
            navigate('/login');
        }
    };

    const handleProfileClick = () => {
        navigate('/profile');
        setIsUserMenuOpen(false);
    };

    const SidebarItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string }) => {
        const isActive = pathname === path || (path !== '/admin' && pathname.startsWith(path));
        return (
            <div
                onClick={() => navigate(path)}
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all mb-1 font-sans
                    ${isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'}
                `}
            >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[14px]">{label}</span>
            </div>
        );
    };

    // Tạo Avatar tự động
    const displayName = currentUser?.full_name || currentUser?.username || 'User';
    const avatarUrl = `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff&bold=true`;

    return (
        <>
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
            )}
            {isUserMenuOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0
            `}>
                <div className="flex flex-col items-center text-center pt-8 pb-6 px-4 border-b border-slate-100">
                    <div className="w-20 h-20 bg-white rounded-full p-1 shadow-sm border border-slate-200 overflow-hidden mb-3">
                        <img src={SCHOOL_INFO.LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h1 className="font-bold text-sm text-blue-800 leading-tight uppercase tracking-wide font-['Times_New_Roman'] mb-1">
                        {SCHOOL_INFO.NAME}
                    </h1>
                    <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-['Times_New_Roman'] leading-none">
                            {SCHOOL_INFO.DEPT}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    <p className="px-4 text-[10px] uppercase font-extrabold text-slate-400 mb-2 tracking-widest font-sans">Quản lý</p>
                    {/* Ẩn Quản lý tài khoản nếu không phải admin */}
                    {currentUser?.role === 'admin' && (
                        <SidebarItem icon={ShieldCheck} label="Quản lý tài khoản" path="/admin/accounts" />
                    )}
                    <SidebarItem icon={LayoutDashboard} label="Quản lý Chatbot" path="/admin" />
                    <SidebarItem icon={FolderOpen} label="Quản lý hồ sơ tài liệu" path="/admin/records" />

                    <p className="px-4 text-[10px] uppercase font-extrabold text-slate-400 mb-2 mt-8 tracking-widest font-sans">Hệ thống</p>
                    <SidebarItem icon={BrainCircuit} label="Cấu hình Model AI" path="/admin/ai-config" />
                    <SidebarItem icon={Settings} label="Cài đặt chung" path="/admin/settings" />
                </div>

                <div className="relative p-4 border-t border-slate-100 bg-slate-50/50">
                    {isUserMenuOpen && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                            <div onClick={handleProfileClick} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-slate-700">
                                <UserIcon size={16} className="text-blue-600" />
                                <span className="text-sm font-medium">Thông tin tài khoản</span>
                            </div>
                            <div className="h-[1px] bg-slate-100 mx-3"></div>
                            <div onClick={handleLogout} className="flex items-center gap-3 p-3 hover:bg-red-50 cursor-pointer text-red-600">
                                <LogOut size={16} />
                                <span className="text-sm font-medium">Đăng xuất</span>
                            </div>
                        </div>
                    )}

                    <div onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${isUserMenuOpen ? 'bg-white shadow-md border-blue-200' : 'hover:bg-white hover:shadow-md border-transparent'}`}>
                        <img src={avatarUrl} alt="User" className="w-10 h-10 rounded-full border border-slate-200 shadow-sm flex-shrink-0 object-cover" />
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="text-sm font-bold text-slate-700 truncate" title={displayName}>
                                {displayName}
                            </h4>
                            <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                                {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                            </p>
                        </div>
                        <ChevronUp size={18} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </div>
                </div>
            </aside>
        </>
    );
}