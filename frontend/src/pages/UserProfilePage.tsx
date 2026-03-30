import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Menu, Save, User, Mail, Shield, Clock, Camera, CheckCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/shared/Sidebar';
import { useAuthStore } from '@/store/authStore';

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

export default function UserProfilePage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const { init } = useAuthStore();

    // State cho giao diện chung giống ChatPage
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [chatDarkMode, setChatDarkMode] = useState(() => localStorage.getItem("chat_theme_dark") === "true");
    const [chatColor, setChatColor] = useState(() => localStorage.getItem("chat_theme_color") || "#1a5fb4");

    // State cho dữ liệu Profile
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Khởi tạo Auth & Đồng bộ Theme
    useEffect(() => { init(); }, [init]);
    useEffect(() => {
        localStorage.setItem("chat_theme_dark", String(chatDarkMode));
        localStorage.setItem("chat_theme_color", chatColor);
    }, [chatDarkMode, chatColor]);

    // Lấy dữ liệu Profile
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
        else {
            setIsLoading(false);
            navigate('/login');
        }
    }, [token, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => prev ? { ...prev, [name]: value } : null);
    };

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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const tempUrl = URL.createObjectURL(file);
        setProfile(prev => prev ? { ...prev, avatar_url: tempUrl } : null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('http://127.0.0.1:8000/auth/me/avatar', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(prev => prev ? { ...prev, avatar_url: res.data.avatar_url } : null);
            showToast('success', 'Đã cập nhật ảnh đại diện!');
            init(); // Đồng bộ ngay với Sidebar
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

    const themeStyles = chatDarkMode ? {
        "--bg-base": "#050c16", "--bg-1": "#0d1b2a", "--bg-2": "#1b263b", "--bg-3": "#415a77",
        "--text-primary": "#f8fafc", "--text-secondary": "#e2e8f0", "--text-muted": "#94a3b8",
        "--border": "#1e293b", "--border-mid": "#334155", "--sb-bg": "#020617", "--brand": chatColor,
    } as React.CSSProperties : {
        "--bg-base": "#ffffff", "--bg-1": "#ffffff", "--bg-2": "#f8fafc", "--bg-3": "#e2e8f0",
        "--text-primary": "#0f172a", "--text-secondary": "#334155", "--text-muted": "#64748b",
        "--border": "#e2e8f0", "--border-mid": "#cbd5e1", "--sb-bg": "#f8fafc", "--brand": chatColor,
    } as React.CSSProperties;

    const displayName = profile?.full_name || profile?.username || 'User';
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff&size=256&bold=true`;

    const getAvatarSrc = () => {
        const url = profile?.avatar_url;
        if (!url) return fallbackAvatar;
        if (url.startsWith('blob:') || url.startsWith('http')) return url;
        const path = url.startsWith('/') ? url : `/${url}`;
        return `http://127.0.0.1:8000${path}`;
    };

    if (isLoading) return <div style={{ ...themeStyles, background: "var(--bg-base)", color: "var(--text-primary)" }} className="flex h-screen w-screen items-center justify-center font-medium">Đang tải dữ liệu...</div>;

    return (
        <div className={chatDarkMode ? "dark" : ""} style={{ display: "flex", height: "100dvh", width: "100vw", overflow: "hidden", position: "fixed", top: 0, left: 0, background: "var(--bg-base)", color: "var(--text-primary)", transition: "background 0.3s, color 0.3s", ...themeStyles }}>

            {/* ── Desktop sidebar ── */}
            <div className="hidden lg:flex h-full" style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
                {/* Đã xóa các props theme thừa ở đây */}
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
            </div>

            {/* ── Mobile sidebar overlay ── */}
            <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: mobileOpen ? "auto" : "none" }}>
                <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(5,12,22,0.55)", backdropFilter: "blur(4px)", opacity: mobileOpen ? 1 : 0, transition: "opacity 0.25s ease" }} />
                <div style={{ position: "absolute", top: 0, left: 0, height: "100%", transform: mobileOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
                    {/* Đã xóa các props theme thừa ở đây */}
                    <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
                </div>
            </div>

            {/* ── Main Content ── */}
            <main style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative", zIndex: 5 }}>

                {/* Header */}
                <header style={{ display: "flex", alignItems: "center", padding: "0 clamp(12px, 3vw, 24px)", height: "clamp(52px, 8vw, 64px)", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--bg-1)" }}>
                    <button onClick={() => setMobileOpen(true)} style={{ padding: 7, borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", marginRight: 12 }} className="lg:hidden hover:bg-[var(--bg-3)]">
                        <Menu size={18} />
                    </button>
                    <button onClick={() => navigate('/')} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 16 }} className="hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)] transition-colors">
                        <ChevronLeft size={16} /> Quay lại Chat
                    </button>
                    <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Hồ sơ cá nhân</h1>
                </header>

                {/* Content Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "clamp(16px, 4vw, 32px)", background: "var(--bg-base)" }} className="custom-scrollbar">

                    {/* Toast Notification */}
                    {message && (
                        <div style={{ position: "fixed", top: 80, right: 24, zIndex: 50, padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, background: message.type === 'success' ? "#ecfdf5" : "#fef2f2", color: message.type === 'success' ? "#047857" : "#be123c", border: `1px solid ${message.type === 'success' ? "#a7f3d0" : "#fecdd3"}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", animation: "slide-down 0.3s ease-out" }}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <User size={18} />}
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{message.text}</span>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Cột Trái: Avatar Card */}
                        <div className="md:col-span-1">
                            <div style={{ background: "var(--bg-1)", borderRadius: 24, border: "1px solid var(--border)", overflow: "hidden" }}>
                                <div style={{ height: 100, background: "var(--brand)", opacity: 0.8 }}></div>
                                <div style={{ padding: "0 20px 24px", textAlign: "center", position: "relative" }}>

                                    {/* Avatar Wrapper */}
                                    <div className="group" style={{ position: "relative", width: 110, height: 110, margin: "-55px auto 16px", borderRadius: "50%", border: "4px solid var(--bg-1)", background: "var(--bg-1)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                                        <img src={getAvatarSrc()} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                                        {isUploading && (
                                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}

                                        <label style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "white", cursor: "pointer", opacity: 0, transition: "opacity 0.2s" }} className="group-hover:opacity-100">
                                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploading} />
                                            <Camera size={24} style={{ marginBottom: 4 }} />
                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Đổi ảnh</span>
                                        </label>
                                    </div>

                                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--text-primary)" }}>{displayName}</h2>
                                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>@{profile?.username}</p>

                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-2)", color: "var(--brand)", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid var(--border)", marginBottom: 20 }}>
                                        <Shield size={14} />
                                        {profile?.role === 'admin' ? 'Quản trị viên' : 'Học viên'}
                                    </div>

                                    <div style={{ background: "var(--bg-2)", borderRadius: 16, padding: 16, textAlign: "left", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <Mail size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                            <span style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.email}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <Clock size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Tham gia: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '---'}</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Cột Phải: Form Thông Tin */}
                        <div className="md:col-span-2">
                            <div style={{ background: "var(--bg-1)", borderRadius: 24, border: "1px solid var(--border)", padding: "clamp(20px, 4vw, 32px)" }}>

                                <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 24 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
                                        <User style={{ color: "var(--brand)" }} size={20} />
                                        Chi tiết thông tin
                                    </h3>
                                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Cập nhật thông tin liên hệ và cá nhân của bạn.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Họ và tên</label>
                                        <input type="text" name="full_name" value={profile?.full_name || ''} onChange={handleChange} placeholder="Nhập họ và tên..."
                                            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border-mid)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", transition: "all 0.2s" }}
                                            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,95,180,0.1)"; }}
                                            onBlur={e => { e.target.style.borderColor = "var(--border-mid)"; e.target.style.boxShadow = "none"; }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Số điện thoại</label>
                                        <input type="tel" name="phone" value={profile?.phone || ''} onChange={handleChange} placeholder="09xx..."
                                            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border-mid)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", transition: "all 0.2s" }}
                                            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,95,180,0.1)"; }}
                                            onBlur={e => { e.target.style.borderColor = "var(--border-mid)"; e.target.style.boxShadow = "none"; }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Giới tính</label>
                                        <select name="gender" value={profile?.gender || ''} onChange={handleChange}
                                            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border-mid)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", cursor: "pointer", transition: "all 0.2s" }}
                                            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,95,180,0.1)"; }}
                                            onBlur={e => { e.target.style.borderColor = "var(--border-mid)"; e.target.style.boxShadow = "none"; }}
                                        >
                                            <option value="">Chưa chọn</option>
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Ngày sinh</label>
                                        <input type="date" name="date_of_birth" value={profile?.date_of_birth || ''} onChange={handleChange}
                                            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border-mid)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", cursor: "pointer", transition: "all 0.2s" }}
                                            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,95,180,0.1)"; }}
                                            onBlur={e => { e.target.style.borderColor = "var(--border-mid)"; e.target.style.boxShadow = "none"; }}
                                        />
                                    </div>


                                    <div>
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Email liên hệ</label>
                                        <textarea name="email" value={profile?.email || ''} onChange={handleChange} rows={1} placeholder="Nhập email liên hệ..."
                                            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border-mid)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", resize: "none", transition: "all 0.2s" }}
                                            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,95,180,0.1)"; }}
                                            onBlur={e => { e.target.style.borderColor = "var(--border-mid)"; e.target.style.boxShadow = "none"; }}
                                        />
                                    </div>


                                    <div className="sm:col-span-2">
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Địa chỉ</label>
                                        <textarea name="address" value={profile?.address || ''} onChange={handleChange} rows={1} placeholder="Phường, Xã..."
                                            style={{ width: "100%", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border-mid)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", resize: "none", transition: "all 0.2s" }}
                                            onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(26,95,180,0.1)"; }}
                                            onBlur={e => { e.target.style.borderColor = "var(--border-mid)"; e.target.style.boxShadow = "none"; }}
                                        />
                                    </div>

                                    <div className="sm:col-span-2" style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                                        <button type="submit" disabled={isSaving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 32px", background: "var(--brand)", color: "white", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600, cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.7 : 1, transition: "transform 0.1s, filter 0.2s", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }} className={!isSaving ? "hover:brightness-110 active:scale-95" : ""}>
                                            {isSaving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Đang lưu...</> : <><Save size={18} /> Cập nhật</>}
                                        </button>
                                    </div>
                                </form>

                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}