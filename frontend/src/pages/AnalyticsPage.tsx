import React, { useState, useEffect, useCallback, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    RefreshCw, Menu, LogOut, Download, MessagesSquare,
    Users, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp,
    CheckCircle, XCircle, Info, TrendingDown, Minus
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

// ─── Donut chart (SVG, no deps) ───────────────────────────────────────────────
function DonutChart({ up, down }: { up: number; down: number }) {
    const total = up + down || 1;
    const pct = Math.round((up / total) * 100);
    const R = 54, C = 72, stroke = 16;
    const circ = 2 * Math.PI * R;
    const upLen = (up / total) * circ;
    const dnLen = (down / total) * circ;
    return (
        <div className="flex flex-col items-center gap-3">
            <svg width="144" height="144" viewBox="0 0 144 144">
                <circle cx={C} cy={C} r={R} fill="none"
                    stroke="currentColor" strokeWidth={stroke}
                    className="text-slate-100 dark:text-slate-700" />
                <circle cx={C} cy={C} r={R} fill="none"
                    stroke="#22c55e" strokeWidth={stroke}
                    strokeDasharray={`${upLen} ${circ - upLen}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${C} ${C})`} />
                {dnLen > 0 && (
                    <circle cx={C} cy={C} r={R} fill="none"
                        stroke="#ef4444" strokeWidth={stroke}
                        strokeDasharray={`${dnLen} ${circ - dnLen}`}
                        strokeDashoffset={-upLen}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${C} ${C})`} />
                )}
                <text x={C} y={C - 8} textAnchor="middle" fontSize="20" fontWeight="500"
                    fill="currentColor" className="text-slate-800 dark:text-slate-100">
                    {pct}%
                </text>
                <text x={C} y={C + 12} textAnchor="middle" fontSize="12"
                    fill="#94a3b8">
                    hữu ích
                </text>
            </svg>
            <div className="flex gap-5">
                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    Hữu ích: <strong className="text-slate-700 dark:text-slate-200">{up}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    Không: <strong className="text-slate-700 dark:text-slate-200">{down}</strong>
                </span>
            </div>
        </div>
    );
}

// ─── Hourly bar chart ─────────────────────────────────────────────────────────
function HourlyBars({ data }: { data: { hour: number; count: number }[] }) {
    // Coerce to number — API may return strings
    const filled = Array.from({ length: 24 }, (_, i) => {
        const found = data.find(d => Number(d.hour) === i);
        return { hour: i, count: found ? Number(found.count) : 0 };
    });
    const max = Math.max(...filled.map(d => d.count), 1);
    const hasData = filled.some(d => d.count > 0);
    const tickHours = [0, 6, 12, 18, 23];

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-[140px] text-slate-400 dark:text-slate-500 gap-2">
                <MessagesSquare size={24} className="opacity-30" />
                <p className="text-xs">Chưa có phiên nào trong 7 ngày qua</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-end gap-[3px] h-[140px]">
                {filled.map(({ hour, count }) => {
                    const h = count === 0 ? 2 : Math.max(Math.round((count / max) * 100), 4);
                    // Minimum opacity 0.15 for zero bars, 0.5–1.0 for non-zero
                    const opacity = count === 0 ? 0.1 : 0.5 + 0.5 * (count / max);
                    return (
                        <div key={hour} title={`${hour}:00 — ${count} phiên`}
                            className="flex-1 flex items-end cursor-default group">
                            <div className="w-full rounded-t-[3px] transition-opacity group-hover:opacity-60"
                                style={{ height: `${h}%`, background: '#6366f1', opacity }} />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between mt-2">
                {tickHours.map(h => (
                    <span key={h} className="text-[11px] text-slate-400 dark:text-slate-500">{h}h</span>
                ))}
            </div>
        </div>
    );
}

// ─── Line chart (Canvas) ──────────────────────────────────────────────────────
function TrendLineChart({ data }: { data: { date: string; thumbs_up: number; thumbs_down: number }[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Wrap draw logic in useCallback so ResizeObserver can reuse it
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;
        const W = canvas.offsetWidth;
        if (W === 0) return; // not laid out yet — rAF will retry
        const H = 140;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);

        const pad = { l: 28, r: 8, t: 10, b: 24 };
        // Coerce to number — API may return strings
        const allVals = data.flatMap(d => [Number(d.thumbs_up), Number(d.thumbs_down)]);
        const vMax = Math.max(...allVals, 1) + 2;

        // Handle single data point (would cause division by zero in xS)
        const xS = (i: number) =>
            data.length === 1
                ? W / 2
                : pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
        const yS = (v: number) => pad.t + (1 - v / vMax) * (H - pad.t - pad.b);

        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        const labelColor = dark ? '#64748b' : '#94a3b8';

        // Grid lines
        [0, Math.round(vMax / 2), vMax].forEach(v => {
            ctx.beginPath();
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 0.5;
            ctx.moveTo(pad.l, yS(v));
            ctx.lineTo(W - pad.r, yS(v));
            ctx.stroke();
        });

        const drawLine = (vals: number[], color: string, fillColor: string) => {
            ctx.beginPath();
            vals.forEach((v, i) => i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v)));
            ctx.lineTo(xS(vals.length - 1), yS(0));
            ctx.lineTo(xS(0), yS(0));
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.beginPath();
            vals.forEach((v, i) => i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v)));
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.stroke();
            vals.forEach((v, i) => {
                ctx.beginPath();
                ctx.arc(xS(i), yS(v), 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            });
        };

        drawLine(data.map(d => Number(d.thumbs_up)), '#22c55e', 'rgba(34,197,94,0.08)');
        drawLine(data.map(d => Number(d.thumbs_down)), '#ef4444', 'rgba(239,68,68,0.08)');

        ctx.fillStyle = labelColor;
        ctx.font = `9px sans-serif`;
        ctx.textAlign = 'center';
        data.forEach((d, i) => {
            if (i % 2 !== 0) return;
            ctx.fillText(d.date.slice(5), xS(i), H - 4);
        });
    }, [data]);

    // rAF ensures canvas offsetWidth is non-zero before drawing
    useEffect(() => {
        const raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [draw]);

    // Re-draw whenever the container changes size (e.g. sidebar collapse)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => requestAnimationFrame(draw));
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [draw]);

    return (
        <div className="relative">
            {data.length <= 1 ? (
                <div className="flex flex-col items-center justify-center h-[140px] text-slate-400 dark:text-slate-500 gap-2">
                    <TrendingUp size={24} className="opacity-30" />
                    <p className="text-xs text-center">
                        {data.length === 0
                            ? 'Chưa có dữ liệu phản hồi trong 14 ngày qua'
                            : `Chỉ có dữ liệu 1 ngày (${data[0]?.date?.slice(5) ?? ''}) — cần thêm dữ liệu để vẽ đường xu hướng`}
                    </p>
                    {data.length === 1 && (
                        <div className="flex gap-4 text-xs mt-1">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                Hữu ích: <strong className="text-slate-600 dark:text-slate-300">{data[0].thumbs_up}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                Không hữu ích: <strong className="text-slate-600 dark:text-slate-300">{data[0].thumbs_down}</strong>
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <canvas ref={canvasRef} style={{ width: '100%', height: '140px', display: 'block' }} />
            )}
            <div className="flex gap-4 mt-2 justify-end">
                {[{ label: 'Hữu ích', color: 'bg-green-500' }, { label: 'Không hữu ích', color: 'bg-red-500' }].map(l => (
                    <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className={`w-2.5 h-1.5 rounded-sm inline-block ${l.color}`} />
                        {l.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Popular Questions Table ──────────────────────────────────────────────────
const ROW_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#64748b'];
const PAGE_SIZE = 5;

function PopularTable({ data }: { data: { question: string; count: number; category?: string; trend?: number }[] }) {
    const [page, setPage] = useState(0);
    const max = data[0]?.count || 1;
    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700/60">
                            <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-3 w-8 pr-3">#</th>
                            <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-3">Câu hỏi</th>
                            <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-3 w-40 px-4">Tần suất</th>
                            <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-3 w-14">Lượt</th>
                            <th className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pb-3 w-16 pl-3">Xu hướng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.map((item, idx) => {
                            const i = page * PAGE_SIZE + idx;
                            const pct = Math.round((item.count / max) * 100);
                            const color = ROW_COLORS[i % ROW_COLORS.length];
                            const trend = item.trend;
                            return (
                                <motion.tr key={i}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td className="py-2.5 pr-3">
                                        <span className={`text-sm font-bold ${i < 3 ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td className="py-2.5">
                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{item.question}</p>
                                        {item.category && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.category}</p>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <div className="h-[6px] bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${pct}%`, background: color }} />
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-right">
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.count}</span>
                                    </td>
                                    <td className="py-2.5 pl-3 text-center">
                                        {trend != null ? (
                                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${trend > 0
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                : trend < 0
                                                    ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                                }`}>
                                                {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                                                {trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : '—'}
                                            </span>
                                        ) : null}
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Hiển thị <span className="font-semibold text-slate-600 dark:text-slate-300">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)}</span> / {data.length} câu hỏi
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                            ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} onClick={() => setPage(i)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${i === page
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}>
                                {i + 1}
                            </button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                            ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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
    }, [token, addToast]);

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
        { label: 'Tổng phiên chat', value: summary.total_sessions.toLocaleString(), icon: <MessagesSquare size={18} />, iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'Tổng tin nhắn', value: summary.total_messages.toLocaleString(), icon: <MessageSquare size={18} />, iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400' },
        { label: 'Người dùng', value: summary.total_users.toLocaleString(), icon: <Users size={18} />, iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400' },
        { label: 'Hôm nay', value: summary.sessions_today, icon: <TrendingUp size={18} />, iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400' },
        { label: '👍 Hữu ích', value: summary.thumbs_up, icon: <ThumbsUp size={18} />, iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: '👎 Không hữu ích', value: summary.thumbs_down, icon: <ThumbsDown size={18} />, iconBg: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-600 dark:text-red-400' },
    ] : [];

    return (
        <>
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

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900 transition-colors">
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Menu size={24} />
                        </button>
                        <div className="hidden lg:block">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Thống kê &amp; Báo cáo</h2>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Dữ liệu hoạt động hệ thống</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExport} disabled={isExporting}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-70 transition-all active:scale-95 shadow-sm shadow-green-500/20">
                            {isExporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                            Export CSV
                        </button>
                        <button onClick={fetchAll}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Làm mới">
                            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors px-2 py-2">
                            <LogOut size={15} />
                            <span className="hidden sm:inline">Đăng xuất</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-5">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-32 text-slate-400 dark:text-slate-500">
                                <RefreshCw size={32} className="animate-spin opacity-40" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {statCards.map(({ label, value, icon, iconBg, iconColor }, i) => (
                                        <motion.div key={label}
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 transition-colors">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconBg} ${iconColor}`}>
                                                {icon}
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide mt-2 leading-tight">{label}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Phân bố theo giờ</h3>
                                            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">7 ngày gần nhất</span>
                                        </div>
                                        <HourlyBars data={hourly} />
                                    </div>

                                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Tỷ lệ phản hồi</h3>
                                        </div>
                                        {summary?.thumbs_up + summary?.thumbs_down > 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                                <DonutChart up={summary.thumbs_up} down={summary.thumbs_down} />
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                    Tỷ lệ có feedback: <span className="font-semibold text-slate-600 dark:text-slate-300">{summary.feedback_rate}%</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                                <ThumbsUp size={28} className="opacity-20" />
                                                <p className="text-xs">Chưa có feedback</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {feedbackTrend.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Xu hướng phản hồi</h3>
                                            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">14 ngày</span>
                                        </div>
                                        <TrendLineChart data={feedbackTrend} />
                                    </div>
                                )}

                                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Câu hỏi phổ biến nhất</h3>
                                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
                                            30 ngày qua
                                        </span>
                                    </div>
                                    {popular.length === 0 ? (
                                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Chưa có dữ liệu</p>
                                    ) : (
                                        <PopularTable data={popular} />
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