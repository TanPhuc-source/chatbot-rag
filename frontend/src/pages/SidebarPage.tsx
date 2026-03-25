import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard, Settings, LogOut, X,
    FolderOpen, ShieldCheck, User as UserIcon, ChevronUp,
    ThumbsUp, BarChart3, HelpCircle, SlidersHorizontal,
    KeyRound
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import logoImage from '../components/images/images.jpg';

const SCHOOL_INFO = {
    LOGO_URL: logoImage,
    NAME: "Trường Đại Học Đồng Tháp",
    DEPT: "Trung Tâm Ngoại Ngữ Và Tin Học"
};

const API = 'http://127.0.0.1:8000';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

interface UserProfile {
    username: string;
    email: string;
    full_name: string | null;
    role: string;
    avatar_url?: string | null;
}

export default function SidebarPage({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
    const authLogout = useAuthStore((s) => s.logout);
    const storeRole = useAuthStore((s) => s.role); // có ngay từ localStorage
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        Promise.all([
            axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/permissions/me`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
            .then(([userRes, permRes]) => {
                setCurrentUser(userRes.data);
                setPermissions(permRes.data);
            })
            .catch(console.error);
    }, []);

    // isAdmin dùng storeRole — có ngay từ localStorage, không chờ API
    const isAdmin = storeRole === 'admin';
    // Staff: chờ permissions load xong mới render nav để tránh nhảy thứ tự
    const permissionsReady = isAdmin || permissions !== null;
    const can = (key: string) => isAdmin || permissions?.[key] === true;

    const handleLogout = () => {
        authLogout ? authLogout() : localStorage.removeItem('access_token');
        setShowLogoutConfirm(false);
        navigate('/login');
    };

    const SidebarItem = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
        const isActive = pathname === path || (path !== '/admin' && pathname.startsWith(path));
        return (
            <div
                onClick={() => { navigate(path); setIsMobileOpen(false); }}
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all mb-1 font-sans
                    ${isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2a2a2a] hover:text-blue-700 dark:hover:text-blue-400'}
                `}
            >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[14px]">{label}</span>
            </div>
        );
    };

    const displayName = currentUser?.full_name || currentUser?.username || 'User';
    const avatarUrl = currentUser?.avatar_url
        ? `${API}${currentUser.avatar_url}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&bold=true`;

    return (
        <>
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}

            <aside className={`
                fixed lg:static inset-y-0 left-0 z-30
                flex flex-col h-full w-64 shrink-0
                bg-white dark:bg-[#111111]
                border-r border-slate-100 dark:border-[#2a2a2a]
                transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] text-slate-500"
                >
                    <X size={18} />
                </button>

                {/* Logo */}
                <div className="flex flex-col items-center px-2 pt-8 pb-6">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-[#2a2a2a] mb-3">
                        <img src={SCHOOL_INFO.LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="font-bold text-sm text-blue-800 dark:text-blue-400 leading-tight uppercase tracking-wide font-['Times_New_Roman'] mb-1 text-center">
                        {SCHOOL_INFO.NAME}
                    </h1>
                    <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider font-['Times_New_Roman'] leading-none">
                            {SCHOOL_INFO.DEPT}
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto py-2 px-4 space-y-1">
                    <p className="px-4 text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-2 tracking-widest font-sans">Quản lý</p>

                    {/* Chờ permissions load xong rồi mới render — tránh nhảy thứ tự */}
                    {permissionsReady && <>
                        {isAdmin && <SidebarItem icon={LayoutDashboard} label="Thống kê & Báo cáo" path="/admin/analytics" />}
                        {can('analytics') && <SidebarItem icon={BarChart3} label="Quản lý Chatbot" path="/admin" />}
                        {can('accounts') && <SidebarItem icon={ShieldCheck} label="Quản lý tài khoản" path="/admin/accounts" />}
                        {can('records') && <SidebarItem icon={FolderOpen} label="Quản lý hồ sơ tài liệu" path="/admin/records" />}
                        {can('faq') && <SidebarItem icon={HelpCircle} label="Quản lý FAQ" path="/admin/faq" />}
                        {can('feedback') && <SidebarItem icon={ThumbsUp} label="Phản hồi người dùng" path="/admin/feedback" />}
                        {can('bot_settings') && <SidebarItem icon={SlidersHorizontal} label="Cấu hình Chatbot" path="/admin/bot-settings" />}
                    </>}

                    {/* Hệ thống — chỉ admin */}
                    {isAdmin && (
                        <>
                            <p className="px-4 text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 mb-2 mt-6 tracking-widest font-sans">Hệ thống</p>
                            <SidebarItem icon={KeyRound} label="Phân quyền nhân viên" path="/admin/permissions" />
                            <SidebarItem icon={Settings} label="Cài đặt chung" path="/admin/settings" />
                        </>
                    )}
                </div>

                {/* User footer */}
                <div className="relative p-4 border-t border-slate-100 dark:border-[#2a2a2a] bg-slate-50/50 dark:bg-[#0f0f0f]">
                    {isUserMenuOpen && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-xl border border-slate-100 dark:border-[#333] overflow-hidden z-50">
                            <div
                                onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-[#2a2a2a] cursor-pointer text-slate-700 dark:text-slate-300"
                            >
                                <UserIcon size={16} className="text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium">Thông tin tài khoản</span>
                            </div>
                            <div className="h-[1px] bg-slate-100 dark:bg-[#333] mx-3" />
                            <div
                                onClick={() => { setIsUserMenuOpen(false); setShowLogoutConfirm(true); }}
                                className="flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer text-red-600 dark:text-red-400"
                            >
                                <LogOut size={16} />
                                <span className="text-sm font-medium">Đăng xuất</span>
                            </div>
                        </div>
                    )}
                    <div
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${isUserMenuOpen ? 'bg-white dark:bg-[#2a2a2a] shadow-md border-blue-200 dark:border-blue-800' : 'hover:bg-white dark:hover:bg-[#1e1e1e] hover:shadow-md border-transparent'}`}
                    >
                        <img src={avatarUrl} alt="User" className="w-10 h-10 rounded-full border border-slate-200 dark:border-[#333] shadow-sm flex-shrink-0 object-cover" />
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{displayName}</h4>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                {isAdmin ? 'Quản trị viên' : 'Nhân viên'}
                            </p>
                        </div>
                        <ChevronUp size={18} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </div>
                </div>
            </aside>

            {/* Logout modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-7 shadow-2xl border border-slate-100 dark:border-[#333] w-[90%] max-w-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Xác nhận đăng xuất</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Bạn có chắc muốn đăng xuất khỏi tài khoản này không?</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-[#333] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-colors">Hủy</button>
                            <button onClick={handleLogout} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors">Đăng xuất</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}