import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);

        try {
            await axios.post('/auth/forgot-password', { email });
            // Cập nhật thông báo thân thiện hơn
            setStatus({ success: true, message: 'Link khôi phục mật khẩu đã được gửi! Bạn kiểm tra hộp thư đến (và cả thư rác) nhé.' });
        } catch (error: any) {
            // Cập nhật thông báo lỗi thân thiện hơn
            const errorMsg = error.response?.data?.detail || 'Ôi, có lỗi hệ thống mất rồi. Bạn vui lòng thử lại sau nha.';
            setStatus({ success: false, message: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 font-sans">
            <div className="bg-white/90 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl p-8 border border-white/20">
                <button onClick={() => navigate('/login')} className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Quay lại đăng nhập
                </button>

                {/* Phần tiêu đề được viết lại cho gần gũi */}
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Quên Mật Khẩu?</h2>
                <p className="text-sm text-gray-500 text-center mb-8">
                    Đừng lo lắng! Chỉ cần nhập email bạn đã đăng ký, chúng mình sẽ gửi link đặt lại mật khẩu cho bạn ngay.
                </p>

                {status && (
                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${status.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {status.success ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                        <p className="text-sm font-medium">{status.message}</p>
                    </div>
                )}

                {!status?.success && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">Email của bạn <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your.email@dthu.edu.vn"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                                    required
                                />
                            </div>
                        </div>
                        {/* Đã sửa màu nút thành xanh dương (bg-blue-600) */}
                        <button
                            type="submit"
                            disabled={isLoading || !email}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Gửi yêu cầu'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}