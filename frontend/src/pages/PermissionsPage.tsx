import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useOutletContext } from 'react-router-dom';
import {
    Shield, Users, RotateCcw, ChevronDown, ChevronUp,
    Menu, Search, AlertTriangle, CheckCircle2, Info,
    FolderOpen, HelpCircle, ThumbsUp, BarChart3,
    SlidersHorizontal, UserCog, Lock, Unlock, Sparkles
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface FeatureMeta {
    key: string;
    label: string;
    description: string;
    role_defaults: { admin: boolean; staff: boolean; user: boolean };
}

interface UserPermissionRow {
    user_id: number;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    is_active: boolean;
    effective_permissions: Record<string, boolean>;
    has_overrides: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const FEATURE_ICONS: Record<string, React.ElementType> = {
    records:      FolderOpen,
    faq:          HelpCircle,
    feedback:     ThumbsUp,
    analytics:    BarChart3,
    bot_settings: SlidersHorizontal,
    accounts:     UserCog,
};

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500',
];

const API = '';

function getInitials(name?: string | null, username?: string) {
    const src = name || username || '?';
    return src.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColorClass(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

// ── Sub-components ─────────────────────────────────────────────────────────

function Avatar({ user, size = 'md' }: { user: UserPermissionRow; size?: 'sm' | 'md' }) {
    const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    if (user.avatar_url) {
        return <img src={`${API}${user.avatar_url}`} alt="" className={`${sz} rounded-full object-cover shrink-0`} />;
    }
    return (
        <div className={`${sz} ${avatarColorClass(user.user_id)} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
            {getInitials(user.full_name, user.username)}
        </div>
    );
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex items-center w-11 h-6 rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0
                ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <span className={`absolute w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[2px]'}`} />
        </button>
    );
}

function OverrideBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50">
            <Sparkles size={10} /> Tuỳ chỉnh
        </span>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PermissionsPage() {
    const { setIsMobileOpen } = useOutletContext<any>();

    const [features, setFeatures] = useState<FeatureMeta[]>([]);
    const [users, setUsers] = useState<UserPermissionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [saving, setSaving] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
    const [localPerms, setLocalPerms] = useState<Record<number, Record<string, boolean>>>({});

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [fRes, uRes] = await Promise.all([
                api.get(`${API}/permissions/features`),
                api.get(`${API}/permissions/users`),
            ]);
            setFeatures(fRes.data);
            setUsers(uRes.data);
            const lp: Record<number, Record<string, boolean>> = {};
            for (const u of uRes.data as UserPermissionRow[]) {
                lp[u.user_id] = { ...u.effective_permissions };
            }
            setLocalPerms(lp);
        } catch {
            showToast('Không thể tải dữ liệu', 'err');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const togglePerm = (userId: number, featureKey: string, value: boolean) => {
        setLocalPerms(prev => ({ ...prev, [userId]: { ...prev[userId], [featureKey]: value } }));
    };

    const saveUser = async (userId: number) => {
        setSaving(userId);
        try {
            await api.put(`${API}/permissions/users/${userId}`, { permissions: localPerms[userId] });
            await load();
            showToast('Đã lưu phân quyền thành công');
            setExpandedId(null);
        } catch (e: any) {
            showToast(e?.response?.data?.detail || 'Lưu thất bại', 'err');
        } finally {
            setSaving(null);
        }
    };

    const resetUser = async (userId: number, username: string) => {
        if (!confirm(`Reset quyền của "${username}" về mặc định theo role?`)) return;
        setSaving(userId);
        try {
            await api.delete(`${API}/permissions/users/${userId}`);
            await load();
            showToast(`Đã reset quyền của ${username} về mặc định`);
        } catch {
            showToast('Reset thất bại', 'err');
        } finally {
            setSaving(null);
        }
    };

    const isDirty = (user: UserPermissionRow) => {
        const local = localPerms[user.user_id];
        if (!local) return false;
        return features.some(f => local[f.key] !== user.effective_permissions[f.key]);
    };

    const filtered = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase())
    );

    const staffUsers = filtered.filter(u => u.role === 'staff');
    const adminUsers = filtered.filter(u => u.role === 'admin');

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Đang tải...
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0d0d0d]">

            {/* Header */}
            <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0">
                <div className="flex items-center gap-3 mb-1">
                    <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-[#2a2a2a]">
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                            <Shield size={16} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Phân quyền nhân viên</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Quản lý quyền truy cập từng chức năng cho từng tài khoản</p>
                        </div>
                    </div>
                </div>

                {/* Info banner */}
                <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                    <Info size={14} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Quyền mặc định nhân viên:</span> Tài liệu, FAQ, Phản hồi.
                        Bạn có thể <span className="font-semibold text-blue-600 dark:text-blue-400">mở thêm</span> hoặc <span className="font-semibold text-red-500 dark:text-red-400">thu hồi</span> từng quyền riêng lẻ cho mỗi người.
                        Thay đổi chỉ có hiệu lực sau khi nhấn <span className="font-semibold text-slate-800 dark:text-slate-100">Lưu</span>.
                    </p>
                </div>

                {/* Search */}
                <div className="relative mt-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm theo tên hoặc username..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">

                {/* Staff */}
                <SectionLabel icon={<Users size={13} />} label="Nhân viên" count={staffUsers.length} color="text-amber-500" />
                {staffUsers.length === 0
                    ? <EmptyState text="Không có nhân viên nào" />
                    : (
                        <div className="rounded-xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden bg-white dark:bg-[#141414]">
                            {staffUsers.map((u, i) => (
                                <UserRow
                                    key={u.user_id}
                                    user={u}
                                    features={features}
                                    localPerms={localPerms[u.user_id] || u.effective_permissions}
                                    expanded={expandedId === u.user_id}
                                    onToggleExpand={() => setExpandedId(expandedId === u.user_id ? null : u.user_id)}
                                    onTogglePerm={togglePerm}
                                    onSave={saveUser}
                                    onReset={resetUser}
                                    saving={saving === u.user_id}
                                    dirty={isDirty(u)}
                                    isLast={i === staffUsers.length - 1}
                                />
                            ))}
                        </div>
                    )
                }

                {/* Admin */}
                <SectionLabel icon={<Shield size={13} />} label="Quản trị viên" count={adminUsers.length} color="text-blue-500" className="mt-7" />
                {adminUsers.length === 0
                    ? <EmptyState text="Không có admin nào" />
                    : (
                        <div className="rounded-xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden bg-white dark:bg-[#141414]">
                            {adminUsers.map((u, i) => (
                                <UserRow
                                    key={u.user_id}
                                    user={u}
                                    features={features}
                                    localPerms={localPerms[u.user_id] || u.effective_permissions}
                                    expanded={expandedId === u.user_id}
                                    onToggleExpand={() => setExpandedId(expandedId === u.user_id ? null : u.user_id)}
                                    onTogglePerm={togglePerm}
                                    onSave={saveUser}
                                    onReset={resetUser}
                                    saving={saving === u.user_id}
                                    dirty={isDirty(u)}
                                    isLast={i === adminUsers.length - 1}
                                    readOnly
                                />
                            ))}
                        </div>
                    )
                }
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border
                            ${toast.type === 'ok'
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            }`}
                    >
                        {toast.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── UserRow ────────────────────────────────────────────────────────────────

interface RowProps {
    user: UserPermissionRow;
    features: FeatureMeta[];
    localPerms: Record<string, boolean>;
    expanded: boolean;
    onToggleExpand: () => void;
    onTogglePerm: (uid: number, key: string, val: boolean) => void;
    onSave: (uid: number) => void;
    onReset: (uid: number, name: string) => void;
    saving: boolean;
    dirty: boolean;
    isLast: boolean;
    readOnly?: boolean;
}

function UserRow({ user, features, localPerms, expanded, onToggleExpand, onTogglePerm, onSave, onReset, saving, dirty, isLast, readOnly = false }: RowProps) {
    const allowedCount = Object.values(localPerms).filter(Boolean).length;

    return (
        <div className={!isLast ? 'border-b border-slate-100 dark:border-[#232323]' : ''}>

            {/* Row header */}
            <div
                onClick={onToggleExpand}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e1e1e] transition-colors"
            >
                <Avatar user={user} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {user.full_name || user.username}
                        </span>
                        {user.full_name && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">@{user.username}</span>
                        )}
                        {user.has_overrides && <OverrideBadge />}
                        {!user.is_active && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">
                                Đã khóa
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {readOnly ? 'Quản trị viên — toàn quyền' : `${allowedCount}/${features.length} chức năng được phép`}
                    </p>
                </div>

                {/* Quick icon toggles (chỉ hiện khi chưa expand, không phải readOnly) */}
                {!expanded && !readOnly && (
                    <div className="hidden sm:flex gap-1.5">
                        {features.map(f => {
                            const Icon = FEATURE_ICONS[f.key] || Shield;
                            const on = localPerms[f.key];
                            return (
                                <button
                                    key={f.key}
                                    onClick={e => { e.stopPropagation(); onTogglePerm(user.user_id, f.key, !on); }}
                                    title={f.label}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border-none cursor-pointer
                                        ${on
                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                            : 'bg-slate-100 dark:bg-[#2a2a2a] text-slate-400 dark:text-slate-500'
                                        }`}
                                >
                                    <Icon size={13} />
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    {dirty && !readOnly && (
                        <span className="text-[11px] text-amber-500 dark:text-amber-400 font-semibold">● Chưa lưu</span>
                    )}
                    {expanded
                        ? <ChevronUp size={15} className="text-slate-400 dark:text-slate-500" />
                        : <ChevronDown size={15} className="text-slate-400 dark:text-slate-500" />
                    }
                </div>
            </div>

            {/* Expanded panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-slate-100 dark:border-[#232323]">
                            {readOnly ? (
                                <div className="flex items-center gap-2 py-4 text-sm text-slate-400 dark:text-slate-500">
                                    <Lock size={13} /> Quản trị viên có toàn quyền — không thể chỉnh sửa.
                                </div>
                            ) : (
                                <>
                                    <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4 mb-2">
                                        Chức năng có thể truy cập
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {features.map(f => {
                                            const Icon = FEATURE_ICONS[f.key] || Shield;
                                            const on = localPerms[f.key];
                                            const defaultVal = f.role_defaults['staff' as keyof typeof f.role_defaults];
                                            const isOverridden = on !== defaultVal;

                                            return (
                                                <div
                                                    key={f.key}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1e1e1e] transition-colors"
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                                        ${on
                                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                                            : 'bg-slate-100 dark:bg-[#252525] text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                        <Icon size={15} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{f.label}</span>
                                                            {isOverridden && (
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                                                                    ${on
                                                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                                    }`}>
                                                                    {on ? '+Thêm' : '−Thu hồi'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{f.description}</p>
                                                    </div>
                                                    <Toggle checked={on} onChange={v => onTogglePerm(user.user_id, f.key, v)} />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2.5 justify-end mt-4 flex-wrap">
                                        <button
                                            onClick={() => onReset(user.user_id, user.username)}
                                            disabled={saving}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            <RotateCcw size={13} /> Reset về mặc định
                                        </button>
                                        <button
                                            onClick={() => onSave(user.user_id)}
                                            disabled={saving || !dirty}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white border-none transition-colors
                                                ${saving || !dirty
                                                    ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
                                                    : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                                                }`}
                                        >
                                            {saving
                                                ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                                                : <><Unlock size={13} /> Lưu thay đổi</>
                                            }
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SectionLabel({ icon, label, count, color, className = '' }: { icon: React.ReactNode; label: string; count: number; color: string; className?: string }) {
    return (
        <div className={`flex items-center gap-2 mb-2.5 mt-5 ${className}`}>
            <span className={color}>{icon}</span>
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color} bg-current/10`}
                style={{ background: 'currentColor', opacity: 1 }}>
                <span className={`${color}`}>{count}</span>
            </span>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">{text}</p>;
}