// src/components/admin/FormTemplatesTab.tsx
// Tab quản lý biểu mẫu — nhúng vào AdminRecordsPage

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
    Upload, FileText, File as FileIcon, Trash2, RefreshCw,
    Search, CheckCircle, XCircle, Info, AlertTriangle,
    Eye, EyeOff, Download, Edit3, X, Plus
} from 'lucide-react';

const API = '';

interface FormItem {
    id: number;
    display_name: string;
    description: string | null;
    filename: string;
    file_type: string;
    is_active: boolean;
    download_url: string;
    created_at: string;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const FileTypeIcon = ({ type }: { type: string }) => {
    if (type === 'pdf') return <FileText size={20} className="text-red-500" />;
    if (type === 'docx') return <FileText size={20} className="text-blue-600 dark:text-blue-400" />;
    if (type === 'xlsx') return <FileText size={20} className="text-green-600 dark:text-green-400" />;
    if (type === 'pptx') return <FileText size={20} className="text-orange-500" />;
    return <FileIcon size={20} className="text-slate-400" />;
};

export default function FormTemplatesTab() {
    const { isLoggedIn, cookieReady } = useAuthStore();

    const [forms, setForms] = useState<FormItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Upload modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadDesc, setUploadDesc] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Edit modal state
    const [editForm, setEditForm] = useState<FormItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchForms = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/forms?include_inactive=true`, {
                credentials: 'include',
                });
            if (!res.ok) throw new Error('Không thể tải danh sách biểu mẫu');
            const data: FormItem[] = await res.json();
            setForms(data);
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn, addToast]);

    useEffect(() => { fetchForms(); }, [fetchForms]);

    // ── Upload ────────────────────────────────────────────────────────────

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadName.trim()) {
            addToast('Vui lòng chọn file và nhập tên hiển thị', 'error');
            return;
        }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('display_name', uploadName.trim());
            if (uploadDesc.trim()) formData.append('description', uploadDesc.trim());

            const res = await fetch(`${API}/forms/upload`, {
                credentials: 'include',
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.detail || 'Lỗi upload');
            }
            const created: FormItem = await res.json();
            setForms(prev => [created, ...prev]);
            addToast(`✅ Đã thêm "${created.display_name}"`, 'success');
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadName('');
            setUploadDesc('');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // ── Toggle active ─────────────────────────────────────────────────────

    const toggleActive = async (form: FormItem) => {
        try {
            const res = await fetch(`${API}/forms/${form.id}`, {
                credentials: 'include',
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: !form.is_active }),
            });
            if (!res.ok) throw new Error('Không thể cập nhật');
            const updated: FormItem = await res.json();
            setForms(prev => prev.map(f => f.id === form.id ? updated : f));
            addToast(updated.is_active ? 'Đã bật biểu mẫu' : 'Đã ẩn biểu mẫu', 'info');
        } catch (err: any) {
            addToast(err.message, 'error');
        }
    };

    // ── Edit ──────────────────────────────────────────────────────────────

    const openEdit = (form: FormItem) => {
        setEditForm(form);
        setEditName(form.display_name);
        setEditDesc(form.description ?? '');
    };

    const handleEditSave = async () => {
        if (!editForm || !editName.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${API}/forms/${editForm.id}`, {
                credentials: 'include',
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    display_name: editName.trim(),
                    description: editDesc.trim() || null,
                }),
            });
            if (!res.ok) throw new Error('Không thể lưu');
            const updated: FormItem = await res.json();
            setForms(prev => prev.map(f => f.id === updated.id ? updated : f));
            addToast('Đã lưu thay đổi', 'success');
            setEditForm(null);
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────

    const handleDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            const res = await fetch(`${API}/forms/${id}`, {
                credentials: 'include',
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Không thể xóa');
            setForms(prev => prev.filter(f => f.id !== id));
            addToast('Đã xóa biểu mẫu', 'info');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsDeleting(false);
            setConfirmDeleteId(null);
        }
    };

    const filtered = forms.filter(f =>
        f.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {/* Toasts */}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[300px]
                                bg-white/95 dark:bg-slate-800/95 backdrop-blur-md
                                ${t.type === 'success' ? 'border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
                                    : t.type === 'error' ? 'border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
                                    : 'border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'}`}>
                            {t.type === 'success' ? <CheckCircle size={18} /> : t.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
                            <span className="text-sm font-medium flex-1">{t.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirm Delete */}
            <AnimatePresence>
                {confirmDeleteId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                    <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Xác nhận xóa</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                                Biểu mẫu và file sẽ bị xóa vĩnh viễn. Bot sẽ không còn cung cấp link này nữa.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteId(null)}
                                    className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                                    Hủy
                                </button>
                                <button onClick={() => handleDelete(confirmDeleteId!)} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2">
                                    {isDeleting && <RefreshCw size={14} className="animate-spin" />} Xóa vĩnh viễn
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Chỉnh sửa biểu mẫu</h3>
                                <button onClick={() => setEditForm(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                                        Tên hiển thị <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                                        placeholder="VD: Đơn xin đổi lịch học"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                                        Mô tả (tuỳ chọn)
                                    </label>
                                    <textarea
                                        value={editDesc}
                                        onChange={e => setEditDesc(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors resize-none"
                                        placeholder="Mô tả ngắn về biểu mẫu..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-5">
                                <button onClick={() => setEditForm(null)}
                                    className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleEditSave} disabled={isSaving || !editName.trim()}
                                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2">
                                    {isSaving && <RefreshCw size={14} className="animate-spin" />} Lưu
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Thêm biểu mẫu mới</h3>
                                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadName(''); setUploadDesc(''); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Drop zone */}
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all
                                        ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : uploadFile
                                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={e => {
                                        e.preventDefault(); setIsDragging(false);
                                        const f = e.dataTransfer.files[0];
                                        if (f) { setUploadFile(f); if (!uploadName) setUploadName(f.name.replace(/\.[^.]+$/, '')); }
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input ref={fileInputRef} type="file" className="hidden"
                                        accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx"
                                        onChange={e => {
                                            const f = e.target.files?.[0];
                                            if (f) { setUploadFile(f); if (!uploadName) setUploadName(f.name.replace(/\.[^.]+$/, '')); }
                                        }} />
                                    {uploadFile ? (
                                        <>
                                            <CheckCircle size={28} className="text-green-500 mb-2" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-full px-2">{uploadFile.name}</p>
                                            <p className="text-xs text-slate-400 mt-1">{(uploadFile.size / 1024).toFixed(0)} KB — click để đổi file</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={28} className="text-slate-400 mb-2" />
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Click hoặc kéo thả file</p>
                                            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, PPTX</p>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                                        Tên hiển thị <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={uploadName}
                                        onChange={e => setUploadName(e.target.value)}
                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                                        placeholder="VD: Đơn xin đổi lịch học"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                                        Mô tả (tuỳ chọn)
                                    </label>
                                    <input
                                        value={uploadDesc}
                                        onChange={e => setUploadDesc(e.target.value)}
                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                                        placeholder="VD: Dùng khi muốn đổi sang lịch khác"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end mt-5">
                                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadName(''); setUploadDesc(''); }}
                                    className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleUploadSubmit} disabled={isUploading || !uploadFile || !uploadName.trim()}
                                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2">
                                    {isUploading && <RefreshCw size={14} className="animate-spin" />} Tải lên
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Main content ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Biểu mẫu & Đơn từ</h3>
                        <span className="text-xs text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium transition-colors">
                            {filtered.length} file
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full font-medium">
                            {forms.filter(f => f.is_active).length} đang bật
                        </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-56">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm biểu mẫu..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all active:scale-95 shrink-0"
                        >
                            <Plus size={14} /> Thêm
                        </button>
                        <button onClick={fetchForms} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Làm mới">
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Table header */}
                {!isLoading && filtered.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">
                        <span className="w-10 shrink-0">Loại</span>
                        <span className="flex-1">Tên biểu mẫu</span>
                        <span className="hidden sm:block w-24 text-center">Trạng thái</span>
                        <span className="w-28 text-right pr-1">Thao tác</span>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
                            <RefreshCw size={28} className="animate-spin opacity-40" />
                            <p className="text-sm">Đang tải...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
                            <FileIcon size={48} className="opacity-20" />
                            <p className="text-sm font-medium">{searchTerm ? 'Không tìm thấy biểu mẫu phù hợp' : 'Chưa có biểu mẫu nào'}</p>
                            {!searchTerm && (
                                <button onClick={() => setShowUploadModal(true)}
                                    className="mt-1 flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all active:scale-95">
                                    <Plus size={15} /> Thêm biểu mẫu đầu tiên
                                </button>
                            )}
                        </div>
                    ) : (
                        <AnimatePresence>
                            {filtered.map(form => (
                                <motion.div key={form.id}
                                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group
                                        ${!form.is_active ? 'opacity-50' : ''}`}
                                >
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shrink-0 transition-colors">
                                        <FileTypeIcon type={form.file_type} />
                                    </div>

                                    {/* Name + desc */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{form.display_name}</p>
                                        {form.description && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{form.description}</p>
                                        )}
                                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">{form.filename}</p>
                                    </div>

                                    {/* Status badge */}
                                    <div className="hidden sm:flex w-24 justify-center shrink-0">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors
                                            ${form.is_active
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                            {form.is_active ? 'Đang bật' : 'Đã ẩn'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="w-28 flex justify-end items-center gap-1 shrink-0">
                                        <a
                                            href={`${API}${form.download_url}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                            title="Tải file"
                                        >
                                            <Download size={15} />
                                        </a>
                                        <button
                                            onClick={() => openEdit(form)}
                                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                                            title="Sửa tên"
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(form)}
                                            className={`p-2 rounded-lg transition-all
                                                ${form.is_active
                                                    ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/30'
                                                    : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30'}`}
                                            title={form.is_active ? 'Ẩn khỏi bot' : 'Bật lại'}
                                        >
                                            {form.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(form.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                            title="Xóa"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* Info footer */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 transition-colors">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Info size={12} />
                        Bot chỉ cung cấp link cho biểu mẫu đang <strong>bật</strong>. Tài liệu RAG không được trả link.
                    </p>
                </div>
            </div>
        </>
    );
}