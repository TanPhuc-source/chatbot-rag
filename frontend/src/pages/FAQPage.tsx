import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Plus, Trash2, RefreshCw, Search, Menu, LogOut, Edit2,
    X, ChevronLeft, ChevronRight, HelpCircle, CheckCircle,
    XCircle, AlertTriangle, Eye, EyeOff, Tag, Layers,
    MessageCircleQuestion, ToggleLeft, ToggleRight, Sparkles
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

const CATEGORY_COLORS = [
    { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
    { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
    { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
];

function getCategoryColor(category: string | null, allCategories: string[]) {
    if (!category) return CATEGORY_COLORS[0];
    let idx = allCategories.indexOf(category);
    if (idx === -1) {
        // Fallback for new categories not yet in the main list
        // A simple hash to get a consistent color
        idx = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
}

export default function FAQPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const { setIsMobileMenuOpen } = useOutletContext<any>();

    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [showModal, setShowModal] = useState(false);
    const [editFaq, setEditFaq] = useState<FAQ | null>(null);
    const [form, setForm] = useState({ question: '', answer: '', category: '', is_active: true });
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!token) navigate('/login'); }, [token]);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setShowCategoryDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

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
    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeCategory]);

    const allCategories = Array.from(new Set(faqs.map(f => f.category).filter(Boolean) as string[])).sort();

    const openCreate = (defaultCategory?: string) => {
        setEditFaq(null);
        setForm({ question: '', answer: '', category: defaultCategory || '', is_active: true });
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
            const res = await fetch(url, {
                method: editFaq ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...form, category: form.category.trim() || null }),
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
        } catch (e: any) { addToast(e.message, 'error'); }
    };

    const filtered = faqs.filter(f => {
        const matchCat = activeCategory === null || f.category === activeCategory || (activeCategory === '' && !f.category);
        const matchSearch = !searchTerm ||
            f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
    });
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <>
            {/* Toasts */}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border min-w-[280px] text-sm font-semibold
                            ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                            {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Sparkles size={16} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirm delete */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                        <motion.div initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full border border-slate-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                                    <AlertTriangle size={24} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Xóa FAQ này?</h3>
                                    <p className="text-sm text-slate-400 mt-0.5">Không thể hoàn tác</p>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
                                <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">Xóa</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal thêm/sửa */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93 }} transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">

                            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${editFaq ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                        {editFaq ? <Edit2 size={16} className="text-amber-600" /> : <Plus size={16} className="text-blue-600" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-base leading-none">{editFaq ? 'Chỉnh sửa FAQ' : 'Thêm FAQ mới'}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{editFaq ? `ID #${editFaq.id}` : 'Điền thông tin bên dưới'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <MessageCircleQuestion size={12} /> Câu hỏi <span className="text-red-400">*</span>
                                    </label>
                                    <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300"
                                        placeholder="Nhập câu hỏi thường gặp..." />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <Sparkles size={12} /> Câu trả lời <span className="text-red-400">*</span>
                                    </label>
                                    <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={5}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm leading-relaxed focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                                        placeholder="Nhập câu trả lời chi tiết..." />
                                    <p className="text-right text-[11px] text-slate-300 mt-1">{form.answer.length} ký tự</p>
                                </div>

                                {/* Danh mục dropdown */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <Tag size={12} /> Danh mục
                                    </label>
                                    <div className="relative" ref={dropdownRef}>
                                        <button type="button" onClick={() => setShowCategoryDropdown(p => !p)}
                                            className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-medium text-left flex items-center justify-between bg-slate-50 hover:bg-white focus:outline-none focus:border-blue-400 transition-all">
                                            {form.category ? (
                                                <span className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${getCategoryColor(form.category, allCategories).dot}`} />
                                                    <span className="text-slate-700">{form.category}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">Chọn hoặc tạo danh mục...</span>
                                            )}
                                            <ChevronRight size={16} className={`text-slate-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-90' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showCategoryDropdown && (
                                                <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 overflow-hidden">

                                                    {/* Thêm danh mục mới */}
                                                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tạo danh mục mới</p>
                                                        <div className="flex gap-2">
                                                            <input value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' && newCategoryInput.trim()) {
                                                                        setForm(f => ({ ...f, category: newCategoryInput.trim() }));
                                                                        setNewCategoryInput('');
                                                                        setShowCategoryDropdown(false);
                                                                    }
                                                                }}
                                                                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white placeholder:text-slate-300 font-medium"
                                                                placeholder="Tên danh mục mới..." />
                                                            <button
                                                                onClick={() => {
                                                                    if (newCategoryInput.trim()) {
                                                                        setForm(f => ({ ...f, category: newCategoryInput.trim() }));
                                                                        setNewCategoryInput('');
                                                                        setShowCategoryDropdown(false);
                                                                    }
                                                                }}
                                                                className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap">
                                                                + Tạo
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Không có danh mục */}
                                                    <button onClick={() => { setForm(f => ({ ...f, category: '' })); setShowCategoryDropdown(false); }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${!form.category ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}>
                                                        <Layers size={14} className="shrink-0" /> Không có danh mục
                                                    </button>

                                                    {/* Danh sách */}
                                                    {allCategories.length > 0 && (
                                                        <>
                                                            <div className="px-4 py-1.5 border-t border-slate-100">
                                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Hiện có</p>
                                                            </div>
                                                            <div className="max-h-44 overflow-y-auto pb-2">
                                                                {allCategories.map(cat => {
                                                                    const color = getCategoryColor(cat, allCategories);
                                                                    return (
                                                                        <button key={cat} onClick={() => { setForm(f => ({ ...f, category: cat })); setShowCategoryDropdown(false); }}
                                                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${form.category === cat ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                                                            <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                                                                            <span className={`font-semibold flex-1 ${form.category === cat ? 'text-blue-700' : 'text-slate-700'}`}>{cat}</span>
                                                                            <span className="text-[11px] text-slate-400 font-medium">{faqs.filter(f => f.category === cat).length} FAQ</span>
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

                                {/* Toggle */}
                                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${form.is_active ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
                                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Hiển thị cho chatbot</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{form.is_active ? 'Chatbot sẽ dùng FAQ này để trả lời' : 'Tạm thời bị tắt'}</p>
                                    </div>
                                    {form.is_active
                                        ? <ToggleRight size={36} className="text-green-500 shrink-0" />
                                        : <ToggleLeft size={36} className="text-slate-400 shrink-0" />}
                                </div>
                            </div>

                            <div className="px-6 py-5 flex justify-end gap-3 shrink-0 border-t border-slate-100">
                                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
                                <button onClick={handleSave} disabled={isSaving}
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60 flex items-center gap-2 transition-colors">
                                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : (editFaq ? <Edit2 size={14} /> : <Plus size={14} />)}
                                    {editFaq ? 'Lưu thay đổi' : 'Thêm FAQ'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Main */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={22} /></button>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                                <HelpCircle size={16} className="text-amber-600" />
                            </div>
                            <div className="hidden sm:block">
                                <h2 className="text-sm font-bold text-slate-800 leading-none">Quản lý FAQ</h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">{faqs.length} câu hỏi · {faqs.filter(f => f.is_active).length} hoạt động</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchFaqs} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => openCreate(activeCategory || undefined)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                            <Plus size={14} /> Thêm FAQ
                        </button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <LogOut size={16} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar danh mục */}
                    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
                        <div className="px-4 pt-5 pb-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danh mục</p>
                        </div>
                        <div className="px-3 space-y-0.5 flex-1">
                            <button onClick={() => setActiveCategory(null)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeCategory === null ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                                <Layers size={14} className={activeCategory === null ? 'text-blue-200' : 'text-slate-400'} />
                                <span className="flex-1 text-left">Tất cả</span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${activeCategory === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{faqs.length}</span>
                            </button>

                            {faqs.filter(f => !f.category).length > 0 && (
                                <button onClick={() => setActiveCategory('')}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeCategory === '' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                                    <span className="flex-1 text-left">Chưa phân loại</span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${activeCategory === '' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{faqs.filter(f => !f.category).length}</span>
                                </button>
                            )}

                            {allCategories.length > 0 && (
                                <div className="pt-3 pb-1.5 px-1">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Danh mục</p>
                                </div>
                            )}

                            {allCategories.map(cat => {
                                const color = getCategoryColor(cat, allCategories);
                                const isActive = activeCategory === cat;
                                return (
                                    <button key={cat} onClick={() => setActiveCategory(cat)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? `${color.bg} ${color.text}` : 'text-slate-600 hover:bg-slate-100'}`}>
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                                        <span className="flex-1 text-left truncate">{cat}</span>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${isActive ? 'bg-white/50' : 'bg-slate-100 text-slate-500'}`}>{faqs.filter(f => f.category === cat).length}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-5 lg:p-6 space-y-4 max-w-4xl">
                            {/* Toolbar */}
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 max-w-xs">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Tìm câu hỏi..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white shadow-sm placeholder:text-slate-300 font-medium" />
                                </div>
                                {activeCategory !== null && (
                                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        {activeCategory === '' ? (
                                            <span className="text-xs font-semibold text-slate-500">Chưa phân loại</span>
                                        ) : (
                                            <>
                                                <span className={`w-2 h-2 rounded-full ${getCategoryColor(activeCategory, allCategories).dot}`} />
                                                <span className="text-xs font-semibold text-slate-700">{activeCategory}</span>
                                            </>
                                        )}
                                        <button onClick={() => setActiveCategory(null)} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={13} /></button>
                                    </motion.div>
                                )}
                                <p className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} kết quả</p>
                            </div>

                            {/* List */}
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-300">
                                    <RefreshCw size={28} className="animate-spin" />
                                    <p className="text-sm font-medium">Đang tải...</p>
                                </div>
                            ) : currentItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                                        <HelpCircle size={28} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-400">{searchTerm ? 'Không tìm thấy FAQ' : 'Chưa có FAQ nào'}</p>
                                    {!searchTerm && (
                                        <button onClick={() => openCreate(activeCategory || undefined)}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-colors">
                                            <Plus size={14} /> Thêm FAQ đầu tiên
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    <AnimatePresence mode="popLayout">
                                        {currentItems.map((faq, idx) => {
                                            const color = getCategoryColor(faq.category, allCategories);
                                            return (
                                                <motion.div key={faq.id} layout
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                                                    transition={{ delay: idx * 0.025 }}
                                                    className={`bg-white rounded-2xl border transition-all group hover:shadow-md ${faq.is_active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 opacity-55'}`}>
                                                    <div className="flex items-stretch">
                                                        {/* Color bar */}
                                                        <div className={`w-1 rounded-l-2xl shrink-0 ${faq.is_active ? color.dot : 'bg-slate-200'}`} />

                                                        <div className="flex-1 p-4 min-w-0">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-800 leading-snug mb-1.5">{faq.question}</p>
                                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{faq.answer}</p>
                                                                    <div className="flex items-center gap-2 mt-3">
                                                                        {faq.category ? (
                                                                            <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${color.bg} ${color.text}`}>
                                                                                <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />{faq.category}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[11px] text-slate-300 font-medium">Chưa phân loại</span>
                                                                        )}
                                                                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${faq.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                                                            {faq.is_active ? '● Hoạt động' : '○ Đã tắt'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {/* Actions */}
                                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => handleToggle(faq.id)}
                                                                        className={`p-2 rounded-xl transition-colors ${faq.is_active ? 'text-slate-300 hover:text-orange-500 hover:bg-orange-50' : 'text-slate-300 hover:text-green-500 hover:bg-green-50'}`}>
                                                                        {faq.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                    </button>
                                                                    <button onClick={() => openEdit(faq)} className="p-2 rounded-xl text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => setConfirmDeleteId(faq.id)} className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-1.5 pt-2 pb-4">
                                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm">
                                        <ChevronLeft size={14} /> Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => setCurrentPage(p)}
                                            className={`w-8 h-8 text-xs font-bold rounded-xl transition-colors ${p === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50'}`}>
                                            {p}
                                        </button>
                                    ))}
                                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm">
                                        Sau <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}