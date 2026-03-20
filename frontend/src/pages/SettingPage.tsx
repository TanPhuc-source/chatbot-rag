import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
    Menu, Palette, CheckCircle, PaintRoller, Moon, Sun, Plus,
    Save, MessageSquare, Type, Building2, Bot, RotateCcw,
    XCircle, Info, AlertTriangle, X
} from 'lucide-react';
import { useTheme, PRESET_THEMES } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';

// ── Toast ──────────────────────────────────────────────────────────────────────

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning'; }

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const icons = {
        success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
        error:   <XCircle    size={16} className="text-red-500 shrink-0" />,
        info:    <Info       size={16} className="text-blue-500 shrink-0" />,
        warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
    };
    const borders = {
        success: 'border-l-green-500',
        error:   'border-l-red-500',
        info:    'border-l-blue-500',
        warning: 'border-l-amber-500',
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 ${borders[toast.type]} rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-[360px]`}
        >
            {icons[toast.type]}
            <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 leading-snug">{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-1">
                <X size={14} />
            </button>
        </motion.div>
    );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
            </AnimatePresence>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }>();

    const { themeColor, setThemeColor, isDarkMode, toggleDarkMode } = useTheme();
    const colorInputRef = useRef<HTMLInputElement>(null);
    const isCustomColor = !PRESET_THEMES.find(t => t.id === themeColor);

    const { settings, fetchSettings, updateSettings, resetSettings, isLoading } = useSettingsStore();
    const [formData, setFormData] = useState(settings);
    const [confirmReset, setConfirmReset] = useState(false);

    // ── Toast state ────────────────────────────────────────────────────────────
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);
    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Fetch on mount ─────────────────────────────────────────────────────────
    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // Sync form khi store cập nhật (sau fetch hoặc save)
    useEffect(() => { setFormData(settings); }, [settings]);

    const handleChatbotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) { addToast('Bạn chưa đăng nhập!', 'error'); return; }
        try {
            await updateSettings(formData, token);
            addToast('Cập nhật giao diện Chatbot thành công!', 'success');
        } catch {
            addToast('Cập nhật thất bại. Vui lòng thử lại.', 'error');
        }
    };

    // ── Reset ──────────────────────────────────────────────────────────────────
    const handleReset = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) { addToast('Bạn chưa đăng nhập!', 'error'); return; }
        try {
            await resetSettings(token);
            setConfirmReset(false);
            addToast('Đã reset về mặc định!', 'info');
        } catch {
            addToast('Reset thất bại. Vui lòng thử lại.', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* --- HEADER --- */}
            <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 sticky top-0 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight hidden sm:block">Cài đặt hệ thống</span>
                </div>
                <button
                    onClick={toggleDarkMode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
                >
                    {isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-amber-500" />}
                    <span className="text-sm font-semibold">{isDarkMode ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
                </button>
            </header>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 px-4 lg:px-8 pt-6 pb-12 overflow-y-auto bg-slate-50/50 dark:bg-[#0d0d0d] transition-colors">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* SECTION 1: GIAO DIỆN ADMIN */}
                    <section className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#2a2a2a] shadow-sm overflow-hidden transition-colors">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2a2a2a] flex items-center gap-3 bg-slate-50/50 dark:bg-transparent">
                            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Palette className="text-blue-600 dark:text-blue-400" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Giao diện Trang quản trị</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tùy chỉnh màu sắc chủ đạo cho toàn bộ khu vực Admin.</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <PaintRoller size={16} /> Chọn màu chủ đạo
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                {PRESET_THEMES.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setThemeColor(opt.id); addToast(`Đã chuyển sang màu ${opt.name}`, 'success'); }}
                                        className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
                                            ${themeColor === opt.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.02]' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-transparent'}`}
                                    >
                                        {themeColor === opt.id && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-white dark:bg-[#161616] rounded-full">
                                                <CheckCircle size={22} className="text-white dark:text-[#161616] bg-blue-600 rounded-full" />
                                            </motion.div>
                                        )}
                                        <div className="w-10 h-10 rounded-full shadow-md" style={{ backgroundColor: opt.id }} />
                                        <span className={`text-xs font-bold text-center ${themeColor === opt.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {opt.name}
                                        </span>
                                    </button>
                                ))}
                                <button
                                    onClick={() => colorInputRef.current?.click()}
                                    className={`relative p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all
                                        ${isCustomColor ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.02]' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50 dark:bg-transparent'}`}
                                >
                                    {isCustomColor && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-white dark:bg-[#161616] rounded-full">
                                            <CheckCircle size={22} className="text-white dark:text-[#161616] bg-blue-600 rounded-full" />
                                        </motion.div>
                                    )}
                                    <div className="w-10 h-10 rounded-full shadow-md flex items-center justify-center overflow-hidden" style={{ backgroundColor: isCustomColor ? themeColor : '#e2e8f0' }}>
                                        {!isCustomColor && <Plus className="text-slate-500" size={20} />}
                                    </div>
                                    <span className={`text-xs font-bold text-center ${isCustomColor ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        Màu tùy chỉnh
                                    </span>
                                    <input type="color" ref={colorInputRef} value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: GIAO DIỆN CHATBOT */}
                    <section className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#2a2a2a] shadow-sm overflow-hidden transition-colors">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2a2a2a] flex items-center justify-between bg-slate-50/50 dark:bg-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                    <MessageSquare className="text-green-600 dark:text-green-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Giao diện Chatbot</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Thiết lập hiển thị cho người dùng ngoài màn hình trò chuyện.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Brand Color */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Bot size={16} className="text-green-500" /> Màu thương hiệu Chatbot (Brand Color)
                                </h4>
                                <div className="flex items-center gap-6 bg-slate-50 dark:bg-[#0d0d0d] p-4 rounded-xl border border-slate-200 dark:border-[#2a2a2a]">
                                    <input
                                        type="color" name="themeColor"
                                        value={formData.themeColor || '#1a5fb4'}
                                        onChange={handleChatbotChange}
                                        className="w-14 h-14 rounded-lg cursor-pointer border-0 p-0 shadow-sm transition-transform hover:scale-105 bg-transparent"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Mã màu (Hex)</span>
                                        <input
                                            type="text" name="themeColor"
                                            value={formData.themeColor || '#1a5fb4'}
                                            onChange={handleChatbotChange}
                                            className="font-mono text-sm bg-white dark:bg-[#161616] border border-slate-300 dark:border-[#2a2a2a] rounded-md px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-green-500 uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Welcome texts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Type size={16} className="text-blue-500" /> Tiêu đề chính
                                    </h4>
                                    <input type="text" name="welcomeTitle" value={formData.welcomeTitle || ''} onChange={handleChatbotChange}
                                        placeholder="Ví dụ: Xin chào! 👋"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-[#0d0d0d] dark:border-[#2a2a2a] dark:text-white" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Type size={16} className="text-blue-500 opacity-50" /> Tiêu đề phụ
                                    </h4>
                                    <input type="text" name="welcomeSubtitle" value={formData.welcomeSubtitle || ''} onChange={handleChatbotChange}
                                        placeholder="Ví dụ: Tôi có thể giúp gì cho bạn?"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-[#0d0d0d] dark:border-[#2a2a2a] dark:text-white" />
                                </div>
                            </div>

                            {/* School info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Building2 size={16} className="text-purple-500" /> Tên Cơ quan / Trường học
                                    </h4>
                                    <input type="text" name="schoolName" value={formData.schoolName || ''} onChange={handleChatbotChange}
                                        placeholder="Ví dụ: Trường Đại Học Đồng Tháp"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors dark:bg-[#0d0d0d] dark:border-[#2a2a2a] dark:text-white" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Building2 size={16} className="text-purple-500 opacity-50" /> Tên Khoa / Trung tâm
                                    </h4>
                                    <input type="text" name="schoolDept" value={formData.schoolDept || ''} onChange={handleChatbotChange}
                                        placeholder="Ví dụ: Trung Tâm Ngoại Ngữ Và Tin Học"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors dark:bg-[#0d0d0d] dark:border-[#2a2a2a] dark:text-white" />
                                </div>
                            </div>

                            {/* FAQ */}
                            <div className="pt-6 border-t border-slate-200 dark:border-[#2a2a2a]">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                                    <MessageSquare size={16} className="text-orange-500" /> Các câu hỏi gợi ý (FAQ)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map((num) => (
                                        <div key={num}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Câu hỏi gợi ý {num}</label>
                                            <input
                                                type="text" name={`faq${num}`}
                                                value={formData[`faq${num}` as keyof typeof formData] || ''}
                                                onChange={handleChatbotChange}
                                                placeholder={`Nhập nội dung câu hỏi ${num}...`}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors dark:bg-[#0d0d0d] dark:border-[#2a2a2a] dark:text-white" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer — Save / Reset */}
                        <div className="px-6 py-4 bg-slate-50/80 dark:bg-[#0d0d0d]/80 border-t border-slate-200 dark:border-[#2a2a2a] flex items-center justify-between gap-3">
                            {/* Reset button + confirm */}
                            <div className="flex items-center gap-2">
                                {confirmReset ? (
                                    <>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Xác nhận reset?</span>
                                        <button onClick={handleReset} disabled={isLoading}
                                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-70">
                                            <RotateCcw size={14} /> Xác nhận
                                        </button>
                                        <button onClick={() => setConfirmReset(false)}
                                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                            Hủy
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => setConfirmReset(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                        <RotateCcw size={14} /> Reset mặc định
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-green-500/20 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                            >
                                <Save size={18} />
                                {isLoading ? 'Đang lưu...' : 'Lưu cài đặt Chatbot'}
                            </button>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}