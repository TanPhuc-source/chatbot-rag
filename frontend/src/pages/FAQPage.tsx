import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Plus, Trash2, RefreshCw, Search, Menu, LogOut, Edit2,
    X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    HelpCircle, CheckCircle, XCircle, Info, AlertTriangle,
    Eye, EyeOff, Tag
} from 'lucide-react';

interface FAQ {
    id: number;
    question: string;
    answer: string;
    category: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

const API = 'http://127.0.0.1:8000';

export default function FAQPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<any>();

    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const itemsPerPage = 8;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editFaq, setEditFaq] = useState<FAQ | null>(null);
    const [form, setForm] = useState({ question: '', answer: '', category: '', is_active: true });
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    useEffect(() => { if (!token) navigate('/login'); }, [token]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchFaqs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/faq/admin`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Không thể tải FAQ');
            setFaqs(await res.json());
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsLoading(false); }
    }, [token]);

    useEffect(() => { fetchFaqs(); }, [fetchFaqs]);
    useEffect(() => { setCurrentPage(1); setPageInput('1'); }, [searchTerm]);
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);

    const openCreate = () => {
        setEditFaq(null);
        setForm({ question: '', answer: '', category: '', is_active: true });
        setShowModal(true);
    };

    const openEdit = (faq: FAQ) => {
        setEditFaq(faq);
        setForm({ question: faq.question, answer: faq.answer, category: faq.category || '', is_active: faq.is_active });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.question.trim() || !form.answer.trim()) {
            addToast('Câu hỏi và câu trả lời không được để trống', 'error'); return;
        }
        setIsSaving(true);
        try {
            const url = editFaq ? `${API}/faq/admin/${editFaq.id}` : `${API}/faq/admin`;
            const method = editFaq ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...form, category: form.category || null }),
            });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Lỗi'); }
            addToast(editFaq ? 'Đã cập nhật FAQ' : 'Đã thêm FAQ mới');
            setShowModal(false);
            fetchFaqs();
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`${API}/faq/admin/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Xóa thất bại');
            setFaqs(prev => prev.filter(f => f.id !== id));
            addToast('Đã xóa FAQ', 'info');
        } catch (e: any) { addToast(e.message, 'error'); }
        finally { setConfirmDeleteId(null); }
    };

    const handleToggle = async (id: number) => {
        try {
            const res = await fetch(`${API}/faq/admin/${id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Lỗi');
            const updated: FAQ = await res.json();
            setFaqs(prev => prev.map(f => f.id === id ? updated : f));
            addToast(updated.is_active ? 'Đã bật FAQ' : 'Đã tắt FAQ', 'info');
        } catch (e: any) { addToast(e.message, 'error'); }
    };

    const filtered = faqs.filter(f =>
        f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const current = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

            {/* Confirm delete */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 rounded-xl"><AlertTriangle size={22} className="text-red-600" /></div>
                                <h3 className="font-bold text-slate-800">Xóa FAQ này?</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">Hành động này không thể hoàn tác.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                                <button onClick={() => handleDelete(confirmDeleteId)} className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl">Xóa</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal thêm/sửa */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                                <h3 className="font-bold text-slate-800">{editFaq ? 'Chỉnh sửa FAQ' : 'Thêm FAQ mới'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Câu hỏi *</label>
                                    <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white"
                                        placeholder="VD: Học phí khóa IELTS là bao nhiêu?" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Câu trả lời *</label>
                                    <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={5}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white resize-none"
                                        placeholder="Nhập câu trả lời chi tiết..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Danh mục</label>
                                    <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white"
                                        placeholder="VD: Học phí, Lịch học, Tuyển sinh..." />
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-slate-300'}`}>
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                    <span className="text-sm text-slate-600 font-medium">{form.is_active ? 'Hiển thị cho chatbot' : 'Tạm ẩn'}</span>
                                </div>
                            </div>
                            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                <button onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                                <button onClick={handleSave} disabled={isSaving}
                                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-70 flex items-center gap-2">
                                    {isSaving && <RefreshCw size={14} className="animate-spin" />}
                                    {editFaq ? 'Cập nhật' : 'Thêm FAQ'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                        <h2 className="text-lg font-bold text-slate-800 hidden lg:block">Quản lý FAQ</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchFaqs} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 hover:text-red-500 font-semibold">Đăng xuất <LogOut size={16} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-5xl mx-auto space-y-6">
                        {/* Stats + Add */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex gap-3">
                                {[
                                    { label: 'Tổng FAQ', value: faqs.length, color: 'bg-blue-50 text-blue-700' },
                                    { label: 'Đang hoạt động', value: faqs.filter(f => f.is_active).length, color: 'bg-green-50 text-green-700' },
                                    { label: 'Đã tắt', value: faqs.filter(f => !f.is_active).length, color: 'bg-slate-100 text-slate-500' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className={`px-3 py-2 rounded-xl text-center ${color}`}>
                                        <p className="text-xl font-bold">{value}</p>
                                        <p className="text-[10px] font-semibold">{label}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={openCreate}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                                <Plus size={16} /> Thêm FAQ mới
                            </button>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <div className="relative w-full sm:w-72">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Tìm câu hỏi, danh mục..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white font-medium" />
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                        <RefreshCw size={28} className="animate-spin opacity-40" />
                                        <p className="text-sm">Đang tải...</p>
                                    </div>
                                ) : current.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                        <HelpCircle size={48} className="opacity-20" />
                                        <p className="text-sm font-medium">{searchTerm ? 'Không tìm thấy FAQ' : 'Chưa có FAQ nào'}</p>
                                        {!searchTerm && <button onClick={openCreate} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">Thêm FAQ đầu tiên</button>}
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {current.map((faq, idx) => (
                                            <motion.div key={faq.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className={`p-4 hover:bg-slate-50 group transition-colors ${!faq.is_active ? 'opacity-50' : ''}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                                        <HelpCircle size={14} className="text-amber-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="text-sm font-bold text-slate-800">{faq.question}</p>
                                                            {faq.category && (
                                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                                    <Tag size={9} />{faq.category}
                                                                </span>
                                                            )}
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${faq.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                {faq.is_active ? 'Hoạt động' : 'Đã tắt'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-2">{faq.answer}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleToggle(faq.id)}
                                                            className={`p-2 rounded-lg transition-colors ${faq.is_active ? 'text-slate-400 hover:text-orange-500 hover:bg-orange-50' : 'text-slate-400 hover:text-green-500 hover:bg-green-50'}`}
                                                            title={faq.is_active ? 'Tắt FAQ' : 'Bật FAQ'}>
                                                            {faq.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                                                        </button>
                                                        <button onClick={() => openEdit(faq)}
                                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button onClick={() => setConfirmDeleteId(faq.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
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