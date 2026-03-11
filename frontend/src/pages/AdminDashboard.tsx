import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom'; // Đổi từ next/navigation sang react-router-dom
import {
    Upload, FileText, FileSpreadsheet, File as FileIcon, Image as ImageIcon,
    Trash2, CheckCircle, RefreshCw, AlertCircle, Database,
    BrainCircuit, Search, LayoutDashboard, Users, Settings, FolderOpen,
    LogOut, Menu, X, ChevronsLeft, ChevronLeft, ChevronsRight, ChevronRight, Eye, EyeOff,
    XCircle, ArrowLeft, Share2, Download, Info, HardDrive, Calendar, ZoomIn, ZoomOut, RotateCw, RefreshCcw,
    Bot, Square, CheckSquare
} from 'lucide-react';
//import SidebarPage from './SidebarPage';

// Dùng React.lazy thay cho next/dynamic
//const PdfViewer = React.lazy(() => import('./PdfViewer'));
//const DocxViewer = React.lazy(() => import('./DocxViewer'));

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU ---
type DocStatus = 'queue' | 'uploading' | 'processing' | 'done' | 'error' | 'uploaded' | 'indexed';

interface DocumentItem {
    id: string;
    name: string;
    size: string;
    type: 'pdf' | 'docx' | 'xlsx' | 'image' | 'other';
    status: DocStatus;
    uploadProgress: number;
    uploadedAt: string;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ConvertedFile {
    id: string;
    originalName: string;
    convertedContent: string;
    convertedAt: string;
    status: 'pending' | 'vectorized' | 'failed';
}

export default function AdminDashboard() {
    const navigate = useNavigate();

    // --- KIỂM TRA ĐĂNG NHẬP ---
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    // --- STATE ---
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    //const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext<{
        isMobileMenuOpen: boolean;
        setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
    }>();

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string>("");
    const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
    const [activeTab, setActiveTab] = useState<'raw' | 'markdown'>('raw');

