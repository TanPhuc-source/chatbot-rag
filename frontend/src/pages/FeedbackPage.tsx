import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    ThumbsUp, ThumbsDown, RefreshCw, Search, Menu, LogOut,
    X, ChevronLeft, ChevronRight,
    MessageSquare, Bot, User, Filter, CheckCircle, XCircle, Info,
    Trash2, AlertTriangle, BookOpen, Sparkles, Layers
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

interface NoFeedbackItem {
    message_id: number;
    question: string;
    answer: string;
    session_title: string | null;
    created_at: string;
}
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

const API = 'http://127.0.0.1:8000';

const CATEGORY_COLORS = [
    { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { dot: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30' },
    { dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
];
function getCatColor(cat: string, allCats: string[]) {
    let idx = allCats.indexOf(cat);
    if (idx === -1) idx = cat.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return CATEGORY_COLORS[Math.abs(idx) % CATEGORY_COLORS.length];
}

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

    // Tab state
    const [activeTab, setActiveTab] = useState<'rated' | 'no-feedback'>('rated');

    // No-feedback tab data
    const [noFbItems, setNoFbItems] = useState<NoFeedbackItem[]>([]);
    const [isLoadingNoFb, setIsLoadingNoFb] = useState(false);
    const [noFbPage, setNoFbPage] = useState(1);

    // FAQ modal state
    const [faqModal, setFaqModal] = useState<{ question: string; answer: string } | null>(null);
    const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '' });
    const [isSavingFaq, setIsSavingFaq] = useState(false);
    const [faqCategories, setFaqCategories] = useState<string[]>([]);
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [newCatInput, setNewCatInput] = useState('');
    const catDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node))
                setShowCatDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    const fetchNoFeedback = useCallback(async () => {
        setIsLoadingNoFb(true);
        try {
            const res = await fetch(`${API}/analytics/no-feedback?limit=100&days=30`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Không thể tải dữ liệu');
            setNoFbItems(await res.json());
            setNoFbPage(1);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsLoadingNoFb(false); }
    }, [token, addToast]);

    // Fetch khi chuyển tab hoặc lần đầu load (để badge count đúng ngay)
    useEffect(() => {
        if (activeTab === 'no-feedback') fetchNoFeedback();
    }, [activeTab, fetchNoFeedback]);

    useEffect(() => {
        fetchNoFeedback();
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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

    const openFaqModal = async (item: FeedbackItem) => {
        setFaqForm({
            question: item.question || '',
            answer: item.answer || '',
            category: '',
        });
        setNewCatInput('');
        setShowCatDropdown(false);
        setFaqModal({ question: item.question || '', answer: item.answer || '' });
        // Fetch existing categories from FAQ list
        try {
            const res = await fetch(`${API}/faq/admin`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const cats = Array.from(new Set(data.map((f: any) => f.category).filter(Boolean) as string[])).sort() as string[];
                setFaqCategories(cats);
            }
        } catch { /* categories are optional */ }
    };

    const handleCreateFaq = async () => {
        if (!faqForm.question.trim()) { addToast('Câu hỏi không được để trống', 'error'); return; }
        if (!faqForm.answer.trim()) { addToast('Câu trả lời không được để trống', 'error'); return; }
        setIsSavingFaq(true);
        try {
            const res = await fetch(`${API}/faq/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    question: faqForm.question.trim(),
                    answer: faqForm.answer.trim(),
                    category: faqForm.category.trim() || null,
                    is_active: true,
                }),
            });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Lỗi tạo FAQ'); }
            addToast('Đã thêm vào danh sách FAQ thành công', 'success');
            setFaqModal(null);
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsSavingFaq(false); }
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

    // No-feedback pagination
    const noFbFiltered = noFbItems.filter(i =>
        i.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const noFbTotalPages = Math.max(1, Math.ceil(noFbFiltered.length / itemsPerPage));
    const noFbCurrent = noFbFiltered.slice((noFbPage - 1) * itemsPerPage, noFbPage * itemsPerPage);

    const renderNoFbPages = () => {
        const pages: (number | '...')[] = [];
        if (noFbTotalPages <= 7) { for (let i = 1; i <= noFbTotalPages; i++) pages.push(i); }
        else {
            pages.push(1);
            if (noFbPage > 3) pages.push('...');
            for (let i = Math.max(2, noFbPage - 1); i <= Math.min(noFbTotalPages - 1, noFbPage + 1); i++) pages.push(i);
            if (noFbPage < noFbTotalPages - 2) pages.push('...');
            pages.push(noFbTotalPages);
        }
        return pages;
    };

    return (
        <>
            {/* Toasts */}
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

            {/* Confirm xóa đơn */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl transition-colors"><AlertTriangle size={22} className="text-red-600 dark:text-red-400" /></div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Xóa phản hồi này?</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Hành động này không thể hoàn tác.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Hủy</button>
                                <button onClick={() => handleDelete(confirmDeleteId)} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 flex items-center gap-2 transition-all active:scale-95">
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
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl transition-colors"><AlertTriangle size={22} className="text-red-600 dark:text-red-400" /></div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Xóa {selectedIds.length} phản hồi?</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Hành động này không thể hoàn tác.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteBulk(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Hủy</button>
                                <button onClick={handleDeleteBulk} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 flex items-center gap-2 transition-all active:scale-95">
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
                            className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] transition-colors">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0 transition-colors">
                                <div className="flex items-center gap-2">
                                    {previewItem.rating === 'up'
                                        ? <ThumbsUp size={18} className="text-green-500 dark:text-green-400" />
                                        : <ThumbsDown size={18} className="text-red-500 dark:text-red-400" />}
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Chi tiết phản hồi</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    {previewItem.question && (
                                        <button onClick={() => { openFaqModal(previewItem); setPreviewItem(null); }}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                                            title="Tạo FAQ từ câu hỏi này">
                                            <BookOpen size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => { setConfirmDeleteId(previewItem.id); setPreviewItem(null); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Xóa phản hồi này">
                                        <Trash2 size={16} />
                                    </button>
                                    <button onClick={() => setPreviewItem(null)} className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><X size={18} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {previewItem.question && (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0"><User size={14} className="text-white" /></div>
                                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl rounded-tl-sm px-4 py-3 flex-1 transition-colors">
                                            <p className="text-sm text-slate-700 dark:text-slate-200">{previewItem.question}</p>
                                        </div>
                                    </div>
                                )}
                                {previewItem.answer && (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 transition-colors"><Bot size={14} className="text-indigo-600 dark:text-indigo-400" /></div>
                                        <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex-1 transition-colors">
                                            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{previewItem.answer}</p>
                                        </div>
                                    </div>
                                )}
                                <div className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${previewItem.rating === 'up' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                                    {previewItem.rating === 'up' ? <ThumbsUp size={16} className="text-green-600 dark:text-green-400" /> : <ThumbsDown size={16} className="text-red-600 dark:text-red-400" />}
                                    <span className={`text-sm font-semibold ${previewItem.rating === 'up' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                        {previewItem.rating === 'up' ? 'Hữu ích' : 'Không hữu ích'}
                                    </span>
                                    {previewItem.comment && <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">— {previewItem.comment}</span>}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── FAQ Create Modal ── */}
            <AnimatePresence>
                {faqModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <BookOpen size={17} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Thêm vào FAQ</h3>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Chỉnh sửa nội dung rồi lưu vào danh sách câu hỏi thường gặp</p>
                                    </div>
                                </div>
                                <button onClick={() => setFaqModal(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                                {/* Question */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                        Câu hỏi <span className="text-rose-400">*</span>
                                    </label>
                                    <textarea
                                        value={faqForm.question}
                                        onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 resize-none transition-all placeholder:text-slate-400"
                                        placeholder="Nhập câu hỏi..."
                                    />
                                </div>

                                {/* Answer */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            Câu trả lời <span className="text-rose-400">*</span>
                                        </label>
                                        {faqModal.answer && faqForm.answer !== faqModal.answer && (
                                            <button
                                                onClick={() => setFaqForm(f => ({ ...f, answer: faqModal.answer }))}
                                                className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                                <Sparkles size={11} /> Khôi phục từ bot
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        value={faqForm.answer}
                                        onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))}
                                        rows={6}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 resize-none transition-all placeholder:text-slate-400"
                                        placeholder="Nhập câu trả lời chính xác..."
                                    />
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                                        Bạn có thể chỉnh sửa lại câu trả lời của bot trước khi lưu.
                                    </p>
                                </div>

                                {/* Category dropdown — same as FAQPage */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                        Danh mục <span className="text-slate-300 dark:text-slate-600 font-normal normal-case">(tuỳ chọn)</span>
                                    </label>
                                    <div className="relative" ref={catDropdownRef}>
                                        <button type="button" onClick={() => setShowCatDropdown(p => !p)}
                                            className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-left flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all">
                                            {faqForm.category ? (
                                                <span className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getCatColor(faqForm.category, faqCategories).dot}`} />
                                                    <span className="text-slate-700 dark:text-slate-200">{faqForm.category}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500">Chọn hoặc tạo danh mục...</span>
                                            )}
                                            <ChevronRight size={15} className={`text-slate-400 transition-transform duration-200 ${showCatDropdown ? 'rotate-90' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showCatDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                                    transition={{ duration: 0.13 }}
                                                    className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-30 overflow-hidden">

                                                    {/* Tạo danh mục mới */}
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tạo danh mục mới</p>
                                                        <div className="flex gap-2">
                                                            <input
                                                                value={newCatInput}
                                                                onChange={e => setNewCatInput(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' && newCatInput.trim()) {
                                                                        const cat = newCatInput.trim();
                                                                        setFaqForm(f => ({ ...f, category: cat }));
                                                                        if (!faqCategories.includes(cat)) setFaqCategories(p => [...p, cat].sort());
                                                                        setNewCatInput('');
                                                                        setShowCatDropdown(false);
                                                                    }
                                                                }}
                                                                className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
                                                                placeholder="Tên danh mục mới..." />
                                                            <button
                                                                onClick={() => {
                                                                    if (newCatInput.trim()) {
                                                                        const cat = newCatInput.trim();
                                                                        setFaqForm(f => ({ ...f, category: cat }));
                                                                        if (!faqCategories.includes(cat)) setFaqCategories(p => [...p, cat].sort());
                                                                        setNewCatInput('');
                                                                        setShowCatDropdown(false);
                                                                    }
                                                                }}
                                                                className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap">
                                                                + Tạo
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Không có danh mục */}
                                                    <button onClick={() => { setFaqForm(f => ({ ...f, category: '' })); setShowCatDropdown(false); }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${!faqForm.category ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium'}`}>
                                                        <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        </span>
                                                        Không có danh mục
                                                    </button>

                                                    {/* Danh sách hiện có */}
                                                    {faqCategories.length > 0 && (
                                                        <>
                                                            <div className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-700">
                                                                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-widest">Hiện có</p>
                                                            </div>
                                                            <div className="max-h-44 overflow-y-auto pb-2">
                                                                {faqCategories.map(cat => {
                                                                    const color = getCatColor(cat, faqCategories);
                                                                    return (
                                                                        <button key={cat}
                                                                            onClick={() => { setFaqForm(f => ({ ...f, category: cat })); setShowCatDropdown(false); }}
                                                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${faqForm.category === cat ? 'bg-indigo-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                                            <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                                                                            <span className={`font-semibold flex-1 ${faqForm.category === cat ? 'text-indigo-700 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{cat}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                                <button onClick={() => setFaqModal(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleCreateFaq} disabled={isSavingFaq}
                                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 disabled:opacity-70 transition-all active:scale-95">
                                    {isSavingFaq ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                                    Lưu vào FAQ
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
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden lg:block">Phản hồi người dùng</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={activeTab === 'rated' ? fetchFeedback : fetchNoFeedback}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <RefreshCw size={18} className={(isLoading || isLoadingNoFb) ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-semibold transition-colors">Đăng xuất <LogOut size={16} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-5xl mx-auto space-y-5">

                        {/* ── Tab switcher ── */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl p-1 w-fit">
                            {([
                                { key: 'rated', label: 'Đã đánh giá', count: items.length },
                                { key: 'no-feedback', label: 'Chưa đánh giá', count: noFbItems.length },
                            ] as const).map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    {tab.label}
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {activeTab === 'rated' && (<>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4 transition-colors">
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"><MessageSquare size={20} /></div>
                                <div><p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Tổng phản hồi</p><p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{items.length}</p></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4 transition-colors">
                                <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"><ThumbsUp size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Hữu ích 👍</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{thumbsUp} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">({Math.round(thumbsUp / total * 100)}%)</span></p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4 transition-colors">
                                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"><ThumbsDown size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Không hữu ích 👎</p>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{thumbsDown} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">({Math.round(thumbsDown / total * 100)}%)</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center transition-colors">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(['all', 'up', 'down'] as const).map(r => (
                                        <button key={r} onClick={() => setFilterRating(r)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                                            ${filterRating === r ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                            {r === 'all' ? <Filter size={12} /> : r === 'up' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                                            {r === 'all' ? 'Tất cả' : r === 'up' ? 'Hữu ích' : 'Không hữu ích'}
                                        </button>
                                    ))}
                                    <AnimatePresence>
                                        {selectedIds.length > 0 && (
                                            <motion.button initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                                onClick={() => setConfirmDeleteBulk(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold rounded-lg transition-colors">
                                                <Trash2 size={13} /> Xóa ({selectedIds.length})
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input type="text" placeholder="Tìm câu hỏi..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium transition-colors" />
                                </div>
                            </div>

                            {/* Header row */}
                            {!isLoading && current.length > 0 && (
                                <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">
                                    <div className="w-8 flex justify-center">
                                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 cursor-pointer" />
                                    </div>
                                    <span className="w-10">Loại</span>
                                    <span className="flex-1">Nội dung</span>
                                    <span className="hidden md:block w-36 text-right">Thời gian</span>
                                    <span className="w-20 text-center">Thao tác</span>
                                </div>
                            )}

                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                                        <RefreshCw size={28} className="animate-spin opacity-40 mb-3" />
                                        <p className="text-sm">Đang tải...</p>
                                    </div>
                                ) : current.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                                        <ThumbsUp size={48} className="opacity-20 mb-3" />
                                        <p className="text-sm font-medium">Chưa có phản hồi nào</p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentPage}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.15 }}>
                                        {current.map((item) => (
                                            <div key={item.id}
                                                className={`flex items-center gap-3 px-4 py-3 group transition-colors border-b border-slate-50 dark:border-slate-700/40 last:border-none
                                                    ${selectedIds.includes(item.id) ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>

                                                {/* Checkbox */}
                                                <div className="w-8 flex justify-center shrink-0" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => setSelectedIds(prev =>
                                                            prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                                                        )}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 cursor-pointer" />
                                                </div>

                                                {/* Icon */}
                                                <div className="w-10 shrink-0">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${item.rating === 'up' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                                        {item.rating === 'up'
                                                            ? <ThumbsUp size={14} className="text-green-500 dark:text-green-400" />
                                                            : <ThumbsDown size={14} className="text-red-500 dark:text-red-400" />}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewItem(item)}>
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                        {item.question || 'Không có câu hỏi'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                                        {item.answer ? item.answer.slice(0, 90) + '...' : 'N/A'}
                                                    </p>
                                                    {item.comment && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">"{item.comment}"</p>
                                                    )}
                                                </div>

                                                {/* Time */}
                                                <div className="hidden md:block w-36 shrink-0 text-right">
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{new Date(item.created_at).toLocaleString('vi-VN')}</p>
                                                    {item.session_title && <p className="text-[10px] text-slate-300 dark:text-slate-600 truncate mt-0.5">{item.session_title}</p>}
                                                </div>

                                                {/* Actions */}
                                                <div className="w-24 flex justify-end items-center gap-1.5 shrink-0">
                                                    {item.question && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); openFaqModal(item); }}
                                                            className="p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-all"
                                                            title="Tạo FAQ từ câu hỏi này">
                                                            <BookOpen size={15} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                                                        className="p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                                                        title="Xóa">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>

                            {!isLoading && filtered.length > 0 && (
                                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 transition-colors">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Hiển thị <span className="font-semibold text-slate-600 dark:text-slate-300">
                                            {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)}
                                        </span> / <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> phản hồi
                                    </p>
                                    {totalPages > 1 && (
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
                                    )}
                                </div>
                            )}
                        </div>
                        </>)}

                        {/* ── No-feedback tab ── */}
                        {activeTab === 'no-feedback' && (
                            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                                {/* Toolbar */}
                                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Câu hỏi chưa đánh giá</h3>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium">
                                            {noFbFiltered.length} câu
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text" placeholder="Tìm câu hỏi..." value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all w-52" />
                                    </div>
                                </div>

                                {/* Table head */}
                                {!isLoadingNoFb && noFbFiltered.length > 0 && (
                                    <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/70 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700/60">
                                        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Câu hỏi</span>
                                        <span className="hidden lg:block w-36 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Thời gian</span>
                                        <span className="w-20 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-right">Hành động</span>
                                    </div>
                                )}

                                {/* Rows */}
                                <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
                                    {isLoadingNoFb ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <RefreshCw size={24} className="animate-spin text-slate-300 dark:text-slate-600" />
                                            <p className="text-sm text-slate-400 dark:text-slate-500">Đang tải...</p>
                                        </div>
                                    ) : noFbFiltered.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 dark:text-slate-500">
                                            <CheckCircle size={32} className="opacity-20" />
                                            <p className="text-sm">Tất cả câu hỏi đã được đánh giá!</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode="wait">
                                            <motion.div key={noFbPage}
                                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
                                                {noFbCurrent.map(item => (
                                                    <div key={item.message_id}
                                                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group border-b border-slate-50 dark:border-slate-700/40 last:border-none">
                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.question}</p>
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                                                {item.answer.slice(0, 100)}{item.answer.length > 100 ? '...' : ''}
                                                            </p>
                                                        </div>
                                                        {/* Time */}
                                                        <div className="hidden lg:block w-36 shrink-0 text-right">
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                {new Date(item.created_at).toLocaleString('vi-VN')}
                                                            </p>
                                                            {item.session_title && (
                                                                <p className="text-[10px] text-slate-300 dark:text-slate-600 truncate mt-0.5">{item.session_title}</p>
                                                            )}
                                                        </div>
                                                        {/* Action */}
                                                        <div className="w-24 flex justify-end items-center shrink-0">
                                                            <button
                                                                onClick={() => openFaqModal({ id: 0, message_id: item.message_id, rating: 'down', comment: null, created_at: item.created_at, question: item.question, answer: item.answer, session_title: item.session_title })}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
                                                                title="Tạo FAQ từ câu hỏi này">
                                                                <BookOpen size={13} /> Tạo FAQ
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        </AnimatePresence>
                                    )}
                                </div>

                                {/* Pagination */}
                                {!isLoadingNoFb && noFbFiltered.length > 0 && (
                                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700/60">
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            Hiển thị <span className="font-semibold text-slate-600 dark:text-slate-300">
                                                {(noFbPage - 1) * itemsPerPage + 1}–{Math.min(noFbPage * itemsPerPage, noFbFiltered.length)}
                                            </span> / <span className="font-semibold text-slate-600 dark:text-slate-300">{noFbFiltered.length}</span> câu hỏi
                                        </p>
                                        {noFbTotalPages > 1 && (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setNoFbPage(p => Math.max(1, p - 1))} disabled={noFbPage === 1}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                                    <ChevronLeft size={15} />
                                                </button>
                                                {renderNoFbPages().map((p, i) =>
                                                    p === '...' ? (
                                                        <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
                                                    ) : (
                                                        <button key={p} onClick={() => setNoFbPage(p as number)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === noFbPage ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                            {p}
                                                        </button>
                                                    )
                                                )}
                                                <button onClick={() => setNoFbPage(p => Math.min(noFbTotalPages, p + 1))} disabled={noFbPage === noFbTotalPages}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                                    <ChevronRight size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </>
    );
}