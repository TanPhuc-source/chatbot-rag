import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
    RefreshCw, Menu, LogOut, Download, MessagesSquare,
    Users, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp,
    CheckCircle, XCircle, Info
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const API = 'http://127.0.0.1:8000';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const { setIsMobileMenuOpen } = useOutletContext<any>();

    const [summary, setSummary] = useState<any>(null);
    const [popular, setPopular] = useState<any[]>([]);
    const [hourly, setHourly] = useState<any[]>([]);
    const [feedbackTrend, setFeedbackTrend] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => { if (!token) navigate('/login'); }, [token]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [s, p, h, ft] = await Promise.all([
                fetch(`${API}/analytics/summary`, { headers }).then(r => r.json()),
                fetch(`${API}/analytics/popular?limit=10&days=30`, { headers }).then(r => r.json()),
                fetch(`${API}/analytics/hourly?days=7`, { headers }).then(r => r.json()),
                fetch(`${API}/analytics/feedback-trend?days=14`, { headers }).then(r => r.json()),
            ]);
            setSummary(s); setPopular(p); setHourly(h); setFeedbackTrend(ft);
        } catch { addToast('Lỗi tải dữ liệu', 'error'); }
        finally { setIsLoading(false); }
    }, [token]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await fetch(`${API}/analytics/export`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Export thất bại');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_history_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            addToast('Đã xuất file CSV');
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsExporting(false); }
    };

    const statCards = summary ? [
        { label: 'Tổng phiên chat', value: summary.total_sessions, icon: <MessagesSquare size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Tổng tin nhắn', value: summary.total_messages, icon: <MessageSquare size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Người dùng', value: summary.total_users, icon: <Users size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Hôm nay', value: summary.sessions_today, icon: <TrendingUp size={20} />, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: '👍 Hữu ích', value: summary.thumbs_up, icon: <ThumbsUp size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: '👎 Không hữu ích', value: summary.thumbs_down, icon: <ThumbsDown size={20} />, color: 'text-red-600', bg: 'bg-red-50' },
    ] : [];

    const pieData = summary ? [
        { name: 'Hữu ích', value: summary.thumbs_up, color: '#22c55e' },
        { name: 'Không hữu ích', value: summary.thumbs_down, color: '#ef4444' },
    ] : [];

    return (
        <>
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[260px] bg-white/95 text-sm font-medium
                            ${t.type === 'success' ? 'border-green-200 text-green-700' : t.type === 'error' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'}`}>
                            {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                        <h2 className="text-lg font-bold text-slate-800 hidden lg:block">Thống kê & Báo cáo</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExport} disabled={isExporting}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-70">
                            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            Export CSV
                        </button>
                        <button onClick={fetchAll} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 hover:text-red-500 font-semibold">Đăng xuất <LogOut size={16} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-6">

                        {isLoading ? (
                            <div className="flex items-center justify-center py-32 text-slate-400">
                                <RefreshCw size={32} className="animate-spin opacity-40" />
                            </div>
                        ) : (
                            <>
                                {/* Stat cards */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {statCards.map(({ label, value, icon, color, bg }, i) => (
                                        <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                            <div className={`p-2 rounded-xl ${bg} ${color} w-fit mb-2`}>{icon}</div>
                                            <p className="text-2xl font-bold text-slate-800">{value}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{label}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Hourly distribution */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                        <h3 className="font-bold text-slate-800 mb-4 text-sm">Phân bố theo giờ (7 ngày gần nhất)</h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={hourly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={h => `${h}h`} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip formatter={(v) => [v, 'Phiên']} labelFormatter={h => `${h}:00`} />
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Feedback pie */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                        <h3 className="font-bold text-slate-800 mb-4 text-sm">Tỷ lệ phản hồi</h3>
                                        {summary?.thumbs_up + summary?.thumbs_down > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height={160}>
                                                    <PieChart>
                                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                                                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                        </Pie>
                                                        <Tooltip formatter={(v, n) => [v, n]} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="flex justify-center gap-4 mt-2">
                                                    {pieData.map(d => (
                                                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                                                            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                                                            {d.name}: {d.value}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-center text-xs text-slate-400 mt-2">Tỷ lệ có feedback: {summary?.feedback_rate}%</p>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                                <ThumbsUp size={32} className="opacity-20 mb-2" />
                                                <p className="text-xs">Chưa có feedback</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Feedback trend */}
                                {feedbackTrend.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                        <h3 className="font-bold text-slate-800 mb-4 text-sm">Xu hướng phản hồi (14 ngày)</h3>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <LineChart data={feedbackTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="thumbs_up" stroke="#22c55e" strokeWidth={2} dot={false} name="Hữu ích" />
                                                <Line type="monotone" dataKey="thumbs_down" stroke="#ef4444" strokeWidth={2} dot={false} name="Không hữu ích" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Popular questions */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm">Câu hỏi phổ biến nhất (30 ngày)</h3>
                                    {popular.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {popular.map((item, i) => {
                                                const maxCount = popular[0]?.count || 1;
                                                return (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-slate-700 truncate">{item.question}</p>
                                                            <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                                <div className="h-full bg-indigo-500 rounded-full transition-all"
                                                                    style={{ width: `${(item.count / maxCount) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-500 shrink-0">{item.count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}