    // --- STATE ĐIỀU KHIỂN ZOOM/ROTATE ---
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);

    // --- LOGIC ZOOM/ROTATE ---
    const handleResetView = () => { setScale(1.0); setRotation(0); };
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    // State pagination Kho Dữ liệu
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [searchTerm, setSearchTerm] = useState('');

    // State pagination Kho Markdown
    const [mdItemsPerPage, setMdItemsPerPage] = useState(5);
    const [mdCurrentPage, setMdCurrentPage] = useState(1);
    const [mdPageInput, setMdPageInput] = useState('1');

    // Logic lọc và phân trang
    const filteredDocuments = documents.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
    const currentDocuments = filteredDocuments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const [selectedMdIds, setSelectedMdIds] = useState<string[]>([]);

    const handleSelectAllMd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const currentIds = currentMdFiles.map(f => f.id);
            const newSelected = Array.from(new Set([...selectedMdIds, ...currentIds]));
            setSelectedMdIds(newSelected);
        } else {
            const currentIds = currentMdFiles.map(f => f.id);
            setSelectedMdIds(prev => prev.filter(id => !currentIds.includes(id)));
        }
    };

    const handleSelectOneMd = (id: string) => {
        if (selectedMdIds.includes(id)) {
            setSelectedMdIds(prev => prev.filter(itemId => itemId !== id));
        } else {
            setSelectedMdIds(prev => [...prev, id]);
        }
    };

    const handleDeleteSelectedMd = () => {
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedMdIds.length} file đã chuyển đổi?`)) {
            const updated = convertedFiles.filter(f => !selectedMdIds.includes(f.id));
            setConvertedFiles(updated);
            localStorage.setItem('convertedFiles', JSON.stringify(updated));
            setSelectedMdIds([]);
            addToast(`Đã xóa ${selectedMdIds.length} file đã chuyển đổi`, 'info');
        }
    };

    // --- EFFECT ---
    useEffect(() => { setCurrentPage(1); setPageInput('1'); }, [searchTerm, itemsPerPage]);
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);
    useEffect(() => { setMdPageInput(mdCurrentPage.toString()); }, [mdCurrentPage]);

    useEffect(() => {
        const saved = localStorage.getItem('convertedFiles');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setConvertedFiles(parsed);
            } catch (e) {
                console.error('Error loading converted files:', e);
            }
        }
    }, []);

    // --- PAGINATION HANDLERS ---
    const paginate = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setPageInput(e.target.value);
    const handlePageInputSubmit = () => {
        const pageNumber = parseInt(pageInput);
        if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) paginate(pageNumber);
        else setPageInput(currentPage.toString());
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handlePageInputSubmit(); };

    // --- TOAST ---
    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // --- FETCH TÀI LIỆU TỪ FASTAPI ---
    useEffect(() => {
        if (token) fetchDocuments();
    }, [token]);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/admin/documents', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const serverDocs: DocumentItem[] = data.map((item: any) => ({
                    id: item.id.toString(),
                    name: item.filename,
                    size: 'Unknown', // Backend chưa lưu size, tạm để Unknown
                    type: getFileType(item.filename),
                    status: item.status,
                    uploadProgress: 100,
                    uploadedAt: new Date(item.created_at).toLocaleString('vi-VN')
                }));
                setDocuments(serverDocs);
            }
        } catch (error) {
            console.error("Lỗi fetch", error);
            addToast("Không thể kết nối server", 'error');
        }
    };

    // --- UPLOAD LÊN FASTAPI ---
    const uploadFile = async (docItem: DocumentItem, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setDocuments(prev => prev.map(d => d.id === docItem.id ? { ...d, uploadProgress: percentComplete } : d));
                }
            };
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    setDocuments(prev => prev.map(d => d.id === docItem.id ? { ...d, status: response.status || 'uploaded', uploadProgress: 100 } : d));
                    addToast(`Đã tải lên thành công: ${docItem.name}`, 'success');
                    resolve();
                } else {
                    setDocuments(prev => prev.map(d => d.id === docItem.id ? { ...d, status: 'error' } : d));
                    addToast(`Lỗi khi tải file: ${docItem.name}`, 'error');
                    reject(xhr.statusText);
                }
            };
            xhr.onerror = () => {
                setDocuments(prev => prev.map(d => d.id === docItem.id ? { ...d, status: 'error' } : d));
                addToast("Lỗi mạng, vui lòng thử lại", 'error');
                reject("Network Error");
            };
            xhr.open('POST', 'http://127.0.0.1:8000/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
    };

    const formatBytes = (bytes: number) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    };

    const getFileType = (fileName: string): DocumentItem['type'] => {
        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.pdf')) return 'pdf';
        if (lowerName.match(/\.(docx?|doc)$/)) return 'docx';
        if (lowerName.match(/\.(xlsx?|xls|csv)$/)) return 'xlsx';
        if (lowerName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
        return 'other';
    };

    const handleFiles = (files: FileList) => {
        const fileArray = Array.from(files);
        const newDocs: DocumentItem[] = fileArray.map(file => ({
            id: Math.random().toString(36).substr(2, 9), // ID tạm thời trên UI
            name: file.name,
            size: formatBytes(file.size),
            type: getFileType(file.name),
            status: 'queue',
            uploadProgress: 0,
            uploadedAt: new Date().toLocaleString('vi-VN')
        }));
        setDocuments(prev => [...newDocs, ...prev]);
        fileArray.forEach((file, index) => {
            const docItem = newDocs[index];
            setDocuments(prev => prev.map(d => d.id === docItem.id ? { ...d, status: 'uploading' } : d));
            uploadFile(docItem, file);
        });
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- ACTIONS TƯƠNG TÁC XÓA TRÊN BACKEND ---
    const handleDelete = async (id: string) => {
        const docToDelete = documents.find(d => d.id === id);
        if (!docToDelete) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/admin/documents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Lỗi xóa trên server");

            setDocuments(prev => prev.filter(d => d.id !== id));
            if (selectedDocument?.id === id) setSelectedDocument(null);
            setSelectedIds(prev => prev.filter(itemId => itemId !== id));
            addToast("Đã xóa tài liệu vĩnh viễn", 'info');
        } catch (error) {
            console.error("Lỗi xóa file", error);
            addToast("Không thể xóa file (Có thể do quyền hoặc lỗi mạng)", 'error');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const currentIds = currentDocuments.map(d => d.id);
            const newSelected = Array.from(new Set([...selectedIds, ...currentIds]));
            setSelectedIds(newSelected);
        } else {
            const currentIds = currentDocuments.map(d => d.id);
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(itemId => itemId !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleSendToAI = async () => {
        if (selectedIds.length === 0) return;
        setIsProcessing(true);
        addToast(`Tính năng AI xử lý hàng loạt đang được cập nhật!`, 'info');
        // TODO: Kết nối với pipeline người thứ 1
        setTimeout(() => { setIsProcessing(false); setSelectedIds([]); }, 1500);
    };

    const handleViewDocument = (id: string) => {
        const doc = documents.find(d => d.id === id);
        if (doc) setSelectedDocument(doc);
        else addToast("Không tìm thấy thông tin file", "error");
    };

    const handleVectorizeFile = async (id: string) => {
        const file = convertedFiles.find(f => f.id === id);
        if (!file) return;
        addToast(`Đang giả lập Vector hóa ${file.originalName}`, 'info');
    };

    const handleVectorizeAll = async () => {
        addToast('Đang gọi lệnh Vector hóa tất cả...', 'info');
    };

    const handleDeleteConverted = (id: string) => {
        const updated = convertedFiles.filter(f => f.id !== id);
        setConvertedFiles(updated);
        localStorage.setItem('convertedFiles', JSON.stringify(updated));
        addToast('Đã xóa file', 'info');
    };

    // --- LOGIC PHÂN TRANG CHO KHO MARKDOWN ---
    const totalMdPages = Math.ceil(convertedFiles.length / mdItemsPerPage);
    const currentMdFiles = convertedFiles.slice((mdCurrentPage - 1) * mdItemsPerPage, mdCurrentPage * mdItemsPerPage);

    const paginateMd = (page: number) => { if (page >= 1 && page <= totalMdPages) setMdCurrentPage(page); };
    const handleMdPageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setMdPageInput(e.target.value);
    const handleMdPageInputSubmit = () => {
        const pageNumber = parseInt(mdPageInput);
        if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalMdPages) paginateMd(pageNumber);
        else setMdPageInput(mdCurrentPage.toString());
    };
    const handleMdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleMdPageInputSubmit(); };

    if (!token) return null; // Tránh render nháy trước khi redirect

    return (
        // <div className="flex h-screen bg-slate-50 font-sans text-slate-700 overflow-hidden relative">
        //     {/* --- TOASTS --- */}
        //     <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        //         <AnimatePresence>
        //             {toasts.map(toast => (
        //                 <motion.div
        //                     key={toast.id}
        //                     initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
        //                     className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[300px] backdrop-blur-md ${toast.type === 'success' ? 'bg-white/90 border-green-200 text-green-700' : toast.type === 'error' ? 'bg-white/90 border-red-200 text-red-700' : 'bg-white/90 border-blue-200 text-blue-700'}`}
        //                 >
        //                     {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <XCircle size={20} /> : <AlertCircle size={20} />}
        //                     <span className="text-sm font-medium">{toast.message}</span>
        //                     <button onClick={() => removeToast(toast.id)} className="ml-auto opacity-50 hover:opacity-100"><X size={16} /></button>
        //                 </motion.div>
        //             ))}
        //         </AnimatePresence>
        //     </div>

        //     {/* Sidebar */}
        //     <SidebarPage
        //         isMobileOpen={isMobileMenuOpen}
        //         setIsMobileOpen={setIsMobileMenuOpen}
        //     //user={{ fullName: 'Admin', email: 'admin@dthu.edu.vn' }}
        //     />
        <>
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
                {/* --- HEADER --- */}
                {!selectedDocument && (
                    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 sticky top-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                            <h2 className="text-lg font-bold text-slate-800 hidden lg:block font-sans">Quản trị Tri thức</h2>
                        </div>
                        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }} className="text-sm flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors font-semibold">
                            Đăng xuất <LogOut size={16} />
                        </button>
                    </header>
                )}

                {/* --- CONTENT AREA --- */}
                <div className={`flex-1 overflow-hidden ${selectedDocument ? 'bg-slate-100' : 'p-4 lg:p-8 overflow-y-auto'}`}>
                    <AnimatePresence mode="wait">
                        {/* === DETAIL VIEW === */}
                        {selectedDocument ? (
                            <motion.div key="detail-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col bg-slate-50">
                                {/* Detail Header */}
                                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setSelectedDocument(null)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"><ArrowLeft size={20} /></button>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="cursor-pointer hover:text-blue-600" onClick={() => setSelectedDocument(null)}>Kho dữ liệu</span>
                                                <ChevronRight size={12} />
                                                <span>Chi tiết</span>
                                            </div>
                                            <h2 className="font-bold text-slate-800 text-sm sm:text-base truncate max-w-[200px] sm:max-w-md flex items-center gap-2">{selectedDocument.name}</h2>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(selectedDocument.type === 'pdf' || selectedDocument.type === 'image') && (
                                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mr-2 border border-slate-200">
                                                <button onClick={handleZoomOut} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all"><ZoomOut size={18} /></button>
                                                <span className="text-xs font-bold text-slate-500 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                                                <button onClick={handleZoomIn} className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all"><ZoomIn size={18} /></button>
                                                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                                <button onClick={handleRotate} className="p-1.5 text-slate-600 hover:bg-white hover:text-purple-600 rounded-md transition-all"><RotateCw size={18} /></button>
                                                <button onClick={handleResetView} className="p-1.5 text-slate-600 hover:bg-white hover:text-red-600 rounded-md transition-all"><RefreshCcw size={18} /></button>
                                            </div>
                                        )}
                                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                                        <button onClick={() => { handleDelete(selectedDocument.id); setSelectedDocument(null); }} className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-semibold"><Trash2 size={18} /><span className="hidden sm:inline">Xóa</span></button>
                                    </div>
                                </div>

                                {/* Detail Content */}
                                <div className="flex-1 flex overflow-hidden">
                                    <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex flex-col">
                                        <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-500">Đang tải trình duyệt xem file...</div>}>
                                            {selectedDocument.type === 'docx' ? (
                                                <div className="w-full h-full overflow-auto bg-slate-100">
                                                    {/* <DocxViewer fileUrl={`http://127.0.0.1:8000/api/files/${encodeURIComponent(selectedDocument.name)}`} /> */}
                                                </div>
                                            ) : selectedDocument.type === 'xlsx' ? (
                                                <div className="w-full h-full overflow-hidden bg-white">
                                                    {/* <XlsxViewer fileUrl={`http://127.0.0.1:8000/api/files/${encodeURIComponent(selectedDocument.name)}`} /> */}
                                                </div>
                                            ) : selectedDocument.type === 'pdf' ? (
                                                <div className="w-full h-full bg-slate-200 flex justify-center items-start relative">
                                                    {/* <PdfViewer fileUrl={`http://127.0.0.1:8000/api/files/${encodeURIComponent(selectedDocument.name)}`} scale={scale} rotation={rotation} onLoadSuccess={() => { }} /> */}
                                                </div>
                                            ) : (
                                                <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center">
                                                    <div className="w-full max-w-5xl bg-white rounded-xl shadow-sm min-h-full border border-slate-300/50 overflow-hidden flex items-center justify-center text-slate-400 p-10">
                                                        <FileIcon size={64} className="mb-4 opacity-50" />
                                                        <p className="text-lg font-medium">Bạn có thể tạo component view riêng cho file này.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </Suspense>
                                    </div>

                                    {/* Sidebar Info */}
                                    <div className="w-80 bg-white border-l border-slate-200 flex-col shrink-0 hidden xl:flex">
                                        <div className="p-5 border-b border-slate-100">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info size={18} className="text-blue-600" /> Thông tin tệp</h3>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-500"><HardDrive size={18} /></div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Kích thước</p>
                                                        <p className="text-sm font-semibold text-slate-700">{selectedDocument.size}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-500"><Calendar size={18} /></div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ngày tải lên</p>
                                                        <p className="text-sm font-semibold text-slate-700">{selectedDocument.uploadedAt}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* === DASHBOARD LIST VIEW === */
                            <motion.div key="dashboard-view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="max-w-6xl mx-auto">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                        {/* LEFT COLUMN */}
                                        <div className="lg:col-span-4 space-y-4 order-1">
                                            {/* Stats */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={40} className="text-green-600" /></div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đã Index</span>
                                                    <div className="text-3xl font-bold text-slate-800">{documents.filter(d => d.status === 'indexed' || d.status === 'done').length}</div>
                                                    <div className="text-xs text-green-600 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Hoạt động</div>
                                                </div>
                                                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><RefreshCw size={40} className="text-blue-600" /></div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đang xử lý</span>
                                                    <div className="text-3xl font-bold text-slate-800">{documents.filter(d => d.status === 'processing').length}</div>
                                                    <div className="text-xs text-blue-600 font-bold flex items-center gap-1">{documents.some(d => d.status === 'processing') ? <><span className="animate-spin"><RefreshCw size={10} /></span> Đang chạy</> : <><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Chờ lệnh</>}</div>
                                                </div>
                                            </div>

                                            {/* Upload Box */}
                                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={18} className="text-blue-600" /> Tải tài liệu mới</h3>
                                                </div>
                                                <div className="p-6">
                                                    <div
                                                        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                                                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.docx,.xlsx,.jpg,.png" onChange={onFileSelect} />
                                                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm"><Upload size={28} strokeWidth={2} /></div>
                                                        <p className="text-sm font-bold text-slate-700">Click hoặc Kéo thả file</p>
                                                        <p className="text-xs text-slate-400 mt-2 px-4">Hỗ trợ: PDF, Docx, Excel, Ảnh</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI Info */}
                                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-lg shadow-indigo-200 text-white p-6 relative overflow-hidden">
                                                <BrainCircuit className="absolute -bottom-4 -right-4 text-white opacity-10" size={120} />
                                                <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><Database size={18} className="text-indigo-200" /> Pipeline AI</h4>
                                                <p className="text-sm text-indigo-100 leading-relaxed mb-4 opacity-90">Hệ thống tự động trích xuất, vector hóa và lưu trữ kiến thức.</p>
                                                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                                                    <span className="bg-white/20 px-2 py-1 rounded">Kreuzberg OCR</span>
                                                    <span className="bg-white/20 px-2 py-1 rounded">ChromaDB</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: File List */}
                                        <div className="lg:col-span-8 flex flex-col h-full min-h-[550px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden order-2">
                                            {/* --- TAB CHUYỂN ĐỔI --- */}
                                            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2 shrink-0">
                                                <button
                                                    onClick={() => setActiveTab('raw')}
                                                    className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'raw' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    Tài liệu tải lên
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('markdown')}
                                                    className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'markdown' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    Kho Markdown
                                                    {convertedFiles.length > 0 && <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">{convertedFiles.length}</span>}
                                                </button>
                                            </div>

                                            {activeTab === 'raw' ? (
                                                <div className="flex flex-col flex-1 overflow-hidden">
                                                    {/* Toolbar */}
                                                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white sticky top-0 z-10">
                                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                                            <h3 className="font-bold text-slate-800">Kho dữ liệu gốc</h3>
                                                            {selectedIds.length > 0 && (
                                                                <motion.button initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={handleSendToAI} disabled={isProcessing} className={`flex items-center gap-2 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow-md transition-colors ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                                                    {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Bot size={16} />}
                                                                    {isProcessing ? 'Đang xử lý...' : `Gửi AI chuyển đổi (${selectedIds.length})`}
                                                                </motion.button>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                                            <div className="relative w-full sm:w-56">
                                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-slate-50 focus:bg-white" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* List Items */}
                                                    <div className="flex-1 overflow-y-auto p-2">
                                                        <AnimatePresence>
                                                            {currentDocuments.map((doc) => (
                                                                <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => handleViewDocument(doc.id)} className={`group flex items-center p-3 rounded-2xl border transition-all mb-2 cursor-pointer ${selectedIds.includes(doc.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-md'}`}>
                                                                    <div className="w-8 flex justify-center mr-4" onClick={(e) => e.stopPropagation()}>
                                                                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" checked={selectedIds.includes(doc.id)} onChange={() => handleSelectOne(doc.id)} />
                                                                    </div>
                                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-50 mr-4 border border-slate-100 shrink-0">
                                                                        {doc.type === 'pdf' ? <FileText size={20} className="text-red-500" /> : doc.type === 'docx' ? <FileText size={20} className="text-blue-600" /> : <FileIcon size={20} className="text-slate-500" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 mr-4">
                                                                        <h4 className="text-sm font-bold text-slate-700 truncate">{doc.name}</h4>
                                                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                                                                            <span className={`px-2 py-0.5 rounded font-bold ${doc.status === 'done' || doc.status === 'indexed' ? 'bg-green-100 text-green-700' : doc.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{doc.status === 'done' || doc.status === 'indexed' ? 'Đã xử lý' : doc.status === 'processing' ? 'Đang trích xuất' : 'Mới tải lên'}</span>
                                                                            <span className="hidden sm:inline">{doc.uploadedAt}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Bạn có chắc muốn xóa file này không?')) handleDelete(doc.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Xóa file"><Trash2 size={18} /></button>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10">
                                                    <Database size={48} className="mb-4 opacity-20" />
                                                    <p className="text-sm">Trang quản lý nội dung Markdown đang được tích hợp.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
            {/* </div > */}
        </>
    );
}