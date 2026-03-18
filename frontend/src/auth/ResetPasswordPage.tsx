import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); // Lấy token từ URL

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setStatus({ success: false, message: 'Mật khẩu xác nhận không khớp!' });
            return;
        }

        setIsLoading(true);
        setStatus(null);

        try {
            await axios.post('http://127.0.0.1:8000/auth/reset-password', {
                token: token,
                new_password: newPassword
            });
            setStatus({ success: true, message: 'Đặt lại mật khẩu thành công! Chuyển hướng về đăng nhập...' });
            setTimeout(() => navigate('/login'), 2500);
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Token không hợp lệ hoặc đã hết hạn!';
            setStatus({ success: false, message: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center p-4">
                <p className="text-rose-500 font-medium bg-rose-50 p-4 rounded-xl">Đường dẫn không hợp lệ. Thiếu token xác thực.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 p-4 font-sans">
            <div className="bg-white/90 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl p-8 border border-white/20">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Tạo Mật Khẩu Mới</h2>
                <p className="text-sm text-gray-500 text-center mb-8">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>

                {status && (
                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${status.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {status.success ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                        <p className="text-sm font-medium">{status.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">Mật khẩu mới</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-600 transition-all"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">Xác nhận mật khẩu mới</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-600 transition-all"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !newPassword || !confirmPassword}
                        className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-sky-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Đổi mật khẩu'}
                    </button>
                </form>
            </div>
        </div>
    );
}