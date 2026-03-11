import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
// Đã thay Camera thành Upload
import { Save, User, Mail, Phone, MapPin, Calendar, CheckCircle, Upload } from 'lucide-react';
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
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

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
            setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });

            // Xóa thông báo sau 3s
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Lỗi khi cập nhật!' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center">Đang tải dữ liệu...</div>;

    const displayName = profile?.full_name || profile?.username || 'User';
    const avatarUrl = `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff&size=256&bold=true`;

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 lg:px-8 sticky top-0 z-30">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 mr-3 text-slate-600">
                        <User size={24} />
                    </button>
                    <h1 className="font-bold text-lg text-slate-800">Hồ sơ cá nhân</h1>
                </header>

                <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
                    {message && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className={`p-4 mb-6 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}
                        >
                            {message.type === 'success' ? <CheckCircle size={20} /> : <User size={20} />}
                            <span className="font-medium">{message.text}</span>
                        </motion.div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header Cover */}
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

                        <div className="px-6 sm:px-10 pb-10">
                            <div className="relative flex flex-col sm:flex-row sm:items-end gap-6 -mt-16 mb-10">
                                <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white shrink-0">
                                    <img
                                        src={previewUrl || profile?.avatar_url || avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                    <label
                                        className="absolute bottom-1 right-1 bg-white rounded-full p-1.5 shadow cursor-pointer hover:bg-blue-50"
                                        title="Tải ảnh lên"
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setSelectedFile(file);
                                                    setPreviewUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        {/* Đổi icon thành Upload */}
                                        <Upload size={18} className="text-blue-600" />
                                    </label>
                                </div>
                                <div className="flex-1 pb-2">
                                    <h2 className="text-2xl font-bold text-slate-800">{displayName}</h2>
                                    <p className="text-slate-500 font-medium">@{profile?.username} • Vai trò: <span className="text-blue-600 uppercase text-xs font-bold bg-blue-50 px-2 py-1 rounded-md">{profile?.role}</span></p>
                                </div>
                            </div>

                            {/* Form cập nhật */}
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Thông tin liên hệ</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">Họ và tên</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" name="full_name" value={profile?.full_name || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" placeholder="Nhập họ và tên..." />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="email" name="email" value={profile?.email || ''} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">Số điện thoại</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="tel" name="phone" value={profile?.phone || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" placeholder="0123 456 789" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">Ngày sinh</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input type="date" name="date_of_birth" value={profile?.date_of_birth || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">Giới tính</label>
                                    <select name="gender" value={profile?.gender || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none">
                                        <option value="">Chưa chọn</option>
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">Địa chỉ</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-3 top-3 text-slate-400" />
                                        <textarea name="address" value={profile?.address || ''} onChange={handleChange} rows={2} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none" placeholder="Số nhà, Phường, Thành phố..." />
                                    </div>
                                </div>

                                <div className="md:col-span-2 pt-4 flex justify-end">
                                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-70 active:scale-95">
                                        <Save size={18} />
                                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                    {selectedFile && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!selectedFile) return;
                                                const formData = new FormData();
                                                formData.append('file', selectedFile);

                                                try {
                                                    const res = await axios.post(
                                                        'http://127.0.0.1:8000/auth/me/avatar',
                                                        formData,
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    setProfile(prev => prev ? { ...prev, avatar_url: res.data.avatar_url } : null);
                                                    setSelectedFile(null);
                                                    setPreviewUrl(null);
                                                    setMessage({ type: 'success', text: 'Avatar đã được cập nhật!' });
                                                } catch (err) {
                                                    setMessage({ type: 'error', text: 'Lỗi khi tải avatar lên' });
                                                }
                                            }}
                                            className="ml-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Upload size={18} /> Lưu Avatar
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}