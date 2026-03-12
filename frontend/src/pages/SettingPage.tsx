import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Menu, Palette, CheckCircle, PaintRoller, Moon, Sun, Plus } from 'lucide-react';
import { useTheme, PRESET_THEMES } from '@/contexts/ThemeContext';

export default function SettingsPage() {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
    }>();

    const { themeColor, setThemeColor, isDarkMode, toggleDarkMode } = useTheme();
    const colorInputRef = useRef<HTMLInputElement>(null);

    // Kiểm tra xem màu hiện tại có phải là màu tự chọn không
    const isCustomColor = !PRESET_THEMES.find(t => t.id === themeColor);

    return (
        <>
            {/* Header: Có hỗ trợ dark mode (dark:bg-slate-900) */}
            <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 sticky top-0 transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight hidden sm:block">Cài đặt hệ thống</span>
                </div>

                {/* Nút Toggle Sáng/Tối */}
                <button
                    onClick={toggleDarkMode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                    {isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-amber-500" />}
                    <span className="text-sm font-semibold">{isDarkMode ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
                </button>
            </header>

            <div className="flex-1 px-4 lg:px-8 pt-6 pb-4 overflow-y-auto bg-slate-50/50 dark:bg-[#0d0d0d] transition-colors">
                <div className="max-w-4xl mx-auto space-y-6">

                    <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#2a2a2a] shadow-sm overflow-hidden transition-colors">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2a2a2a] flex items-center gap-3 bg-slate-50/50 dark:bg-transparent">
                            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Palette className="text-blue-600 dark:text-blue-400" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Giao diện & Màu sắc</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tùy chỉnh màu sắc chủ đạo cho toàn bộ trang quản trị.</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <PaintRoller size={16} /> Chọn màu chủ đạo
                            </h4>

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                {/* Map các màu có sẵn */}
                                {PRESET_THEMES.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setThemeColor(opt.id)}
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

                                {/* Nút MÀU TÙY CHỈNH (Custom Color Picker) */}
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
                                    <div
                                        className="w-10 h-10 rounded-full shadow-md flex items-center justify-center overflow-hidden"
                                        style={{ backgroundColor: isCustomColor ? themeColor : '#e2e8f0' }}
                                    >
                                        {!isCustomColor && <Plus className="text-slate-500" size={20} />}
                                    </div>
                                    <span className={`text-xs font-bold text-center ${isCustomColor ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        Màu tùy chỉnh
                                    </span>
                                    <input
                                        type="color"
                                        ref={colorInputRef}
                                        value={themeColor}
                                        onChange={(e) => setThemeColor(e.target.value)}
                                        className="absolute opacity-0 w-0 h-0"
                                    />
                                </button>
                            </div>

                            {/* Demo hiển thị */}
                            <div className="mt-8 p-6 border border-slate-200 dark:border-[#2a2a2a] rounded-xl bg-slate-50 dark:bg-[#0d0d0d] transition-colors">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-4 tracking-wider">Xem trước giao diện</p>
                                <div className="flex flex-wrap gap-4">
                                    <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all">
                                        Nút Primary
                                    </button>
                                    <button className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all">
                                        Nút Secondary
                                    </button>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                                        <CheckCircle size={18} /> Thông báo hệ thống
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}