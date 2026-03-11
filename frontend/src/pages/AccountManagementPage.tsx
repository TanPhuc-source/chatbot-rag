
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios, { AxiosError } from 'axios';
import {
    Search, Plus, Edit, Lock, Unlock,
    Shield, CheckCircle, UserX, X,
    Mail, Eye, Calendar,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Filter, Menu, MapPin, Phone, User
} from 'lucide-react';
import Sidebar from '@/pages/SidebarPage';

// --- TYPES KHỚP VỚI BACKEND (ĐÃ BỔ SUNG CÁC TRƯỜNG MỚI) ---
interface UserData {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    // Các trường dưới đây cần Backend (models.py, schemas.py) bổ sung thêm
    full_name?: string;
    gender?: string;
    date_of_birth?: string;
    phone?: string;
    address?: string;
}

export default function AccountManagementPage() {
    // --- AUTH & SIDEBAR STATE ---
    const token = localStorage.getItem('access_token');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);

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

    // --- FETCH DATA & LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP ---
    useEffect(() => {
        if (token) {
            fetchData();
            // Giải mã JWT Token thủ công để lấy username hiện tại (trong payload 'sub')
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUsername(payload.sub);
            } catch (e) {
                console.error("Lỗi giải mã token", e);
            }
        }
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
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
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

    // Bật/tắt trạng thái
    const handleToggleStatus = async (user: UserData) => {
        if (user.username === currentUsername) {
            alert("Bạn không thể tự khóa tài khoản của chính mình!");
            return;
        }

        const action = user.is_active ? 'KHÓA' : 'MỞ KHÓA';
        if (!confirm(`Bạn có chắc muốn ${action} tài khoản của ${user.username}?`)) return;

        try {
            await api.patch(`/admin/users/${user.id}/toggle-status`);
            fetchData();
        } catch (error) {
            alert("Đã xảy ra lỗi khi thay đổi trạng thái!");
        }
    };

    const handleUpsertSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const payload: any = {};

        // Chỉ gửi trường có giá trị (partial update)
        const fields = ['email', 'full_name', 'gender', 'date_of_birth', 'phone', 'address', 'role'];
        fields.forEach(field => {
            const val = (formData.get(field) as string || '').trim();
            if (val) payload[field] = val;
        });

        try {
            if (editingUser) {
                // UPDATE
                await api.patch(`/admin/users/${editingUser.id}`, payload);
                alert("✅ Cập nhật thông tin tài khoản thành công!");
            } else {
                // CREATE
                const createPayload: any = {
                    username: formData.get('username') as string,
                    email: formData.get('email') as string,
                    password: formData.get('password') as string,
                    role: formData.get('role') as string | 'user',
                };
                // thêm các trường optional
                ['full_name', 'gender', 'date_of_birth', 'phone', 'address'].forEach(field => {
                    const val = (formData.get(field) as string || '').trim();
                    if (val) createPayload[field] = val;
                });

                await api.post('/admin/users', createPayload);
                alert("✅ Tạo tài khoản thành công!");
            }

            setIsUpsertModalOpen(false);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            const err = error as AxiosError<{ detail: string }>;
            alert(err.response?.data?.detail || "❌ Lỗi xử lý. Vui lòng thử lại!");
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
            //user={{ fullName: 'Quản trị viên', email: 'admin@dthu.edu.vn', role: 'admin' }}
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
                                    placeholder="Tìm họ tên, tên đăng nhập, email..."
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
                    <div className="hidden xl:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-4">ID</th>
                                    <th className="px-6 py-4">Họ và tên</th>
                                    <th className="px-6 py-4">Giới tính</th>
                                    <th className="px-6 py-4">Ngày sinh</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Vai trò</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">Không tìm thấy tài khoản.</td></tr>
                                ) : (
                                    paginatedUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-4 text-sm text-slate-500">{u.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{u.full_name || 'Chưa cập nhật'}</span>
                                                    <span className="text-xs text-slate-500">@{u.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{u.gender || '---'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{u.date_of_birth || '---'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                                            <td className="px-6 py-4"><RoleBadge roleName={u.role} /></td>
                                            <td className="px-6 py-4"><StatusBadge isActive={u.is_active} /></td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setViewingUser(u); setIsViewModalOpen(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Chi tiết"><Eye size={16} /></button>
                                                    <button onClick={() => { setEditingUser(u); setIsUpsertModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Đổi quyền"><Edit size={16} /></button>
                                                    {/* Ẩn nút khóa nếu là chính tài khoản đang đăng nhập */}
                                                    {u.username !== currentUsername && (
                                                        <button onClick={() => handleToggleStatus(u)} className={`p-2 rounded-lg ${u.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} title={u.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                                                            {u.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                                                        </button>
                                                    )}
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
                        <div className="hidden xl:flex mt-5 justify-center items-center gap-3">
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

                    {/* --- MODAL 1: VIEW DETAILS (KHÔNG THAY ĐỔI) --- */}
                    <AnimatePresence>
                        {isViewModalOpen && viewingUser && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">
                                    <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                                    <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full backdrop-blur-sm"><X size={18} /></button>

                                    <div className="px-6 pb-6 relative">
                                        <div className="w-24 h-24 mx-auto -mt-12 bg-white rounded-full p-1.5 shadow-lg relative z-10 mb-4">
                                            <img src={`https://ui-avatars.com/api/?name=${viewingUser.full_name || viewingUser.username}&background=0D8ABC&color=fff&size=128`} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                        </div>

                                        <div className="text-center mb-6">
                                            <h3 className="text-xl font-bold text-slate-800">{viewingUser.full_name || 'Chưa cập nhật tên'}</h3>
                                            <p className="text-slate-500 text-sm mb-3">@{viewingUser.username}</p>
                                            <div className="flex justify-center gap-2">
                                                <RoleBadge roleName={viewingUser.role} />
                                                <StatusBadge isActive={viewingUser.is_active} />
                                            </div>
                                        </div>

                                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3 text-sm">
                                                <Mail size={16} className="text-slate-400" />
                                                <span className="text-slate-600 flex-1">Email:</span>
                                                <span className="font-medium text-slate-800">{viewingUser.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                                <User size={16} className="text-slate-400" />
                                                <span className="text-slate-600 flex-1">Giới tính:</span>
                                                <span className="font-medium text-slate-800">{viewingUser.gender || 'Chưa cập nhật'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                                <Calendar size={16} className="text-slate-400" />
                                                <span className="text-slate-600 flex-1">Ngày sinh:</span>
                                                <span className="font-medium text-slate-800">{viewingUser.date_of_birth || 'Chưa cập nhật'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                                <Phone size={16} className="text-slate-400" />
                                                <span className="text-slate-600 flex-1">Số điện thoại:</span>
                                                <span className="font-medium text-slate-800">{viewingUser.phone || 'Chưa cập nhật'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                                <MapPin size={16} className="text-slate-400 shrink-0" />
                                                <span className="text-slate-600 flex-1 shrink-0">Địa chỉ:</span>
                                                <span className="font-medium text-slate-800 text-right truncate" title={viewingUser.address || 'Chưa cập nhật'}>{viewingUser.address || 'Chưa cập nhật'}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 text-center">
                                            <p className="text-xs text-slate-400">Tham gia hệ thống vào lúc: {new Date(viewingUser.created_at).toLocaleString('vi-VN')}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* --- MODAL 2: UPSERT USER (CHỈ FORM, TO RỘNG, CHIA KHU VỰC) --- */}
                    <AnimatePresence>
                        {isUpsertModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
                                >
                                    <form onSubmit={handleUpsertSubmit} className="flex flex-col h-full overflow-hidden">
                                        {/* HEADER */}
                                        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                                    {editingUser ? <Edit className="text-amber-500" size={24} /> : <Plus className="text-blue-600" size={24} />}
                                                    {editingUser ? 'Cập nhật thông tin tài khoản' : 'Tạo tài khoản mới'}
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {editingUser ? 'Chỉnh sửa các thông tin cần thiết bên dưới.' : 'Điền đầy đủ thông tin để cấp quyền truy cập cho người dùng mới.'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setIsUpsertModalOpen(false); setEditingUser(null); }}
                                                className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-200 p-2 rounded-xl transition-colors border border-slate-200 shadow-sm"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* BODY FORM (Cuộn được nếu màn hình nhỏ) */}
                                        <div className="p-8 overflow-y-auto flex-1 bg-white">

                                            {/* --- PHẦN 1: THÔNG TIN HỆ THỐNG --- */}
                                            <div className="mb-8">
                                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                                                    <Shield size={16} /> Thông tin truy cập hệ thống
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">TÊN ĐĂNG NHẬP <span className="text-rose-500">*</span></label>
                                                        <div className="relative">
                                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                            <input
                                                                name="username"
                                                                defaultValue={editingUser?.username}
                                                                required
                                                                disabled={!!editingUser}
                                                                placeholder="ví dụ: admin01"
                                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">ĐỊA CHỈ EMAIL <span className="text-rose-500">*</span></label>
                                                        <div className="relative">
                                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                            <input
                                                                name="email"
                                                                type="email"
                                                                defaultValue={editingUser?.email}
                                                                required
                                                                placeholder="email@domain.com"
                                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {!editingUser && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 mb-2">MẬT KHẨU <span className="text-rose-500">*</span></label>
                                                            <div className="relative">
                                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                                <input
                                                                    name="password"
                                                                    type="password"
                                                                    required
                                                                    minLength={6}
                                                                    placeholder="Tối thiểu 6 ký tự"
                                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">VAI TRÒ (QUYỀN) <span className="text-rose-500">*</span></label>
                                                        <select
                                                            name="role"
                                                            defaultValue={editingUser?.role || 'user'}
                                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none cursor-pointer transition-all"
                                                        >
                                                            <option value="admin">Admin (Quản trị viên)</option>
                                                            <option value="user">User (Người dùng cơ bản)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* --- PHẦN 2: THÔNG TIN CÁ NHÂN --- */}
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                                                    <User size={16} /> Thông tin cá nhân liên hệ
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">HỌ VÀ TÊN</label>
                                                        <input
                                                            name="full_name"
                                                            defaultValue={editingUser?.full_name || ''}
                                                            placeholder="Nhập đầy đủ họ và tên"
                                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">SỐ ĐIỆN THOẠI</label>
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                            <input
                                                                name="phone"
                                                                defaultValue={editingUser?.phone || ''}
                                                                placeholder="09xx xxx xxx"
                                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 mb-2">GIỚI TÍNH</label>
                                                            <select
                                                                name="gender"
                                                                defaultValue={editingUser?.gender || ''}
                                                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none cursor-pointer"
                                                            >
                                                                <option value="">Chưa chọn</option>
                                                                <option value="Nam">Nam</option>
                                                                <option value="Nữ">Nữ</option>
                                                                <option value="Khác">Khác</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 mb-2">NGÀY SINH</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="date"
                                                                    name="date_of_birth"
                                                                    defaultValue={editingUser?.date_of_birth || ''}
                                                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">ĐỊA CHỈ LIÊN HỆ</label>
                                                        <div className="relative">
                                                            <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                                            <textarea
                                                                name="address"
                                                                defaultValue={editingUser?.address || ''}
                                                                rows={3}
                                                                placeholder="Nhập địa chỉ chi tiết (Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)"
                                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none resize-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* FOOTER */}
                                        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => { setIsUpsertModalOpen(false); setEditingUser(null); }}
                                                className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
                                            >
                                                Hủy bỏ
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-70 shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xử lý...
                                                    </span>
                                                ) : (
                                                    editingUser ? 'Lưu thay đổi' : 'Hoàn tất tạo mới'
                                                )}
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
