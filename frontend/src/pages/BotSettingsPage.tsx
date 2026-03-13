import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    RefreshCw, Menu, LogOut, Save, RotateCcw,
    CheckCircle, XCircle, Info, Bot, Thermometer,
    Hash, FileText, AlertTriangle
} from 'lucide-react';

interface Settings {
    id: number;
    bot_name: string;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    updated_at: string;
}
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

const API = 'http://127.0.0.1:8000';

export default function BotSettingsPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const { setIsMobileMenuOpen } = useOutletContext<any>();

    const [settings, setSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState({ bot_name: '', system_prompt: '', temperature: 0.3, max_tokens: 1024 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => { if (!token) navigate('/login'); }, [token]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Không thể tải cấu hình');
            const data: Settings = await res.json();
            setSettings(data);
            setForm({ bot_name: data.bot_name, system_prompt: data.system_prompt, temperature: data.temperature, max_tokens: data.max_tokens });
            setIsDirty(false);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsLoading(false); }
    }, [token]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleChange = (key: string, value: any) => {
        setForm(f => ({ ...f, [key]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!form.bot_name.trim()) { addToast('Tên chatbot không được để trống', 'error'); return; }
        if (!form.system_prompt.trim()) { addToast('System prompt không được để trống', 'error'); return; }
        setIsSaving(true);
        try {
            const res = await fetch(`${API}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Lỗi lưu'); }
            const data = await res.json();
            setSettings(data);
            setIsDirty(false);
            addToast('Đã lưu cấu hình thành công');
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsSaving(false); }
    };

    const handleReset = async () => {
        setIsResetting(true);
        try {
            const res = await fetch(`${API}/settings/reset`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Reset thất bại');
            const data = await res.json();
            setSettings(data);
            setForm({ bot_name: data.bot_name, system_prompt: data.system_prompt, temperature: data.temperature, max_tokens: data.max_tokens });
            setIsDirty(false);
            addToast('Đã reset về mặc định', 'info');
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsResetting(false); setConfirmReset(false); }
    };

    return (
        <>
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[260px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-sm font-medium transition-colors
                            ${t.type === 'success' ? 'border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
                                    : t.type === 'error' ? 'border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
                                        : 'border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'}`}>
                            {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {confirmReset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl transition-colors"><AlertTriangle size={22} className="text-orange-600 dark:text-orange-400" /></div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Reset về mặc định?</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Toàn bộ cấu hình hiện tại sẽ bị xóa và trở về giá trị mặc định.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmReset(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Hủy</button>
                                <button onClick={handleReset} disabled={isResetting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-70 flex items-center gap-2 transition-all active:scale-95">
                                    {isResetting && <RefreshCw size={14} className="animate-spin" />} Reset
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900 transition-colors">
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Menu size={24} /></button>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden lg:block">Cấu hình Chatbot</h2>
                        {isDirty && <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 px-2 py-0.5 rounded-full font-semibold transition-colors">Chưa lưu</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchSettings} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-semibold transition-colors">Đăng xuất <LogOut size={16} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-5">

                        {isLoading ? (
                            <div className="flex items-center justify-center py-32 text-slate-400 dark:text-slate-500">
                                <RefreshCw size={32} className="animate-spin opacity-40" />
                            </div>
                        ) : (
                            <>
                                {/* Thông tin bot */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot size={18} className="text-indigo-500 dark:text-indigo-400" />
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Thông tin chatbot</h3>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Tên chatbot</label>
                                        <input value={form.bot_name} onChange={e => handleChange('bot_name', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                                            placeholder="VD: Trợ lý ĐH Đồng Tháp" />
                                    </div>
                                </div>

                                {/* System prompt */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={18} className="text-blue-500 dark:text-blue-400" />
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">System Prompt</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Prompt này sẽ được gửi đến AI trước mỗi cuộc trò chuyện để định hướng hành vi của bot.</p>
                                    <textarea value={form.system_prompt} onChange={e => handleChange('system_prompt', e.target.value)} rows={10}
                                        className="w-full px-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 resize-none font-mono leading-relaxed transition-colors"
                                        placeholder="Nhập system prompt..." />
                                    <p className="text-xs text-slate-400 dark:text-slate-500 text-right">{form.system_prompt.length} ký tự</p>
                                </div>

                                {/* Model params */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-5 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Thermometer size={18} className="text-orange-500 dark:text-orange-400" />
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Tham số Model</h3>
                                    </div>

                                    {/* Temperature */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Temperature</label>
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg transition-colors">{form.temperature.toFixed(2)}</span>
                                        </div>
                                        <input type="range" min="0" max="2" step="0.05" value={form.temperature}
                                            onChange={e => handleChange('temperature', parseFloat(e.target.value))}
                                            className="w-full accent-indigo-500 dark:accent-indigo-400" />
                                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                            <span>0 — Chính xác</span>
                                            <span>1 — Cân bằng</span>
                                            <span>2 — Sáng tạo</span>
                                        </div>
                                    </div>

                                    {/* Max tokens */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><Hash size={12} /> Max Tokens</label>
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg transition-colors">{form.max_tokens}</span>
                                        </div>
                                        <input type="range" min="128" max="4096" step="128" value={form.max_tokens}
                                            onChange={e => handleChange('max_tokens', parseInt(e.target.value))}
                                            className="w-full accent-indigo-500 dark:accent-indigo-400" />
                                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                            <span>128</span><span>2048</span><span>4096</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer info */}
                                {settings && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                                        Cập nhật lần cuối: {new Date(settings.updated_at).toLocaleString('vi-VN')}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 justify-end pb-6">
                                    <button onClick={() => setConfirmReset(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                        <RotateCcw size={15} /> Reset mặc định
                                    </button>
                                    <button onClick={handleSave} disabled={isSaving || !isDirty}
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-lg shadow-blue-500/30 dark:shadow-none transition-all active:scale-95">
                                        {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                        {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}