import React, { useState, useEffect } from 'react';
import axios from 'axios';

import {
    Save, User, Mail, Phone, MapPin,
    Calendar, CheckCircle, Upload, Shield, Clock, Camera
} from 'lucide-react';
import Sidebar from '@/pages/SidebarPage';

interface UserProfile {
    username: string;
    email: string;
    full_name: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    address: string;
    role: string;
    created_at: string;
    avatar_url?: string;
}

export default function ProfilePage() {
    const token = localStorage.getItem('access_token');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch dữ liệu cá nhân
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:8000/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile(res.data);
            } catch (error) {
                setMessage({ type: 'error', text: 'Không thể tải thông tin. Vui lòng đăng nhập lại.' });
            } finally {
                setIsLoading(false);
            }
        };
        if (token) fetchProfile();
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => prev ? { ...prev, [name]: value } : null);
    };

    // Hàm xử lý lưu thông tin text
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                email: profile?.email,
                full_name: profile?.full_name,
                gender: profile?.gender,
                date_of_birth: profile?.date_of_birth,
                phone: profile?.phone,
                address: profile?.address,
            };

            const res = await axios.patch('http://127.0.0.1:8000/auth/me', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProfile(res.data);
            showToast('success', 'Cập nhật thông tin thành công!');
        } catch (error: any) {
            showToast('error', error.response?.data?.detail || 'Lỗi khi cập nhật!');
        } finally {
            setIsSaving(false);
        }
    };

    // Hàm tự động Upload Avatar khi người dùng chọn file
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Hiển thị tạm ảnh vừa chọn (Optimistic UI)
        const tempUrl = URL.createObjectURL(file);
        setProfile(prev => prev ? { ...prev, avatar_url: tempUrl } : null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('http://127.0.0.1:8000/auth/me/avatar', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Cập nhật URL thật từ server
            setProfile(prev => prev ? { ...prev, avatar_url: res.data.avatar_url } : null);
            showToast('success', 'Đã cập nhật ảnh đại diện!');
        } catch (err) {
            showToast('error', 'Lỗi khi tải ảnh lên. Vui lòng thử lại!');
        } finally {
            setIsUploading(false);
        }
    };

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">Đang tải dữ liệu...</div>;

    // Xử lý logic hiển thị ảnh mượt mà (chặn lỗi hiển thị sai link)
    const displayName = profile?.full_name || profile?.username || 'User';
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff&size=256&bold=true`;

    const getAvatarSrc = () => {
        const url = profile?.avatar_url;
        if (!url) return fallbackAvatar;
        // Nếu là blob (ảnh preview tạm) thì dùng luôn
        if (url.startsWith('blob:')) return url;
        // Nếu là link backend
        return `http://127.0.0.1:8000${url}`;
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                {/* Header Navbar */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 lg:px-8 sticky top-0 z-30">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 mr-3 text-slate-600 bg-slate-100 rounded-lg">
                        <User size={20} />
                    </button>
                    <h1 className="font-bold text-lg text-slate-800">Hồ sơ cá nhân</h1>
                </header>

                {/* Thông báo (Toast) góc phải trên */}
                {message && (
                    <div
                        className={`fixed top-20 right-8 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                    >
                        {message.type === 'success' ? <CheckCircle size={20} /> : <User size={20} />}
                        <span className="font-medium text-sm">{message.text}</span>
                    </div>
                )}

                <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* CỘT TRÁI: CARD AVATAR & INFO */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                                <div className="h-28 bg-gradient-to-br from-blue-600 to-indigo-700"></div>

                                <div className="px-6 pb-6 text-center relative">
                                    {/* Khung Avatar */}
                                    <div className="relative w-36 h-36 mx-auto -mt-18 rounded-full border-4 border-white shadow-lg bg-white group mb-4">
                                        <img
                                            src={getAvatarSrc()}
                                            alt="Avatar"
                                            className="w-full h-full rounded-full object-cover"
                                        />

                                        {/* Hiệu ứng loading khi upload */}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
                                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}

                                        {/* Nút Upload ẩn hiện khi hover */}
                                        <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
                                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploading} />
                                            <Camera size={28} className="text-white mb-1" />
                                            <span className="text-white text-xs font-bold uppercase tracking-wider">Đổi ảnh</span>
                                        </label>
                                    </div>

                                    <h2 className="text-xl font-bold text-slate-800">{displayName}</h2>
                                    <p className="text-slate-500 text-sm mb-4">@{profile?.username}</p>

                                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100 mb-6">
                                        <Shield size={16} />
                                        {profile?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail size={16} className="text-slate-400 shrink-0" />
                                            <span className="text-slate-600 truncate">{profile?.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Clock size={16} className="text-slate-400 shrink-0" />
                                            <span className="text-slate-600">Tham gia: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CỘT PHẢI: FORM CHỈNH SỬA THÔNG TIN */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                <div className="mb-6 border-b border-slate-100 pb-4">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <User className="text-blue-600" size={22} />
                                        Thông tin chi tiết
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Quản lý và cập nhật thông tin cá nhân của bạn.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và tên</label>
                                        <input
                                            type="text" name="full_name" value={profile?.full_name || ''} onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all outline-none text-sm"
                                            placeholder="Nhập họ và tên đầy đủ..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email liên hệ</label>
                                        <input
                                            type="email" name="email" value={profile?.email || ''} onChange={handleChange} required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all outline-none text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Số điện thoại</label>
                                        <input
                                            type="tel" name="phone" value={profile?.phone || ''} onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all outline-none text-sm"
                                            placeholder="09xx xxx xxx"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Giới tính</label>
                                        <select
                                            name="gender" value={profile?.gender || ''} onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all outline-none text-sm cursor-pointer"
                                        >
                                            <option value="">Chưa chọn</option>
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày sinh</label>
                                        <input
                                            type="date" name="date_of_birth" value={profile?.date_of_birth || ''} onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all outline-none text-sm cursor-pointer"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Địa chỉ hiện tại</label>
                                        <textarea
                                            name="address" value={profile?.address || ''} onChange={handleChange} rows={3}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all outline-none resize-none text-sm"
                                            placeholder="Số nhà, Tên đường, Phường/Xã..."
                                        />
                                    </div>

                                    <div className="sm:col-span-2 pt-4 mt-2 border-t border-slate-100 flex justify-end">
                                        <button
                                            type="submit" disabled={isSaving}
                                            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 active:scale-95 min-w-[160px]"
                                        >
                                            {isSaving ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                                            ) : (
                                                <><Save size={18} /> Lưu thay đổi</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}