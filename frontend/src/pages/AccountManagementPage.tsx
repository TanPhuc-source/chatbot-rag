import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios, { AxiosError } from 'axios';
import { useOutletContext } from 'react-router-dom';
import {
    Search, Plus, Edit, Lock, Unlock,
    Shield, CheckCircle, UserX, X,
    Mail, Eye, Calendar,
    ChevronLeft, ChevronRight,
    Menu, MapPin, Phone, User, RefreshCw
} from 'lucide-react';

interface UserData {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    full_name?: string;
    gender?: string;
    date_of_birth?: string;
    phone?: string;
    address?: string;
    avatar_url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string, username?: string) {
    const src = name || username || '?';
    return src.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function Avatar({ user, size = 'md' }: { user: UserData; size?: 'sm' | 'md' | 'lg' }) {
    const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
    if (user.avatar_url) {
        return (
            <img
                src={`http://127.0.0.1:8000${user.avatar_url}`}
                alt={user.full_name || user.username}
                className={`${sz} rounded-full object-cover shrink-0`}
            />
        );
    }
    return (
        <div className={`${sz} ${avatarColor(user.id)} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
            {getInitials(user.full_name, user.username)}
        </div>
    );
}

function StatusBadge({ isActive }: { isActive?: boolean }) {
    return isActive ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-800/50">
            <CheckCircle size={11} /> Hoạt động
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-100 dark:border-rose-800/50">
            <UserX size={11} /> Đã khóa
        </span>
    );
}

function RoleBadge({ role }: { role?: string }) {
    return role === 'admin' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-100 dark:border-blue-800/50">
            <Shield size={11} /> Admin
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-600">
            <User size={11} /> User
        </span>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700/60 last:border-none">
            <span className="mt-0.5 text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 w-32 shrink-0">{label}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words min-w-0 flex-1">
                {value || <span className="text-slate-400 dark:text-slate-500 font-normal italic">Chưa cập nhật</span>}
            </span>
        </div>
    );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-400";

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export default function AccountManagementPage() {
    const token = localStorage.getItem('access_token');
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }>();

    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'locked'>('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [viewingUser, setViewingUser] = useState<UserData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const api = axios.create({
        baseURL: 'http://127.0.0.1:8000',
        headers: { Authorization: `Bearer ${token}` },
    });

    useEffect(() => {
        if (token) {
            fetchData();
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUsername(payload.sub);
            } catch { }
        }
    }, [token]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch {
            alert('Không thể tải danh sách tài khoản.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterRole, filterStatus]);

    const filtered = users.filter(u => {
        const q = searchTerm.toLowerCase();
        const matchQ = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
        const matchRole = filterRole === 'all' || u.role === filterRole;
        const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
        return matchQ && matchRole && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleToggleStatus = async (user: UserData) => {
        if (user.username === currentUsername) {
            alert('Bạn không thể tự khóa tài khoản của chính mình!');
            return;
        }
        const action = user.is_active ? 'KHÓA' : 'MỞ KHÓA';
        if (!confirm(`Bạn có chắc muốn ${action} tài khoản @${user.username}?`)) return;
        try {
            await api.patch(`/admin/users/${user.id}/toggle-status`);
            fetchData();
        } catch { alert('Lỗi khi thay đổi trạng thái!'); }
    };

    const handleUpsertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const pick = (f: string) => (formData.get(f) as string || '').trim();

        try {
            if (editingUser) {
                const payload: any = {};
                ['email', 'full_name', 'gender', 'date_of_birth', 'phone', 'address', 'role'].forEach(f => {
                    const v = pick(f); if (v) payload[f] = v;
                });
                await api.patch(`/admin/users/${editingUser.id}`, payload);
                alert('✅ Cập nhật thành công!');
            } else {
                const payload: any = {
                    username: pick('username'),
                    email: pick('email'),
                    password: pick('password'),
                    role: pick('role') || 'user',
                };
                ['full_name', 'gender', 'date_of_birth', 'phone', 'address'].forEach(f => {
                    const v = pick(f); if (v) payload[f] = v;
                });
                await api.post('/admin/users', payload);
                alert('✅ Tạo tài khoản thành công!');
            }
            setIsUpsertModalOpen(false);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            const err = error as AxiosError<{ detail: string }>;
            alert(err.response?.data?.detail || '❌ Lỗi xử lý. Vui lòng thử lại!');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Pagination render
    const renderPages = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <>
            {/* ── Header ── */}
            <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Menu size={22} />
                    </button>
                    <div className="hidden sm:block">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Quản lý tài khoản</h2>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {isLoading ? 'Đang tải...' : `${users.length} tài khoản trong hệ thống`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Làm mới">
                        <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => { setEditingUser(null); setIsUpsertModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all active:scale-95">
                        <Plus size={16} /> Thêm tài khoản
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-5">

                    {/* ── Toolbar ── */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                placeholder="Tìm theo tên, username, email..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Filters */}
                        <div className="flex gap-2 shrink-0">
                            <select
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value as any)}
                                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
                                <option value="all">Tất cả vai trò</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value as any)}
                                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
                                <option value="all">Tất cả trạng thái</option>
                                <option value="active">Hoạt động</option>
                                <option value="locked">Đã khóa</option>
                            </select>
                        </div>
                    </div>

                    {/* ── Table ── */}
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700/60">
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-5 py-3.5 w-10">#</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3.5">Tài khoản</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3.5 hidden md:table-cell">Email</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3.5 hidden lg:table-cell">Giới tính</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3.5 hidden lg:table-cell">Ngày sinh</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3.5">Vai trò</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-4 py-3.5">Trạng thái</th>
                                        <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-5 py-3.5">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="py-20 text-center">
                                                <RefreshCw size={24} className="animate-spin mx-auto text-slate-300 dark:text-slate-600" />
                                            </td>
                                        </tr>
                                    ) : filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-20 text-center text-slate-400 dark:text-slate-500 text-sm">
                                                Không tìm thấy tài khoản nào.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((u, idx) => (
                                            <motion.tr
                                                key={u.id}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="border-b border-slate-50 dark:border-slate-700/40 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors group">
                                                {/* # */}
                                                <td className="px-5 py-3.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                                                    {(currentPage - 1) * PAGE_SIZE + idx + 1}
                                                </td>
                                                {/* User */}
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar user={u} size="sm" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                                {u.full_name || <span className="text-slate-400 italic font-normal">Chưa cập nhật</span>}
                                                            </p>
                                                            <p className="text-xs text-slate-400 dark:text-slate-500">@{u.username}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Email */}
                                                <td className="px-4 py-3.5 hidden md:table-cell">
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">{u.email}</span>
                                                </td>
                                                {/* Gender */}
                                                <td className="px-4 py-3.5 hidden lg:table-cell">
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">{u.gender || '—'}</span>
                                                </td>
                                                {/* DOB */}
                                                <td className="px-4 py-3.5 hidden lg:table-cell">
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">{u.date_of_birth || '—'}</span>
                                                </td>
                                                {/* Role */}
                                                <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                                                {/* Status */}
                                                <td className="px-4 py-3.5"><StatusBadge isActive={u.is_active} /></td>
                                                {/* Actions */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => { setViewingUser(u); setIsViewModalOpen(true); }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors"
                                                            title="Xem chi tiết">
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingUser(u); setIsUpsertModalOpen(true); }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors"
                                                            title="Chỉnh sửa">
                                                            <Edit size={15} />
                                                        </button>
                                                        {u.username !== currentUsername && (
                                                            <button
                                                                onClick={() => handleToggleStatus(u)}
                                                                className={`p-1.5 rounded-lg transition-colors ${u.is_active
                                                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 dark:hover:text-rose-400'
                                                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400'
                                                                    }`}
                                                                title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa'}>
                                                                {u.is_active ? <Lock size={15} /> : <Unlock size={15} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Pagination inside card ── */}
                        {!isLoading && filtered.length > 0 && (
                            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700/60">
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Hiển thị <span className="font-semibold text-slate-600 dark:text-slate-300">
                                        {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                                    </span> / <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> tài khoản
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <ChevronLeft size={15} />
                                    </button>
                                    {renderPages().map((p, i) =>
                                        p === '...' ? (
                                            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p as number)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === currentPage
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}>
                                                {p}
                                            </button>
                                        )
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Modal: View ── */}
            <AnimatePresence>
                {isViewModalOpen && viewingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Chi tiết tài khoản</h3>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="px-6 pb-6 pt-5">
                                {/* Avatar + name */}
                                <div className="flex items-center gap-4 mb-5">
                                    <Avatar user={viewingUser} size="lg" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                                            {viewingUser.full_name || 'Chưa cập nhật tên'}
                                        </h3>
                                        <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">@{viewingUser.username}</p>
                                        <div className="flex gap-2 flex-wrap">
                                            <RoleBadge role={viewingUser.role} />
                                            <StatusBadge isActive={viewingUser.is_active} />
                                        </div>
                                    </div>
                                </div>
                                {/* Info */}
                                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl px-4">
                                    <InfoRow icon={<Mail size={15} />} label="Email" value={viewingUser.email} />
                                    <InfoRow icon={<User size={15} />} label="Giới tính" value={viewingUser.gender} />
                                    <InfoRow icon={<Calendar size={15} />} label="Ngày sinh" value={viewingUser.date_of_birth} />
                                    <InfoRow icon={<Phone size={15} />} label="Điện thoại" value={viewingUser.phone} />
                                    <InfoRow icon={<MapPin size={15} />} label="Địa chỉ" value={viewingUser.address} />
                                </div>
                                <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                    Tham gia: {new Date(viewingUser.created_at).toLocaleString('vi-VN')}
                                </p>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    Đóng
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Modal: Upsert ── */}
            <AnimatePresence>
                {isUpsertModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.97 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
                            <form onSubmit={handleUpsertSubmit} className="flex flex-col h-full overflow-hidden rounded-2xl">
                                {/* Modal header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${editingUser ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                            {editingUser ? <Edit size={18} /> : <Plus size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                                {editingUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}
                                            </h3>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                {editingUser ? `Chỉnh sửa thông tin @${editingUser.username}` : 'Điền đầy đủ thông tin bên dưới'}
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button"
                                        onClick={() => { setIsUpsertModalOpen(false); setEditingUser(null); }}
                                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Modal body */}
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                                    {/* Section 1 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield size={14} className="text-indigo-500" />
                                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Thông tin truy cập</span>
                                            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Tên đăng nhập" required>
                                                <div className="relative">
                                                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input name="username" defaultValue={editingUser?.username} required disabled={!!editingUser}
                                                        placeholder="vd: user01" className={`${inputCls} pl-9`} />
                                                </div>
                                            </FormField>
                                            <FormField label="Email" required>
                                                <div className="relative">
                                                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input name="email" type="email" defaultValue={editingUser?.email} required
                                                        placeholder="email@domain.com" className={`${inputCls} pl-9`} />
                                                </div>
                                            </FormField>
                                            {!editingUser && (
                                                <FormField label="Mật khẩu" required>
                                                    <div className="relative">
                                                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input name="password" type="password" required minLength={6}
                                                            placeholder="Tối thiểu 6 ký tự" className={`${inputCls} pl-9`} />
                                                    </div>
                                                </FormField>
                                            )}
                                            <FormField label="Vai trò" required>
                                                <select name="role" defaultValue={editingUser?.role || 'user'} className={inputCls}>
                                                    <option value="admin">Admin – Quản trị viên</option>
                                                    <option value="user">User – Người dùng</option>
                                                </select>
                                            </FormField>
                                        </div>
                                    </div>

                                    {/* Section 2 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <User size={14} className="text-slate-400" />
                                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thông tin cá nhân</span>
                                            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Họ và tên">
                                                <input name="full_name" defaultValue={editingUser?.full_name || ''}
                                                    placeholder="Nhập đầy đủ họ và tên" className={inputCls} />
                                            </FormField>
                                            <FormField label="Số điện thoại">
                                                <div className="relative">
                                                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input name="phone" defaultValue={editingUser?.phone || ''}
                                                        placeholder="09xx xxx xxx" className={`${inputCls} pl-9`} />
                                                </div>
                                            </FormField>
                                            <FormField label="Giới tính">
                                                <select name="gender" defaultValue={editingUser?.gender || ''} className={inputCls}>
                                                    <option value="">Chưa chọn</option>
                                                    <option value="Nam">Nam</option>
                                                    <option value="Nữ">Nữ</option>
                                                    <option value="Khác">Khác</option>
                                                </select>
                                            </FormField>
                                            <FormField label="Ngày sinh">
                                                <input type="date" name="date_of_birth" defaultValue={editingUser?.date_of_birth || ''} className={inputCls} />
                                            </FormField>
                                            <div className="sm:col-span-2">
                                                <FormField label="Địa chỉ liên hệ">
                                                    <div className="relative">
                                                        <MapPin size={15} className="absolute left-3 top-3 text-slate-400" />
                                                        <textarea name="address" defaultValue={editingUser?.address || ''} rows={3}
                                                            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                                                            className={`${inputCls} pl-9 resize-none`} />
                                                    </div>
                                                </FormField>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal footer */}
                                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                                    <button type="button"
                                        onClick={() => { setIsUpsertModalOpen(false); setEditingUser(null); }}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        Hủy
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2">
                                        {isSubmitting ? (
                                            <><RefreshCw size={14} className="animate-spin" /> Đang xử lý...</>
                                        ) : (
                                            editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}