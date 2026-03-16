import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    RefreshCw, Menu, Save, RotateCcw,
    CheckCircle, XCircle, Info, Bot,
    FileText, AlertTriangle, Zap, Layers,
    ChevronRight, Clock
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tempLabel(t: number) {
    if (t <= 0.4) return { label: 'Chính xác', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' };
    if (t <= 0.8) return { label: 'Cân bằng', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' };
    if (t <= 1.3) return { label: 'Sáng tạo', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' };
    return { label: 'Rất sáng tạo', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' };
}

function tempBarColor(t: number) {
    if (t <= 0.4) return '#3b82f6';
    if (t <= 0.8) return '#6366f1';
    if (t <= 1.3) return '#8b5cf6';
    return '#f97316';
}

function Section({ icon, title, subtitle, children }: {
    icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{subtitle}</p>}
                </div>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

    const tInfo = tempLabel(form.temperature);
    const tempPct = (form.temperature / 2) * 100;
    const tokenPct = ((form.max_tokens - 128) / (4096 - 128)) * 100;

    return (
        <>
            {/* ── Toasts ── */}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[260px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-sm font-medium
                            ${t.type === 'success' ? 'border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
                                    : t.type === 'error' ? 'border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
                                        : 'border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'}`}>
                            {t.type === 'success' ? <CheckCircle size={15} /> : t.type === 'error' ? <XCircle size={15} /> : <Info size={15} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ── Confirm Reset Modal ── */}
            <AnimatePresence>
                {confirmReset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 8 }}
                            transition={{ duration: 0.16 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={20} className="text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Reset về mặc định?</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Toàn bộ cấu hình hiện tại sẽ bị xóa và trở về giá trị ban đầu. Hành động này không thể hoàn tác.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setConfirmReset(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleReset} disabled={isResetting}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-70 flex items-center gap-2 transition-all active:scale-95">
                                    {isResetting && <RefreshCw size={13} className="animate-spin" />}
                                    Xác nhận reset
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900 transition-colors">

                {/* ── Header ── */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Menu size={22} />
                        </button>
                        <div className="hidden lg:block">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Cấu hình Chatbot</h2>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Tuỳ chỉnh hành vi và tham số của bot</p>
                        </div>
                        <AnimatePresence>
                            {isDirty && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                    className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 px-2.5 py-0.5 rounded-full font-medium">
                                    Chưa lưu
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchSettings}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setConfirmReset(true)}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <RotateCcw size={13} /> Reset
                        </button>
                        <button onClick={handleSave} disabled={isSaving || !isDirty}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-indigo-500/20 transition-all active:scale-95">
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            <span className="hidden sm:inline">{isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
                        </button>
                    </div>
                </header>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-3xl mx-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-40">
                                <RefreshCw size={28} className="animate-spin text-slate-300 dark:text-slate-600" />
                            </div>
                        ) : (
                            <div className="space-y-5 pb-8">

                                {/* ── Bot identity ── */}
                                <Section
                                    icon={<Bot size={16} />}
                                    title="Nhận diện chatbot"
                                    subtitle="Tên hiển thị với người dùng">
                                    <div className="flex items-center gap-4">
                                        {/* Bot avatar preview */}
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                                            <Bot size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                                Tên chatbot
                                            </label>
                                            <input
                                                value={form.bot_name}
                                                onChange={e => handleChange('bot_name', e.target.value)}
                                                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all placeholder:text-slate-400"
                                                placeholder="VD: Trợ lý ĐH Đồng Tháp"
                                            />
                                        </div>
                                    </div>
                                </Section>

                                {/* ── System prompt ── */}
                                <Section
                                    icon={<FileText size={16} />}
                                    title="System Prompt"
                                    subtitle="Định hướng hành vi của bot trước mỗi cuộc trò chuyện">
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <textarea
                                                value={form.system_prompt}
                                                onChange={e => handleChange('system_prompt', e.target.value)}
                                                rows={12}
                                                className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 resize-none font-mono leading-relaxed transition-all placeholder:text-slate-400"
                                                placeholder="Nhập system prompt..."
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                                <Info size={11} />
                                                Gửi đến AI trước mỗi cuộc hội thoại
                                            </p>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${form.system_prompt.length > 3000 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {form.system_prompt.length.toLocaleString()} ký tự
                                            </span>
                                        </div>
                                    </div>
                                </Section>

                                {/* ── Model params ── */}
                                <Section
                                    icon={<Zap size={16} />}
                                    title="Tham số Model"
                                    subtitle="Điều chỉnh độ sáng tạo và giới hạn phản hồi">
                                    <div className="space-y-7">

                                        {/* Temperature */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Temperature</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kiểm soát mức độ ngẫu nhiên của câu trả lời</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tInfo.bg} ${tInfo.color}`}>
                                                        {tInfo.label}
                                                    </span>
                                                    <span className="text-base font-bold text-slate-800 dark:text-slate-100 min-w-[3rem] text-right">
                                                        {form.temperature.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Custom slider track */}
                                            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-700 mb-2">
                                                <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                                                    style={{ width: `${tempPct}%`, background: tempBarColor(form.temperature) }} />
                                                <input
                                                    type="range" min="0" max="2" step="0.05" value={form.temperature}
                                                    onChange={e => handleChange('temperature', parseFloat(e.target.value))}
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                                                />
                                                {/* Thumb dot */}
                                                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-md pointer-events-none transition-all"
                                                    style={{ left: `calc(${tempPct}% - 8px)`, background: tempBarColor(form.temperature) }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
                                                <span>0 · Chính xác</span>
                                                <span>1 · Cân bằng</span>
                                                <span>2 · Sáng tạo</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-slate-700/60" />

                                        {/* Max Tokens */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Max Tokens</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Số token tối đa trong một phản hồi</p>
                                                </div>
                                                <span className="text-base font-bold text-slate-800 dark:text-slate-100 min-w-[3.5rem] text-right">
                                                    {form.max_tokens.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-700 mb-2">
                                                <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all"
                                                    style={{ width: `${tokenPct}%` }} />
                                                <input
                                                    type="range" min="128" max="4096" step="128" value={form.max_tokens}
                                                    onChange={e => handleChange('max_tokens', parseInt(e.target.value))}
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                                                />
                                                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-md bg-indigo-500 pointer-events-none transition-all"
                                                    style={{ left: `calc(${tokenPct}% - 8px)` }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
                                                <span>128</span><span>2,048</span><span>4,096</span>
                                            </div>
                                        </div>
                                    </div>
                                </Section>

                                {/* ── Summary card ── */}
                                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-3.5 border-b border-slate-100 dark:border-slate-700/60">
                                        <Layers size={14} className="text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tóm tắt cấu hình hiện tại</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-700/60">
                                        {[
                                            { label: 'Tên bot', value: form.bot_name || '—' },
                                            { label: 'Temperature', value: form.temperature.toFixed(2) },
                                            { label: 'Max Tokens', value: form.max_tokens.toLocaleString() },
                                            { label: 'Độ dài prompt', value: `${form.system_prompt.length} ký tự` },
                                        ].map(item => (
                                            <div key={item.label} className="px-5 py-4">
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{item.label}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Last updated + actions ── */}
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    {settings && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                            <Clock size={12} />
                                            Lưu lần cuối: {new Date(settings.updated_at).toLocaleString('vi-VN')}
                                        </p>
                                    )}
                                    <div className="flex gap-2 ml-auto">
                                        <button onClick={() => setConfirmReset(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <RotateCcw size={14} /> Reset mặc định
                                        </button>
                                        <button onClick={handleSave} disabled={isSaving || !isDirty}
                                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-indigo-500/20 transition-all active:scale-95">
                                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}