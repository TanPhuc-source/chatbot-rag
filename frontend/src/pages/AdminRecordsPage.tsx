import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Upload, FileText, FileSpreadsheet, File as FileIcon,
    Trash2, CheckCircle, RefreshCw, AlertCircle, Database,
    BrainCircuit, Search, Menu, X, XCircle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    LogOut, Layers, Clock, AlertTriangle, Info,
    Eye, BookOpen, Hash, BookMarked
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type DocStatus = 'uploaded' | 'indexed' | 'done' | 'processing' | 'error' | 'success';

interface DocumentItem {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'xlsx' | 'image' | 'other';
    status: DocStatus;
    uploadedAt: string;
    uploadProgress?: number;
}

interface UploadResponse {
    document_id: string;
    filename: string;
    chunks_indexed: number;
    status: string;
    error?: string | null;
}

interface StatsData {
    total_chunks?: number;
    collection_name?: string;
    [key: string]: any;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ChunkItem {
    chunk_index: number;
    text: string;
    first_page: number;
    source_file: string;
}

interface PreviewData {
    document_id: string;
    total_chunks: number;
    chunks: ChunkItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const getFileType = (filename: string): DocumentItem['type'] => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.match(/\.(docx?|doc)$/)) return 'docx';
    if (lower.match(/\.(xlsx?|xls|csv)$/)) return 'xlsx';
    if (lower.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
    return 'other';
};

const FileTypeIcon = ({ type, size = 20 }: { type: DocumentItem['type']; size?: number }) => {
    const icons = {
        pdf: <FileText size={size} className="text-red-500" />,
        docx: <FileText size={size} className="text-blue-600 dark:text-blue-400" />,
        xlsx: <FileSpreadsheet size={size} className="text-green-600 dark:text-green-400" />,
        image: <FileIcon size={size} className="text-purple-500 dark:text-purple-400" />,
        other: <FileIcon size={size} className="text-slate-400 dark:text-slate-500" />,
    };
    return icons[type];
};

const StatusBadge = ({ status }: { status: DocStatus }) => {
    const config: Record<DocStatus, { label: string; className: string }> = {
        indexed: { label: 'Đã Index', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        done: { label: 'Đã xử lý', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        success: { label: 'Đã Index', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        processing: { label: 'Đang xử lý', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        uploaded: { label: 'Mới tải lên', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        error: { label: 'Lỗi', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    const { label, className } = config[status] ?? config.uploaded;
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${className}`}>{label}</span>
    );
};

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminRecordsPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }>();

    // --- State ---
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoadingDocs, setIsLoadingDocs] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteBulk, setConfirmDeleteBulk] = useState(false);

    // Preview state
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [previewChunkPage, setPreviewChunkPage] = useState(1);
    const CHUNKS_PER_PAGE = 5;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const itemsPerPage = 8;

    // --- Auth guard ---
    useEffect(() => {
        if (!token) navigate('/login');
    }, [token, navigate]);

    // --- Toast ---
    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    // --- Fetch documents ---
    const fetchDocuments = useCallback(async () => {
        if (!token) return;
        setIsLoadingDocs(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/admin/documents', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Không thể tải danh sách tài liệu');
            const data = await res.json();
            const docs: DocumentItem[] = data.map((item: any) => ({
                id: item.id.toString(),
                name: item.filename,
                type: getFileType(item.filename),
                status: item.status as DocStatus,
                uploadedAt: new Date(item.created_at).toLocaleString('vi-VN'),
            }));
            setDocuments(docs);
        } catch (err: any) {
            addToast(err.message || 'Lỗi kết nối server', 'error');
        } finally {
            setIsLoadingDocs(false);
        }
    }, [token, addToast]);

    // --- Fetch stats ---
    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch('http://127.0.0.1:8000/upload/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setStats(await res.json());
        } catch { /* stats optional */ }
    }, [token]);

    useEffect(() => {
        fetchDocuments();
        fetchStats();
    }, [fetchDocuments, fetchStats]);

    // --- Open preview ---
    const openPreview = useCallback(async (doc: DocumentItem) => {
        setPreviewDoc(doc);
        setPreviewData(null);
        setPreviewChunkPage(1);
        setIsLoadingPreview(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/upload/${doc.id}/content`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Không tải được nội dung');
            const data: PreviewData = await res.json();
            setPreviewData(data);
        } catch (err: any) {
            addToast(err.message || 'Lỗi tải nội dung tài liệu', 'error');
            setPreviewDoc(null);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [token, addToast]);

    // --- Pagination sync ---
    useEffect(() => { setCurrentPage(1); setPageInput('1'); }, [searchTerm]);
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);

    // --- Upload ---
    const uploadFile = async (file: File): Promise<void> => {
        const tempId = `temp-${Math.random().toString(36).slice(2)}`;
        const tempDoc: DocumentItem = {
            id: tempId,
            name: file.name,
            type: getFileType(file.name),
            status: 'processing',
            uploadedAt: new Date().toLocaleString('vi-VN'),
            uploadProgress: 0,
        };
        setDocuments(prev => [tempDoc, ...prev]);

        return new Promise<void>((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setDocuments(prev =>
                        prev.map(d => d.id === tempId ? { ...d, uploadProgress: pct } : d)
                    );
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const result: UploadResponse = JSON.parse(xhr.responseText);
                    setDocuments(prev => prev.map(d =>
                        d.id === tempId
                            ? { ...d, id: result.document_id, status: result.status as DocStatus, uploadProgress: 100 }
                            : d
                    ));
                    addToast(`✅ "${file.name}" — ${result.chunks_indexed} chunks đã index`, 'success');
                    fetchStats();
                    resolve();
                } else {
                    setDocuments(prev => prev.map(d => d.id === tempId ? { ...d, status: 'error' } : d));
                    addToast(`Lỗi upload: ${file.name}`, 'error');
                    reject();
                }
            };

            xhr.onerror = () => {
                setDocuments(prev => prev.map(d => d.id === tempId ? { ...d, status: 'error' } : d));
                addToast('Lỗi mạng khi upload', 'error');
                reject();
            };

            xhr.open('POST', 'http://127.0.0.1:8000/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    };

    const handleFiles = (files: FileList) => {
        Array.from(files).forEach(file => uploadFile(file));
    };

    // --- Delete single (xóa cả DB + ChromaDB) ---
    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            // 1. Xóa trong PostgreSQL
            const r1 = await fetch(`http://127.0.0.1:8000/admin/documents/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!r1.ok) {
                const body = await r1.json().catch(() => ({}));
                throw new Error(body.detail || `Lỗi server: ${r1.status}`);
            }

            // 2. Xóa trong ChromaDB (best-effort, không fail nếu không tìm thấy)
            fetch(`http://127.0.0.1:8000/upload/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => { });

            setDocuments(prev => prev.filter(d => d.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
            addToast('Đã xóa tài liệu thành công', 'info');
            fetchStats();
        } catch (err: any) {
            addToast(err.message || 'Không thể xóa tài liệu', 'error');
        } finally {
            setIsDeleting(false);
            setConfirmDeleteId(null);
        }
    };

    // --- Delete bulk ---
    const handleDeleteSelected = async () => {
        setIsDeleting(true);
        let successCount = 0;
        for (const id of selectedIds) {
            try {
                const r = await fetch(`http://127.0.0.1:8000/admin/documents/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (r.ok) {
                    fetch(`http://127.0.0.1:8000/upload/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                    }).catch(() => { });
                    successCount++;
                }
            } catch { /* continue */ }
        }
        setDocuments(prev => prev.filter(d => !selectedIds.includes(d.id)));
        setSelectedIds([]);
        addToast(`Đã xóa ${successCount}/${selectedIds.length} tài liệu`, successCount === selectedIds.length ? 'info' : 'error');
        fetchStats();
        setIsDeleting(false);
        setConfirmDeleteBulk(false);
    };

    // --- Selection ---
    const filteredDocs = documents.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
    const currentDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const newIds = Array.from(new Set([...selectedIds, ...currentDocs.map(d => d.id)]));
            setSelectedIds(newIds);
        } else {
            const pageIds = new Set(currentDocs.map(d => d.id));
            setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
        }
    };

    const isAllCurrentSelected = currentDocs.length > 0 && currentDocs.every(d => selectedIds.includes(d.id));

    // ── Stats derived ──────────────────────────────────────────────────────
    const countByStatus = (s: DocStatus) => documents.filter(d =>
        d.status === s || (s === 'indexed' && (d.status === 'done' || d.status === 'success' as any))
    ).length;

    if (!token) return null;

    return (
        <>
            {/* --- TOASTS --- */}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[300px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md transition-colors ${toast.type === 'success' ? 'border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400' : toast.type === 'error' ? 'border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400' : 'border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400'}`}
                        >
                            {toast.type === 'success' ? <CheckCircle size={18} /> : toast.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
                            <span className="text-sm font-medium flex-1">{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* --- CONFIRM DELETE SINGLE --- */}
            <AnimatePresence>
                {confirmDeleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl"><AlertTriangle size={22} className="text-red-600 dark:text-red-400" /></div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Xác nhận xóa</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Tài liệu sẽ bị xóa vĩnh viễn khỏi cả <strong>cơ sở dữ liệu</strong> và <strong>ChromaDB</strong>. Không thể hoàn tác.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Hủy</button>
                                <button onClick={() => handleDelete(confirmDeleteId)} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2">
                                    {isDeleting && <RefreshCw size={14} className="animate-spin" />} Xóa vĩnh viễn
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- CONFIRM DELETE BULK --- */}
            <AnimatePresence>
                {confirmDeleteBulk && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl"><AlertTriangle size={22} className="text-red-600 dark:text-red-400" /></div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Xóa {selectedIds.length} tài liệu?</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Tất cả <strong>{selectedIds.length} tài liệu</strong> đã chọn sẽ bị xóa vĩnh viễn khỏi DB và ChromaDB.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmDeleteBulk(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Hủy</button>
                                <button onClick={handleDeleteSelected} disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 transition-all active:scale-95 flex items-center gap-2">
                                    {isDeleting && <RefreshCw size={14} className="animate-spin" />} Xóa tất cả
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- PREVIEW MODAL --- */}
            <AnimatePresence>
                {previewDoc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-colors"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 transition-colors">
                                        <FileTypeIcon type={previewDoc.type} size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm" title={previewDoc.name}>{previewDoc.name}</h3>
                                        {previewData && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                                <BookMarked size={11} />
                                                {previewData.total_chunks} chunks đã index
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => { setPreviewDoc(null); setPreviewData(null); }}
                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 ml-4">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {isLoadingPreview ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 dark:text-slate-500">
                                        <RefreshCw size={28} className="animate-spin opacity-40" />
                                        <p className="text-sm">Đang tải nội dung từ ChromaDB...</p>
                                    </div>
                                ) : !previewData ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 dark:text-slate-500">
                                        <Database size={40} className="opacity-20" />
                                        <p className="text-sm">Không có dữ liệu</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Info bar */}
                                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl px-4 py-2.5 transition-colors">
                                            <span className="flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-400">
                                                <Database size={13} /> ChromaDB
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600">·</span>
                                            <span>{previewData.total_chunks} chunks</span>
                                            <span className="text-slate-300 dark:text-slate-600">·</span>
                                            <span>Hiển thị {CHUNKS_PER_PAGE} chunk / trang</span>
                                        </div>

                                        {/* Chunks */}
                                        {previewData.chunks
                                            .slice((previewChunkPage - 1) * CHUNKS_PER_PAGE, previewChunkPage * CHUNKS_PER_PAGE)
                                            .map((chunk) => (
                                                <motion.div
                                                    key={chunk.chunk_index}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden transition-colors"
                                                >
                                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50 transition-colors">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                            <Hash size={12} />
                                                            Chunk {chunk.chunk_index + 1}
                                                        </div>
                                                        {chunk.first_page > 0 && (
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full transition-colors">
                                                                Trang {chunk.first_page}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="px-4 py-3">
                                                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                                                            {chunk.text}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}

                                        {/* Chunk pagination */}
                                        {Math.ceil(previewData.total_chunks / CHUNKS_PER_PAGE) > 1 && (
                                            <div className="flex items-center justify-center gap-2 pt-2">
                                                <button onClick={() => setPreviewChunkPage(p => Math.max(p - 1, 1))} disabled={previewChunkPage === 1}
                                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium px-2">
                                                    {previewChunkPage} / {Math.ceil(previewData.total_chunks / CHUNKS_PER_PAGE)}
                                                </span>
                                                <button onClick={() => setPreviewChunkPage(p => Math.min(p + 1, Math.ceil(previewData.total_chunks / CHUNKS_PER_PAGE)))} disabled={previewChunkPage === Math.ceil(previewData.total_chunks / CHUNKS_PER_PAGE)}
                                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900 transition-colors">
                {/* --- HEADER --- */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 sticky top-0 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Menu size={24} /></button>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 hidden lg:block">Hồ sơ Tài liệu</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchDocuments} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Làm mới">
                            <RefreshCw size={18} className={isLoadingDocs ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}
                            className="text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-semibold">
                            Đăng xuất <LogOut size={16} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* --- STATS ROW --- */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Tổng tài liệu', value: documents.length, icon: <Database size={20} />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                                { label: 'Đã Index', value: countByStatus('indexed'), icon: <CheckCircle size={20} />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
                                { label: 'Đang xử lý', value: countByStatus('processing'), icon: <RefreshCw size={20} className={documents.some(d => d.status === 'processing') ? 'animate-spin' : ''} />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
                                { label: 'Chunks trong DB', value: stats?.total_chunks ?? '—', icon: <Layers size={20} />, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
                            ].map(({ label, value, icon, color, bg }) => (
                                <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4 transition-colors">
                                    <div className={`p-2.5 rounded-xl ${bg} ${color} transition-colors`}>{icon}</div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">{label}</p>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* --- LEFT: UPLOAD --- */}
                            <div className="lg:col-span-4 space-y-4">
                                {/* Upload Box */}
                                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                            <Upload size={18} className="text-blue-600 dark:text-blue-400" /> Tải tài liệu mới
                                        </h3>
                                    </div>
                                    <div className="p-5">
                                        <div
                                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input ref={fileInputRef} type="file" className="hidden" multiple
                                                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.pptx,.jpg,.jpeg,.png"
                                                onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
                                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 shadow-sm transition-colors">
                                                <Upload size={26} strokeWidth={2} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Click hoặc Kéo thả file</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">PDF, DOCX, Excel, TXT, PPTX, Ảnh</p>
                                            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Tối đa 50MB / file</p>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Pipeline info */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 rounded-3xl shadow-lg shadow-indigo-200 dark:shadow-none text-white p-6 relative overflow-hidden transition-colors">
                                    <BrainCircuit className="absolute -bottom-4 -right-4 text-white opacity-10" size={120} />
                                    <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                                        <Database size={18} className="text-indigo-200" /> Pipeline RAG
                                    </h4>
                                    <p className="text-sm text-indigo-100 leading-relaxed mb-4 opacity-90">
                                        Tài liệu được tự động trích xuất, chia chunks và vector hóa vào ChromaDB ngay khi upload.
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                                        <span className="bg-white/20 px-2.5 py-1 rounded-lg">Extract</span>
                                        <span className="bg-white/20 px-2.5 py-1 rounded-lg">Chunk</span>
                                        <span className="bg-white/20 px-2.5 py-1 rounded-lg">Embed</span>
                                        <span className="bg-white/20 px-2.5 py-1 rounded-lg">ChromaDB</span>
                                    </div>
                                    {stats?.collection_name && (
                                        <p className="text-[11px] text-indigo-200 mt-3 opacity-70">Collection: {stats.collection_name}</p>
                                    )}
                                </div>
                            </div>

                            {/* --- RIGHT: FILE LIST --- */}
                            <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden min-h-[500px] transition-colors">
                                {/* Toolbar */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-800 sticky top-0 z-10 transition-colors">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Kho tài liệu</h3>
                                        <span className="text-xs text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium transition-colors">
                                            {filteredDocs.length} file
                                        </span>
                                        <AnimatePresence>
                                            {selectedIds.length > 0 && (
                                                <motion.button
                                                    initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                                    onClick={() => setConfirmDeleteBulk(true)}
                                                    disabled={isDeleting}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} /> Xóa ({selectedIds.length})
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="relative w-full sm:w-56">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm tài liệu..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 font-medium transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Table header */}
                                {!isLoadingDocs && filteredDocs.length > 0 && (
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">
                                        <div className="w-8 flex justify-center">
                                            <input type="checkbox" checked={isAllCurrentSelected} onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 cursor-pointer" />
                                        </div>
                                        <span className="w-10 shrink-0">Loại</span>
                                        <span className="flex-1">Tên tài liệu</span>
                                        <span className="hidden sm:block w-28 text-center">Trạng thái</span>
                                        <span className="hidden md:block w-36">Ngày tải</span>
                                        <span className="w-24 text-center">Thao tác</span>
                                    </div>
                                )}

                                {/* List */}
                                <div className="flex-1 overflow-y-auto">
                                    {isLoadingDocs ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 dark:text-slate-500 py-20">
                                            <RefreshCw size={28} className="animate-spin opacity-40" />
                                            <p className="text-sm">Đang tải danh sách...</p>
                                        </div>
                                    ) : filteredDocs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 dark:text-slate-500 py-20">
                                            <Database size={48} className="opacity-20" />
                                            <p className="text-sm font-medium">{searchTerm ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào'}</p>
                                            {!searchTerm && <p className="text-xs text-slate-300 dark:text-slate-600">Kéo thả hoặc chọn file để bắt đầu</p>}
                                        </div>
                                    ) : (
                                        <AnimatePresence>
                                            {currentDocs.map((doc, idx) => (
                                                <motion.div
                                                    key={doc.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${selectedIds.includes(doc.id) ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}
                                                >
                                                    {/* Checkbox */}
                                                    <div className="w-8 flex justify-center shrink-0">
                                                        <input type="checkbox"
                                                            checked={selectedIds.includes(doc.id)}
                                                            onChange={() => setSelectedIds(prev =>
                                                                prev.includes(doc.id) ? prev.filter(i => i !== doc.id) : [...prev, doc.id]
                                                            )}
                                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 cursor-pointer"
                                                        />
                                                    </div>

                                                    {/* Icon */}
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shrink-0 transition-colors">
                                                        <FileTypeIcon type={doc.type} />
                                                    </div>

                                                    {/* Name & progress */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" title={doc.name}>{doc.name}</p>
                                                        {doc.status === 'processing' && typeof doc.uploadProgress === 'number' && (
                                                            <div className="mt-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                                                                <motion.div
                                                                    className="bg-blue-500 dark:bg-blue-400 h-1 rounded-full"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${doc.uploadProgress}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status */}
                                                    <div className="hidden sm:flex w-28 justify-center shrink-0">
                                                        <StatusBadge status={doc.status} />
                                                    </div>

                                                    {/* Date */}
                                                    <div className="hidden md:flex items-center gap-1.5 w-36 text-xs text-slate-400 dark:text-slate-500 shrink-0">
                                                        <Clock size={12} className="shrink-0" />
                                                        <span className="truncate">{doc.uploadedAt}</span>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="w-16 flex justify-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => openPreview(doc)}
                                                            className="p-2 text-slate-300 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Xem nội dung"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(doc.id)}
                                                            className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Xóa tài liệu"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-center items-center gap-2 transition-colors">
                                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <ChevronsLeft size={16} />
                                        </button>
                                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Trang</span>
                                            <input type="number" min={1} max={totalPages} value={pageInput}
                                                onChange={(e) => setPageInput(e.target.value)}
                                                onBlur={() => { const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p); else setPageInput(currentPage.toString()); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p); } }}
                                                className="w-10 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm font-bold text-slate-800 dark:text-slate-100 h-7 transition-colors"
                                            />
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ {totalPages}</span>
                                        </div>
                                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <ChevronRight size={16} />
                                        </button>
                                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            <ChevronsRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}