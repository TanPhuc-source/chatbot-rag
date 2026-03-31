import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
    ArrowLeft, Menu, RefreshCw, Edit3, Trash2, Scissors, Combine,
    Save, X, ChevronDown, ChevronUp, FileText, Hash, BookOpen,
    CheckCircle, XCircle, Info, AlertTriangle, Search, Layers
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Chunk {
    chunk_id: string;
    chunk_index: number;
    text: string;
    first_page: number;
    source_file: string;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const API = '';

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastList({ toasts }: { toasts: Toast[] }) {
    return (
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
    );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, description, onConfirm, onCancel, loading }: {
    title: string; description: string;
    onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
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
                        Xóa chunk
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Split Modal ───────────────────────────────────────────────────────────────

function SplitModal({ chunk, onConfirm, onCancel, loading }: {
    chunk: Chunk;
    onConfirm: (splitAt: number) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [splitAt, setSplitAt] = useState(Math.floor(chunk.text.length / 2));
    const textRef = useRef<HTMLTextAreaElement>(null);

    const textA = chunk.text.slice(0, splitAt);
    const textB = chunk.text.slice(splitAt);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Scissors size={16} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tách chunk #{chunk.chunk_index}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Kéo thanh trượt để chọn vị trí tách</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Slider */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Vị trí tách: ký tự {splitAt} / {chunk.text.length}
                        </label>
                        <input type="range" min={1} max={chunk.text.length - 1} value={splitAt}
                            onChange={e => setSplitAt(Number(e.target.value))}
                            className="w-full mt-2 accent-indigo-600" />
                    </div>

                    {/* Preview 2 phần */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">A</span>
                                Phần 1 ({textA.length} ký tự)
                            </p>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                {textA || <span className="text-slate-400 italic">Rỗng</span>}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">B</span>
                                Phần 2 ({textB.length} ký tự)
                            </p>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                {textB || <span className="text-slate-400 italic">Rỗng</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 shrink-0">
                    <button onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Hủy
                    </button>
                    <button onClick={() => onConfirm(splitAt)} disabled={loading || !textA || !textB}
                        className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95">
                        {loading && <RefreshCw size={13} className="animate-spin" />}
                        <Scissors size={14} /> Tách chunk
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Chunk Card ────────────────────────────────────────────────────────────────

function ChunkCard({
    chunk, isSelected, onSelect, onEdit, onDelete, onSplit,
    isEditing, editText, onEditChange, onSave, onCancelEdit, saving,
    isMergeMode, mergeSelected,
}: {
    chunk: Chunk;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSplit: () => void;
    isEditing: boolean;
    editText: string;
    onEditChange: (v: string) => void;
    onSave: () => void;
    onCancelEdit: () => void;
    saving: boolean;
    isMergeMode: boolean;
    mergeSelected: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const preview = chunk.text.slice(0, 220);
    const needsExpand = chunk.text.length > 220;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={`bg-white dark:bg-slate-800/80 rounded-2xl border transition-all
                ${mergeSelected ? 'border-violet-400 dark:border-violet-500 ring-2 ring-violet-200 dark:ring-violet-800/50' :
                    isEditing ? 'border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900/40' :
                        'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'}`}>

            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
                {isMergeMode && (
                    <input type="checkbox" checked={mergeSelected} onChange={onSelect}
                        className="w-4 h-4 rounded border-slate-300 accent-violet-600 cursor-pointer shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <Hash size={13} className="text-indigo-500 dark:text-indigo-400" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Chunk {chunk.chunk_index}
                    </span>
                    {chunk.first_page > 0 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <BookOpen size={11} /> Trang {chunk.first_page}
                        </span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                        {chunk.text.length} ký tự
                    </span>
                </div>

                {/* Actions */}
                {!isEditing && !isMergeMode && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={onEdit} title="Sửa nội dung"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-all">
                            <Edit3 size={14} />
                        </button>
                        <button onClick={onSplit} title="Tách chunk"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/30 transition-all">
                            <Scissors size={14} />
                        </button>
                        <button onClick={onDelete} title="Xóa chunk"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-all">
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-4 py-3">
                {isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={editText}
                            onChange={e => onEditChange(e.target.value)}
                            rows={8}
                            className="w-full text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all leading-relaxed"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={onCancelEdit}
                                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5">
                                <X size={12} /> Hủy
                            </button>
                            <button onClick={onSave} disabled={saving || !editText.trim()}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95">
                                {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                Lưu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {expanded ? chunk.text : preview}
                            {needsExpand && !expanded && <span className="text-slate-400">...</span>}
                        </p>
                        {needsExpand && (
                            <button onClick={() => setExpanded(!expanded)}
                                className="mt-2 text-xs font-medium text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                                {expanded ? <><ChevronUp size={13} /> Thu gọn</> : <><ChevronDown size={13} /> Xem thêm</>}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentChunksPage() {
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();
    const { isLoggedIn, cookieReady } = useAuthStore();
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    }>();

    const [chunks, setChunks] = useState<Chunk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Split state
    const [splitChunk, setSplitChunk] = useState<Chunk | null>(null);
    const [splitting, setSplitting] = useState(false);

    // Merge state
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [mergeSelected, setMergeSelected] = useState<string[]>([]);
    const [merging, setMerging] = useState(false);

    const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const fetchChunks = useCallback(async () => {
        if (!isLoggedIn || !documentId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/upload/${documentId}/content`, {
                credentials: 'include',
                });
            if (!res.ok) throw new Error('Không thể tải danh sách chunks');
            const data = await res.json();
            setChunks(data.chunks);
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn, documentId, addToast]);

    useEffect(() => { fetchChunks(); }, [fetchChunks]);

    // ── Edit ──
    const handleSaveEdit = async (chunkId: string) => {
        if (!editText.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/upload/${documentId}/chunks/${chunkId}`, {
                credentials: 'include',
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: editText }),
            });
            if (!res.ok) throw new Error('Lưu thất bại');
            setChunks(prev => prev.map(c => c.chunk_id === chunkId ? { ...c, text: editText } : c));
            setEditingId(null);
            addToast('Đã lưu chunk', 'success');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await fetch(`${API}/upload/${documentId}/chunks/${deleteId}`, {
                credentials: 'include',
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Xóa thất bại');
            setChunks(prev => prev.filter(c => c.chunk_id !== deleteId));
            addToast('Đã xóa chunk', 'info');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    // ── Split ──
    const handleSplit = async (splitAt: number) => {
        if (!splitChunk) return;
        setSplitting(true);
        try {
            const res = await fetch(`${API}/upload/${documentId}/chunks/split`, {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunk_id: splitChunk.chunk_id, split_at: splitAt }),
            });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Tách thất bại'); }
            const data = await res.json();
            setChunks(prev => {
                const newChunks = prev.filter(c => c.chunk_id !== splitChunk.chunk_id);
                const inserted: Chunk[] = [
                    { ...splitChunk, text: data.chunk_a.text },
                    {
                        chunk_id: data.chunk_b.chunk_id,
                        chunk_index: splitChunk.chunk_index + 0.5,
                        text: data.chunk_b.text,
                        first_page: splitChunk.first_page,
                        source_file: splitChunk.source_file,
                    },
                ];
                return [...newChunks, ...inserted].sort((a, b) => a.chunk_index - b.chunk_index);
            });
            addToast('Đã tách chunk thành công', 'success');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setSplitting(false);
            setSplitChunk(null);
        }
    };

    // ── Merge ──
    const handleMerge = async () => {
        if (mergeSelected.length !== 2) return;
        setMerging(true);
        try {
            const res = await fetch(`${API}/upload/${documentId}/chunks/merge`, {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunk_id_a: mergeSelected[0], chunk_id_b: mergeSelected[1] }),
            });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Gộp thất bại'); }
            const data = await res.json();
            setChunks(prev => {
                const kept = prev.find(c => c.chunk_id === data.merged_chunk_id);
                const filtered = prev.filter(c => c.chunk_id !== data.deleted_chunk_id);
                return filtered.map(c => c.chunk_id === data.merged_chunk_id
                    ? { ...c, text: data.merged_text } : c
                );
            });
            addToast('Đã gộp 2 chunk thành công', 'success');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setMerging(false);
            setIsMergeMode(false);
            setMergeSelected([]);
        }
    };

    const toggleMergeSelect = (id: string) => {
        setMergeSelected(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : prev.length < 2 ? [...prev, id] : [prev[1], id]
        );
    };

    const filtered = chunks.filter(c =>
        search === '' || c.text.toLowerCase().includes(search.toLowerCase())
    );

    if (!isLoggedIn) return null;

    return (
        <>
            <ToastList toasts={toasts} />

            <AnimatePresence>
                {deleteId && (
                    <ConfirmModal
                        title="Xóa chunk này?"
                        description="Chunk sẽ bị xóa khỏi ChromaDB vĩnh viễn và không thể khôi phục."
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteId(null)}
                        loading={deleting}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {splitChunk && (
                    <SplitModal
                        chunk={splitChunk}
                        onConfirm={handleSplit}
                        onCancel={() => setSplitChunk(null)}
                        loading={splitting}
                    />
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900 transition-colors">

                {/* Header */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Menu size={22} />
                        </button>
                        <button onClick={() => navigate('/admin/records')}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="hidden lg:block min-w-0">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">Chỉnh sửa Chunks</h2>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{documentId}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Merge mode toggle */}
                        <button
                            onClick={() => { setIsMergeMode(!isMergeMode); setMergeSelected([]); }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-xl border transition-all
                                ${isMergeMode
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <Combine size={14} />
                            <span className="hidden sm:inline">{isMergeMode ? 'Hủy gộp' : 'Gộp chunk'}</span>
                        </button>

                        {/* Merge confirm */}
                        <AnimatePresence>
                            {isMergeMode && mergeSelected.length === 2 && (
                                <motion.button
                                    initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                                    onClick={handleMerge} disabled={merging}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-70 transition-all active:scale-95">
                                    {merging ? <RefreshCw size={13} className="animate-spin" /> : <Combine size={13} />}
                                    Gộp 2 chunk
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <button onClick={fetchChunks}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </header>

                {/* Merge mode hint */}
                <AnimatePresence>
                    {isMergeMode && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/40 px-6 py-2.5 flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                            <Combine size={15} />
                            Chọn đúng 2 chunk để gộp lại — đang chọn {mergeSelected.length}/2
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Toolbar */}
                <div className="px-4 lg:px-8 py-4 bg-white/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" placeholder="Tìm trong chunks..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm w-full border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Layers size={14} />
                        {isLoading ? '...' : `${filtered.length} chunks`}
                        {search && ` (lọc từ ${chunks.length})`}
                    </div>
                </div>

                {/* Chunks list */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-4xl mx-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
                                <RefreshCw size={28} className="animate-spin opacity-40" />
                                <p className="text-sm">Đang tải chunks...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
                                <FileText size={36} className="opacity-20" />
                                <p className="text-sm">{search ? 'Không tìm thấy chunk nào' : 'Tài liệu này chưa có chunk'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {filtered.map(chunk => (
                                        <ChunkCard
                                            key={chunk.chunk_id}
                                            chunk={chunk}
                                            isSelected={mergeSelected.includes(chunk.chunk_id)}
                                            onSelect={() => toggleMergeSelect(chunk.chunk_id)}
                                            onEdit={() => { setEditingId(chunk.chunk_id); setEditText(chunk.text); }}
                                            onDelete={() => setDeleteId(chunk.chunk_id)}
                                            onSplit={() => setSplitChunk(chunk)}
                                            isEditing={editingId === chunk.chunk_id}
                                            editText={editText}
                                            onEditChange={setEditText}
                                            onSave={() => handleSaveEdit(chunk.chunk_id)}
                                            onCancelEdit={() => setEditingId(null)}
                                            saving={saving}
                                            isMergeMode={isMergeMode}
                                            mergeSelected={mergeSelected.includes(chunk.chunk_id)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}