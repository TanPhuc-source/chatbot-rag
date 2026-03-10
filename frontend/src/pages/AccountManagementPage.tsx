import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios, { AxiosError } from 'axios';
import {
    Search, Plus, Edit, Lock, Unlock,
    Shield, CheckCircle, UserX, X,
    Mail, Eye, Calendar,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Filter, Menu
} from 'lucide-react';
import Sidebar from '@/pages/SidebarPage'; // Đảm bảo đường dẫn này đúng

// --- TYPES KHỚP VỚI BACKEND FASTAPI ---
interface UserData {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export default function AccountManagementPage() {
    // --- AUTH & SIDEBAR STATE ---
    const token = localStorage.getItem('access_token');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- DATA STATE ---
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const itemsPerPage = 5;

    // --- MODALS STATE ---
    const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [viewingUser, setViewingUser] = useState<UserData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- CẤU HÌNH AXIOS ---
    const api = axios.create({
        baseURL: 'http://127.0.0.1:8000',
        headers: { Authorization: `Bearer ${token}` }
    });

    // --- FETCH DATA ---
    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (error) {
            console.error("Lỗi lấy danh sách user:", error);
            alert("Không thể tải danh sách tài khoản. Vui lòng kiểm tra quyền Admin.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGIC LỌC & PHÂN TRANG ---
    useEffect(() => { setCurrentPage(1); setPageInput('1'); }, [searchTerm]);
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- HANDLERS ---
    const paginate = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setPageInput(e.target.value);
    const handlePageInputSubmit = () => {
        const pageNumber = parseInt(pageInput);
        if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) paginate(pageNumber);
        else setPageInput(currentPage.toString());
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handlePageInputSubmit(); };

    // Bật/tắt trạng thái (Cần Backend bổ sung API toggle status, tạm gọi UI)
    const handleToggleStatus = async (user: UserData) => {
        const action = user.is_active ? 'KHÓA' : 'MỞ KHÓA';
        if (!confirm(`Bạn có chắc muốn ${action} tài khoản của ${user.username}?`)) return;

        try {
            // Giả định API thay đổi trạng thái hoạt động (Xem Bước 2 để thêm API này)
            await api.patch(`/admin/users/${user.id}/toggle-status`);
            fetchData();
        } catch (error) {
            alert("Đã xảy ra lỗi khi thay đổi trạng thái!");
        }
    };

    // Thêm / Cập nhật người dùng
    const handleUpsertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const payload = {
            username: formData.get('username') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            role: formData.get('role') as string,
        };

        try {
            if (editingUser) {
                // Đổi quyền (Vì Backend của bạn chỉ đang hỗ trợ đổi role)
                await api.patch(`/admin/users/${editingUser.id}/role`, { role: payload.role });
                alert("Đã cập nhật vai trò thành công!");
            } else {
                // Tạo mới user
                await api.post('/register', payload);
                alert("Tạo tài khoản thành công!");
            }
            setIsUpsertModalOpen(false);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            const err = error as AxiosError<{ detail: string }>;
            alert(err.response?.data?.detail || "Lỗi xử lý. Vui lòng thử lại!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---
    const StatusBadge = ({ isActive }: { isActive?: boolean }) => (
        isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                <CheckCircle size={12} /> Hoạt động
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                <UserX size={12} /> Đã khóa
            </span>
        )
    );

    const RoleBadge = ({ roleName }: { roleName?: string }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${roleName === 'admin'
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}>
            {roleName === 'admin' ? 'Admin' : 'User'}
        </span>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-700 overflow-hidden relative">

            {/* SIDEBAR */}
            <Sidebar
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
                user={{ fullName: 'Quản trị viên', email: 'admin@dthu.edu.vn', role: 'admin' }}
            />

            {/* MAIN LAYOUT */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 sticky top-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-lg text-slate-800 tracking-tight hidden sm:block">Quản lý tài khoản</span>
                    </div>
                </header>

                <div className="flex-1 px-4 lg:px-8 pt-6 pb-4 overflow-y-auto">
                    <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                                    placeholder="Tìm tên đăng nhập, email..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="hidden md:flex items-center px-4 py-2.5 bg-slate-100 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 whitespace-nowrap">
                                    <span className="mr-2">Tổng:</span><span className="text-blue-600">{filteredUsers.length}</span>
                                </div>
                                <button onClick={() => { setEditingUser(null); setIsUpsertModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
                                    <Plus size={20} /><span>Thêm tài khoản</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-4">ID</th>
                                    <th className="px-6 py-4">Tên đăng nhập</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Vai trò</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không tìm thấy tài khoản.</td></tr>
                                ) : (
                                    paginatedUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-4 text-sm text-slate-500">{u.id}</td>
                                            <td className="px-6 py-4"><span className="text-sm font-bold text-slate-800">{u.username}</span></td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                                            <td className="px-6 py-4"><RoleBadge roleName={u.role} /></td>
                                            <td className="px-6 py-4"><StatusBadge isActive={u.is_active} /></td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setViewingUser(u); setIsViewModalOpen(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Chi tiết"><Eye size={16} /></button>
                                                    <button onClick={() => { setEditingUser(u); setIsUpsertModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Đổi quyền"><Edit size={16} /></button>
                                                    <button onClick={() => handleToggleStatus(u)} className={`p-2 rounded-lg ${u.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`} title={u.is_active ? "Khóa" : "Mở khóa"}>
                                                        {u.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="hidden md:flex mt-5 justify-center items-center gap-3">
                            <div className="flex items-center gap-1">
                                <button onClick={() => paginate(1)} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white disabled:opacity-50"><ChevronsLeft size={18} /></button>
                                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white disabled:opacity-50"><ChevronLeft size={18} /></button>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
                                <span className="text-xs text-slate-500 font-medium">Trang</span>
                                <input type="number" min={1} max={totalPages} value={pageInput} onChange={handlePageInputChange} onBlur={handlePageInputSubmit} onKeyDown={handleKeyDown} className="w-10 text-center bg-slate-50 border rounded text-sm font-bold h-7" />
                                <span className="text-xs text-slate-500 font-medium">/ {totalPages}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border bg-white disabled:opacity-50"><ChevronRight size={18} /></button>
                                <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg border bg-white disabled:opacity-50"><ChevronsRight size={18} /></button>
                            </div>
                        </div>
                    )}

                    {/* --- MODAL 1: VIEW DETAILS --- */}
                    <AnimatePresence>
                        {isViewModalOpen && viewingUser && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative">
                                    <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl"></div>
                                    <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-white"><X size={20} /></button>
                                    <div className="px-6 pb-6 relative text-center">
                                        <div className="w-20 h-20 mx-auto -mt-10 bg-white rounded-full p-1 shadow-lg relative z-10">
                                            <img src={`https://ui-avatars.com/api/?name=${viewingUser.username}&background=0D8ABC&color=fff`} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                        </div>
                                        <h3 className="mt-3 text-xl font-bold text-slate-800">{viewingUser.username}</h3>
                                        <p className="text-slate-500 text-sm mb-4">{viewingUser.email}</p>
                                        <div className="flex justify-center gap-2 mb-6">
                                            <RoleBadge roleName={viewingUser.role} />
                                            <StatusBadge isActive={viewingUser.is_active} />
                                        </div>
                                        <p className="text-xs text-slate-400">Tham gia: {new Date(viewingUser.created_at).toLocaleString('vi-VN')}</p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* --- MODAL 2: UPSERT USER --- */}
                    <AnimatePresence>
                        {isUpsertModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
                                    <form onSubmit={handleUpsertSubmit}>
                                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
                                            <h3 className="font-bold text-lg text-slate-800">{editingUser ? 'Cập nhật Quyền / Trạng thái' : 'Tạo tài khoản mới'}</h3>
                                            <button type="button" onClick={() => setIsUpsertModalOpen(false)} className="text-slate-400"><X size={20} /></button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tên đăng nhập</label>
                                                <input name="username" defaultValue={editingUser?.username} required disabled={!!editingUser} className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-slate-100" />
                                            </div>
                                            {!editingUser && (
                                                <>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email</label>
                                                        <input name="email" type="email" required className="w-full px-3 py-2 border rounded-lg text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mật khẩu</label>
                                                        <input name="password" type="password" required className="w-full px-3 py-2 border rounded-lg text-sm" />
                                                    </div>
                                                </>
                                            )}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Vai trò hệ thống</label>
                                                <select name="role" defaultValue={editingUser?.role || 'user'} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                                                    <option value="admin">Admin (Quản trị viên)</option>
                                                    <option value="user">User (Người dùng)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 px-6 py-4 border-t flex justify-end gap-3 rounded-b-2xl">
                                            <button type="button" onClick={() => setIsUpsertModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Hủy bỏ</button>
                                            <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-70">
                                                {isSubmitting ? 'Đang xử lý...' : (editingUser ? 'Lưu thay đổi' : 'Tạo mới')}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}