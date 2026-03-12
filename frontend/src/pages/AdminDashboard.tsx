import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    MessageSquare, Trash2, RefreshCw, Search, Menu, LogOut,
    X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Bot, User, Clock, Hash, AlertTriangle, XCircle,
    CheckCircle, Info, MessagesSquare, Users, Eye
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

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
    const [pageInput, setPageInput] = useState('1');
    const itemsPerPage = 10;

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
            const res = await fetch('http://127.0.0.1:8000/history/admin/sessions?limit=200', {
                headers: { Authorization: `Bearer ${token}` },
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
    useEffect(() => { setCurrentPage(1); setPageInput('1'); }, [searchTerm]);
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);

    const openPreview = async (session: ChatSession) => {
        setPreviewSession(session);
        setMessages([]);
        setIsLoadingMessages(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/history/admin/sessions/${session.id}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
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
            const res = await fetch(`http://127.0.0.1:8000/history/admin/sessions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || `Lỗi ${res.status}`);
            }
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
                const res = await fetch(`http://127.0.0.1:8000/history/admin/sessions/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
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
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentSessions = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const isAllSelected = currentSessions.length > 0 && currentSessions.every(s => selectedIds.includes(s.id));

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ids = currentSessions.map(s => s.id);
        if (e.target.checked) setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        else setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    };

    const uniqueUsers = new Set(sessions.map(s => s.user_id).filter(Boolean)).size;
    const totalMessages = sessions.reduce((sum, s) => sum + s.message_count, 0);

    if (!token) return null;

    return (
        <>
            {/* Toasts */}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[280px] bg-white/95 backdrop-blur-md text-sm font-medium
                            ${t.type === 'success' ? 'border-green-200 text-green-700' : t.type === 'error' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'}`}>
                            {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirm xóa đơn */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 rounded-xl"><AlertTriangle size={22} className="text-red-600" /></div>
                                <h3 className="font-bold text-slate-800 text-lg">Xóa phiên chat?</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Toàn bộ tin nhắn trong phiên này sẽ bị xóa vĩnh viễn.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                                <button onClick={() => handleDelete(confirmDeleteId)} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 flex items-center gap-2">
                                    {isDeleting && <RefreshCw size={14} className="animate-spin" />} Xóa
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirm xóa bulk */}
            <AnimatePresence>
                {confirmDeleteBulk && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 rounded-xl"><AlertTriangle size={22} className="text-red-600" /></div>
                                <h3 className="font-bold text-slate-800 text-lg">Xóa {selectedIds.length} phiên?</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Toàn bộ tin nhắn trong các phiên đã chọn sẽ bị xóa vĩnh viễn.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteBulk(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                                <button onClick={handleDeleteBulk} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 flex items-center gap-2">
                                    {isDeleting && <RefreshCw size={14} className="animate-spin" />} Xóa tất cả
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview modal */}
            <AnimatePresence>
                {previewSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }}
                            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0 rounded-t-2xl">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm truncate max-w-sm">{previewSession.title}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                        <User size={11} /> {previewSession.username || 'Ẩn danh'}
                                        <span>·</span>
                                        <Clock size={11} /> {new Date(previewSession.created_at).toLocaleString('vi-VN')}
                                        <span>·</span>
                                        <Hash size={11} /> {previewSession.message_count} tin nhắn
                                    </p>
                                </div>
                                <button onClick={() => setPreviewSession(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors ml-4">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {isLoadingMessages ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                                        <RefreshCw size={26} className="animate-spin opacity-40" />
                                        <p className="text-sm">Đang tải tin nhắn...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                                        <MessageSquare size={36} className="opacity-20" />
                                        <p className="text-sm">Phiên chat này chưa có tin nhắn</p>
                                    </div>
                                ) : (
                                    messages.map(msg => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-indigo-100'}`}>
                                                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-indigo-600" />}
                                            </div>
                                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                                ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-700 rounded-tl-sm'}`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
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

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 sticky top-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                        <h2 className="text-lg font-bold text-slate-800 hidden lg:block">Quản lý Chatbot</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchSessions} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Làm mới">
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 hover:text-red-500 font-semibold">
                            Đăng xuất <LogOut size={16} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Tổng phiên chat', value: sessions.length, icon: <MessagesSquare size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Người dùng', value: uniqueUsers, icon: <Users size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
                                { label: 'Tổng tin nhắn', value: totalMessages, icon: <MessageSquare size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
                            ].map(({ label, value, icon, color, bg }) => (
                                <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${bg} ${color}`}>{icon}</div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{label}</p>
                                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="font-bold text-slate-800">Lịch sử hội thoại</h3>
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} phiên</span>
                                    <AnimatePresence>
                                        {selectedIds.length > 0 && (
                                            <motion.button initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                                onClick={() => setConfirmDeleteBulk(true)} disabled={isDeleting}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-bold rounded-lg">
                                                <Trash2 size={13} /> Xóa ({selectedIds.length})
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative w-full sm:w-60">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Tìm theo tiêu đề, user..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white font-medium" />
                                </div>
                            </div>

                            {!isLoading && filtered.length > 0 && (
                                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                    <div className="w-8 flex justify-center">
                                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                    </div>
                                    <span className="flex-1">Tiêu đề phiên chat</span>
                                    <span className="hidden sm:block w-32">Người dùng</span>
                                    <span className="hidden md:block w-20 text-center">Tin nhắn</span>
                                    <span className="hidden md:block w-36">Thời gian</span>
                                    <span className="w-20 text-center">Thao tác</span>
                                </div>
                            )}

                            <div className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                        <RefreshCw size={28} className="animate-spin opacity-40" />
                                        <p className="text-sm">Đang tải...</p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                        <MessageSquare size={48} className="opacity-20" />
                                        <p className="text-sm font-medium">{searchTerm ? 'Không tìm thấy phiên chat' : 'Chưa có phiên chat nào'}</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {currentSessions.map((session, idx) => (
                                            <motion.div key={session.id}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group ${selectedIds.includes(session.id) ? 'bg-blue-50/60' : ''}`}>
                                                <div className="w-8 flex justify-center shrink-0">
                                                    <input type="checkbox" checked={selectedIds.includes(session.id)}
                                                        onChange={() => setSelectedIds(prev =>
                                                            prev.includes(session.id) ? prev.filter(i => i !== session.id) : [...prev, session.id]
                                                        )}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                </div>
                                                <div className="flex-1 flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                                        <Bot size={15} className="text-indigo-500" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-700 truncate">{session.title}</p>
                                                </div>
                                                <div className="hidden sm:flex items-center gap-1.5 w-32 shrink-0 text-xs text-slate-500">
                                                    <User size={12} className="shrink-0 text-slate-400" />
                                                    <span className="truncate">{session.username || 'Ẩn danh'}</span>
                                                </div>
                                                <div className="hidden md:flex items-center justify-center w-20 shrink-0">
                                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Hash size={10} />{session.message_count}
                                                    </span>
                                                </div>
                                                <div className="hidden md:flex items-center gap-1.5 w-36 shrink-0 text-xs text-slate-400">
                                                    <Clock size={12} className="shrink-0" />
                                                    <span className="truncate">{new Date(session.created_at).toLocaleString('vi-VN')}</span>
                                                </div>
                                                <div className="w-20 flex justify-center gap-1 shrink-0">
                                                    <button onClick={() => openPreview(session)}
                                                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Xem hội thoại">
                                                        <Eye size={15} />
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(session.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Xóa phiên chat">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>

                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 flex justify-center items-center gap-2">
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronsLeft size={16} /></button>
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
                                        <span className="text-xs text-slate-500">Trang</span>
                                        <input type="number" min={1} max={totalPages} value={pageInput}
                                            onChange={e => setPageInput(e.target.value)}
                                            onBlur={() => { const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p); else setPageInput(currentPage.toString()); }}
                                            onKeyDown={e => { if (e.key === 'Enter') { const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p); } }}
                                            className="w-10 text-center bg-slate-50 border rounded text-sm font-bold h-7" />
                                        <span className="text-xs text-slate-500">/ {totalPages}</span>
                                    </div>
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16} /></button>
                                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronsRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}