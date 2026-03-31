import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    MessageSquare, Trash2, RefreshCw, Search, Menu,
    X, ChevronLeft, ChevronRight,
    Bot, User, Clock, Hash, AlertTriangle, XCircle,
    CheckCircle, Info, MessagesSquare, Users, Eye,
    Calendar
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatSession {
    id: number;
    title: string;
    created_at: string;
    user_id: number | null;
    username: string | null;
    message_count: number;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ConfirmModal({
    title, description, confirmLabel, onConfirm, onCancel, loading,
}: {
    title: string; description: string; confirmLabel: string;
    onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 8 }}
                transition={{ duration: 0.16 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                <div className="flex items-start gap-4 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <AlertTriangle size={18} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Hủy
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 flex items-center gap-2 transition-all active:scale-95">
                        {loading && <RefreshCw size={13} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

const PAGE_SIZE = 10;

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }>();

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const [previewSession, setPreviewSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmDeleteBulk, setConfirmDeleteBulk] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => { if (!token) navigate('/login'); }, [token, navigate]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchSessions = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch('/history/admin/sessions?limit=1000', {
                });
            if (!res.ok) throw new Error('Không thể tải danh sách phiên chat');
            setSessions(await res.json());
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [token, addToast]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const openPreview = async (session: ChatSession) => {
        setPreviewSession(session);
        setMessages([]);
        setIsLoadingMessages(true);
        try {
            const res = await fetch(`/history/admin/sessions/${session.id}/messages`, { credentials: 'include' });
            if (!res.ok) throw new Error('Không tải được nội dung');
            setMessages(await res.json());
        } catch (err: any) {
            addToast(err.message, 'error');
            setPreviewSession(null);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/history/admin/sessions/${id}`, { credentials: 'include', method: 'DELETE', });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || `Lỗi ${res.status}`); }
            setSessions(prev => prev.filter(s => s.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
            if (previewSession?.id === id) setPreviewSession(null);
            addToast('Đã xóa phiên chat', 'info');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsDeleting(false);
            setConfirmDeleteId(null);
        }
    };

    const handleDeleteBulk = async () => {
        setIsDeleting(true);
        let ok = 0;
        for (const id of selectedIds) {
            try {
                const res = await fetch(`/history/admin/sessions/${id}`, { credentials: 'include', method: 'DELETE', });
                if (res.ok) ok++;
            } catch { }
        }
        setSessions(prev => prev.filter(s => !selectedIds.includes(s.id)));
        addToast(`Đã xóa ${ok}/${selectedIds.length} phiên chat`, ok === selectedIds.length ? 'info' : 'error');
        setSelectedIds([]);
        setIsDeleting(false);
        setConfirmDeleteBulk(false);
    };

    const filtered = sessions.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const isAllSelected = paginated.length > 0 && paginated.every(s => selectedIds.includes(s.id));

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ids = paginated.map(s => s.id);
        if (e.target.checked) setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        else setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    };

    const uniqueUsers = new Set(sessions.map(s => s.user_id).filter(Boolean)).size;
    const totalMessages = sessions.reduce((sum, s) => sum + s.message_count, 0);

    // Smart pagination
    const renderPages = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
        else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    if (!token) return null;

    return (
        <>
            {/* ── Toasts ── */}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[280px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-sm font-medium
                            ${t.type === 'success' ? 'border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
                                    : t.type === 'error' ? 'border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
                                        : 'border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'}`}>
                            {t.type === 'success' ? <CheckCircle size={15} /> : t.type === 'error' ? <XCircle size={15} /> : <Info size={15} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ── Confirm modals ── */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <ConfirmModal
                        title="Xóa phiên chat?"
                        description="Toàn bộ tin nhắn trong phiên này sẽ bị xóa vĩnh viễn và không thể khôi phục."
                        confirmLabel="Xóa phiên"
                        onConfirm={() => handleDelete(confirmDeleteId)}
                        onCancel={() => setConfirmDeleteId(null)}
                        loading={isDeleting}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {confirmDeleteBulk && (
                    <ConfirmModal
                        title={`Xóa ${selectedIds.length} phiên chat?`}
                        description="Toàn bộ tin nhắn trong các phiên đã chọn sẽ bị xóa vĩnh viễn."
                        confirmLabel="Xóa tất cả"
                        onConfirm={handleDeleteBulk}
                        onCancel={() => setConfirmDeleteBulk(false)}
                        loading={isDeleting}
                    />
                )}
            </AnimatePresence>

            {/* ── Preview modal ── */}
            <AnimatePresence>
                {previewSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

                            {/* Modal header */}
                            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                                <div className="min-w-0 flex-1 pr-4">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug truncate">
                                        {previewSession.title}
                                    </h3>
                                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                            <User size={11} /> {previewSession.username || 'Ẩn danh'}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                            <Calendar size={11} /> {new Date(previewSession.created_at).toLocaleString('vi-VN')}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                            <MessageSquare size={11} /> {previewSession.message_count} tin nhắn
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setPreviewSession(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {isLoadingMessages ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
                                        <RefreshCw size={24} className="animate-spin opacity-40" />
                                        <p className="text-sm">Đang tải tin nhắn...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
                                        <MessageSquare size={32} className="opacity-20" />
                                        <p className="text-sm">Chưa có tin nhắn nào</p>
                                    </div>
                                ) : (
                                    messages.map(msg => (
                                        <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                                                ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                {msg.role === 'user'
                                                    ? <User size={13} className="text-white" />
                                                    : <Bot size={13} className="text-slate-500 dark:text-slate-400" />}
                                            </div>
                                            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                                                ${msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm'}`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900 transition-colors">

                {/* Header */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Menu size={22} />
                        </button>
                        <div className="hidden lg:block">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Quản lý Chatbot</h2>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Lịch sử hội thoại toàn hệ thống</p>
                        </div>
                    </div>
                    <button onClick={fetchSessions}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-5">

                        {/* ── Stat cards ── */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Tổng phiên chat', value: sessions.length.toLocaleString(), icon: <MessagesSquare size={18} />, iconBg: 'bg-indigo-50 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
                                { label: 'Người dùng', value: uniqueUsers.toLocaleString(), icon: <Users size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
                                { label: 'Tổng tin nhắn', value: totalMessages.toLocaleString(), icon: <MessageSquare size={18} />, iconBg: 'bg-violet-50 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
                            ].map(({ label, value, icon, iconBg, iconColor }, i) => (
                                <motion.div key={label}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 transition-colors">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg} ${iconColor}`}>
                                        {icon}
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide mt-2">{label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* ── Session table ── */}
                        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">

                            {/* Table toolbar */}
                            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Lịch sử hội thoại</h3>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium">
                                        {filtered.length} phiên
                                    </span>
                                    <AnimatePresence>
                                        {selectedIds.length > 0 && (
                                            <motion.button
                                                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                                onClick={() => setConfirmDeleteBulk(true)} disabled={isDeleting}
                                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                                                <Trash2 size={12} /> Xóa {selectedIds.length} mục
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text" placeholder="Tìm theo tiêu đề, user..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all w-56" />
                                </div>
                            </div>

                            {/* Table head */}
                            {!isLoading && filtered.length > 0 && (
                                <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/70 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700/60">
                                    <div className="w-5 flex justify-center">
                                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 cursor-pointer accent-indigo-600" />
                                    </div>
                                    <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tiêu đề phiên chat</span>
                                    <span className="hidden sm:block w-28 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Người dùng</span>
                                    <span className="hidden md:block w-20 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-center">Tin nhắn</span>
                                    <span className="hidden lg:block w-36 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Thời gian</span>
                                    <span className="w-20 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-right">Hành động</span>
                                </div>
                            )}

                            {/* Table rows */}
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                                        <RefreshCw size={26} className="animate-spin text-slate-300 dark:text-slate-600" />
                                        <p className="text-sm text-slate-400 dark:text-slate-500">Đang tải dữ liệu...</p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 dark:text-slate-500">
                                        <MessageSquare size={36} className="opacity-20" />
                                        <p className="text-sm">{searchTerm ? 'Không tìm thấy phiên chat' : 'Chưa có phiên chat nào'}</p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentPage}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.15 }}>
                                        {paginated.map((session) => (
                                            <div key={session.id}
                                                className={`flex items-center gap-3 px-5 py-3 transition-colors group border-b border-slate-50 dark:border-slate-700/40 last:border-none
                                                    ${selectedIds.includes(session.id)
                                                        ? 'bg-indigo-50/60 dark:bg-indigo-900/10'
                                                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'}`}>

                                                {/* Checkbox */}
                                                <div className="w-5 flex justify-center shrink-0">
                                                    <input type="checkbox" checked={selectedIds.includes(session.id)}
                                                        onChange={() => setSelectedIds(prev =>
                                                            prev.includes(session.id) ? prev.filter(i => i !== session.id) : [...prev, session.id]
                                                        )}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 cursor-pointer accent-indigo-600" />
                                                </div>

                                                {/* Title */}
                                                <div className="flex-1 flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
                                                        <Bot size={14} className="text-indigo-500 dark:text-indigo-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate leading-snug">
                                                            {session.title}
                                                        </p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 sm:hidden mt-0.5">
                                                            @{session.username || 'Ẩn danh'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* User */}
                                                <div className="hidden sm:flex items-center gap-1.5 w-28 shrink-0">
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center shrink-0">
                                                        <User size={10} className="text-slate-500 dark:text-slate-400" />
                                                    </div>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.username || 'Ẩn danh'}</span>
                                                </div>

                                                {/* Message count */}
                                                <div className="hidden md:flex justify-center w-20 shrink-0">
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                                        <Hash size={9} />{session.message_count}
                                                    </span>
                                                </div>

                                                {/* Time */}
                                                <div className="hidden lg:flex items-center gap-1.5 w-36 shrink-0">
                                                    <Clock size={11} className="text-slate-400 shrink-0" />
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                        {new Date(session.created_at).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="w-20 flex justify-end items-center gap-1.5 shrink-0">
                                                    <button onClick={() => openPreview(session)}
                                                        className="p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-all"
                                                        title="Xem hội thoại">
                                                        <Eye size={15} />
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(session.id)}
                                                        className="p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-all"
                                                        title="Xóa phiên chat">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>

                            {/* ── Pagination ── */}
                            {!isLoading && filtered.length > 0 && (
                                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700/60">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Hiển thị <span className="font-semibold text-slate-600 dark:text-slate-300">
                                            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                                        </span> / <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> phiên
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                            <ChevronLeft size={15} />
                                        </button>
                                        {renderPages().map((p, i) =>
                                            p === '...' ? (
                                                <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
                                            ) : (
                                                <button key={p} onClick={() => setCurrentPage(p as number)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors
                                                        ${p === currentPage ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                    {p}
                                                </button>
                                            )
                                        )}
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                            <ChevronRight size={15} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}