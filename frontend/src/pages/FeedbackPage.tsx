import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    ThumbsUp, ThumbsDown, RefreshCw, Search, Menu, LogOut,
    X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    MessageSquare, Bot, User, Filter, CheckCircle, XCircle, Info,
    Trash2, AlertTriangle
} from 'lucide-react';

interface FeedbackItem {
    id: number;
    message_id: number | null;
    rating: 'up' | 'down';
    comment: string | null;
    created_at: string;
    question: string | null;
    answer: string | null;
    session_title: string | null;
}
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

const API = 'http://127.0.0.1:8000';

export default function FeedbackPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const { setIsMobileMenuOpen } = useOutletContext<any>();

    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState<'all' | 'up' | 'down'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [previewItem, setPreviewItem] = useState<FeedbackItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmDeleteBulk, setConfirmDeleteBulk] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => { if (!token) navigate('/login'); }, [token]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = filterRating !== 'all' ? `?rating=${filterRating}` : '';
            const res = await fetch(`${API}/feedback${params}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Không thể tải feedback');
            setItems(await res.json());
            setSelectedIds([]);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsLoading(false); }
    }, [token, filterRating]);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterRating]);

    const handleDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            const res = await fetch(`${API}/feedback/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Xóa thất bại');
            setItems(prev => prev.filter(i => i.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
            if (previewItem?.id === id) setPreviewItem(null);
            addToast('Đã xóa phản hồi', 'info');
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsDeleting(false); setConfirmDeleteId(null); }
    };

    const handleDeleteBulk = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`${API}/feedback`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(selectedIds),
            });
            if (!res.ok) throw new Error('Xóa thất bại');
            const data = await res.json();
            setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
            addToast(`Đã xóa ${data.deleted} phản hồi`, 'info');
            setSelectedIds([]);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsDeleting(false); setConfirmDeleteBulk(false); }
    };

    const filtered = items.filter(item =>
        (item.question || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.answer || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const current = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const isAllSelected = current.length > 0 && current.every(i => selectedIds.includes(i.id));

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ids = current.map(i => i.id);
        if (e.target.checked) setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        else setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    };

    const thumbsUp = items.filter(i => i.rating === 'up').length;
    const thumbsDown = items.filter(i => i.rating === 'down').length;
    const total = items.length || 1;

    return (
        <>
            {/* Toasts */}
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

            {/* Confirm xóa đơn */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 rounded-xl"><AlertTriangle size={22} className="text-red-600" /></div>
                                <h3 className="font-bold text-slate-800">Xóa phản hồi này?</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Hành động này không thể hoàn tác.</p>
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
                                <h3 className="font-bold text-slate-800">Xóa {selectedIds.length} phản hồi?</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Hành động này không thể hoàn tác.</p>
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
                {previewItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-2">
                                    {previewItem.rating === 'up'
                                        ? <ThumbsUp size={18} className="text-green-500" />
                                        : <ThumbsDown size={18} className="text-red-500" />}
                                    <h3 className="font-bold text-slate-800 text-sm">Chi tiết phản hồi</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => { setConfirmDeleteId(previewItem.id); setPreviewItem(null); }}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Xóa phản hồi này">
                                        <Trash2 size={16} />
                                    </button>
                                    <button onClick={() => setPreviewItem(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {previewItem.question && (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0"><User size={14} className="text-white" /></div>
                                        <div className="bg-blue-50 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                                            <p className="text-sm text-slate-700">{previewItem.question}</p>
                                        </div>
                                    </div>
                                )}
                                {previewItem.answer && (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0"><Bot size={14} className="text-indigo-600" /></div>
                                        <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{previewItem.answer}</p>
                                        </div>
                                    </div>
                                )}
                                <div className={`flex items-center gap-2 p-3 rounded-xl border ${previewItem.rating === 'up' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    {previewItem.rating === 'up' ? <ThumbsUp size={16} className="text-green-600" /> : <ThumbsDown size={16} className="text-red-600" />}
                                    <span className={`text-sm font-semibold ${previewItem.rating === 'up' ? 'text-green-700' : 'text-red-700'}`}>
                                        {previewItem.rating === 'up' ? 'Hữu ích' : 'Không hữu ích'}
                                    </span>
                                    {previewItem.comment && <span className="text-sm text-slate-600 ml-2">— {previewItem.comment}</span>}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                        <h2 className="text-lg font-bold text-slate-800 hidden lg:block">Phản hồi người dùng</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchFeedback} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 hover:text-red-500 font-semibold">Đăng xuất <LogOut size={16} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500"><MessageSquare size={20} /></div>
                                <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Tổng phản hồi</p><p className="text-2xl font-bold text-slate-800">{items.length}</p></div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-green-50 text-green-600"><ThumbsUp size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Hữu ích 👍</p>
                                    <p className="text-2xl font-bold text-green-700">{thumbsUp} <span className="text-sm font-normal text-slate-400">({Math.round(thumbsUp / total * 100)}%)</span></p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><ThumbsDown size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Không hữu ích 👎</p>
                                    <p className="text-2xl font-bold text-red-700">{thumbsDown} <span className="text-sm font-normal text-slate-400">({Math.round(thumbsDown / total * 100)}%)</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(['all', 'up', 'down'] as const).map(r => (
                                        <button key={r} onClick={() => setFilterRating(r)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                                            ${filterRating === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                            {r === 'all' ? <Filter size={12} /> : r === 'up' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                                            {r === 'all' ? 'Tất cả' : r === 'up' ? 'Hữu ích' : 'Không hữu ích'}
                                        </button>
                                    ))}
                                    <AnimatePresence>
                                        {selectedIds.length > 0 && (
                                            <motion.button initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                                onClick={() => setConfirmDeleteBulk(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-bold rounded-lg">
                                                <Trash2 size={13} /> Xóa ({selectedIds.length})
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Tìm câu hỏi..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white font-medium" />
                                </div>
                            </div>

                            {/* Header row */}
                            {!isLoading && current.length > 0 && (
                                <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                    <div className="w-8 flex justify-center">
                                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                    </div>
                                    <span className="w-10">Loại</span>
                                    <span className="flex-1">Nội dung</span>
                                    <span className="hidden md:block w-36 text-right">Thời gian</span>
                                    <span className="w-10 text-center">Xóa</span>
                                </div>
                            )}

                            <div className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <RefreshCw size={28} className="animate-spin opacity-40 mb-3" />
                                        <p className="text-sm">Đang tải...</p>
                                    </div>
                                ) : current.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <ThumbsUp size={48} className="opacity-20 mb-3" />
                                        <p className="text-sm font-medium">Chưa có phản hồi nào</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {current.map((item, idx) => (
                                            <motion.div key={item.id}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className={`flex items-center gap-3 px-4 py-3 group transition-colors
                                                    ${selectedIds.includes(item.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>

                                                {/* Checkbox */}
                                                <div className="w-8 flex justify-center shrink-0" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => setSelectedIds(prev =>
                                                            prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                                                        )}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                </div>

                                                {/* Icon */}
                                                <div className="w-10 shrink-0">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.rating === 'up' ? 'bg-green-50' : 'bg-red-50'}`}>
                                                        {item.rating === 'up'
                                                            ? <ThumbsUp size={14} className="text-green-500" />
                                                            : <ThumbsDown size={14} className="text-red-500" />}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewItem(item)}>
                                                    <p className="text-sm font-semibold text-slate-700 truncate">
                                                        {item.question || 'Không có câu hỏi'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                                        {item.answer ? item.answer.slice(0, 90) + '...' : 'N/A'}
                                                    </p>
                                                    {item.comment && (
                                                        <p className="text-xs text-slate-500 italic mt-0.5">"{item.comment}"</p>
                                                    )}
                                                </div>

                                                {/* Time */}
                                                <div className="hidden md:block w-36 shrink-0 text-right">
                                                    <p className="text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString('vi-VN')}</p>
                                                    {item.session_title && <p className="text-[10px] text-slate-300 truncate mt-0.5">{item.session_title}</p>}
                                                </div>

                                                {/* Delete btn — hiện khi hover */}
                                                <div className="w-10 flex justify-center shrink-0">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                                                        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Xóa">
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
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronsLeft size={16} /></button>
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                                    <span className="text-xs text-slate-500 px-2">Trang {currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16} /></button>
                                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronsRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}