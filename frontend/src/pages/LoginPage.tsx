import React, { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff,
    CheckCircle, X
} from 'lucide-react'
import axios from 'axios'
import api from '@/lib/api'
import logoImage from '../components/images/images.jpg';
import { useAuthStore } from '@/store/authStore';

interface StatusState {
    success: boolean;
    message: string;
}

export default function LoginPage() {
    const navigate = useNavigate()
    const authLogin = useAuthStore((s) => s.login);
    const authInit = useAuthStore((s) => s.init);

    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<StatusState | null>(null)

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (status) {
            timer = setTimeout(() => setStatus(null), 8000);
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [status]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setStatus(null)

        const submitData = new FormData(e.currentTarget)
        const username = submitData.get('username') as string
        const password = submitData.get('password') as string

        try {
            const urlEncodedData = new URLSearchParams()
            if (username) urlEncodedData.append('username', username)
            if (password) urlEncodedData.append('password', password)

            const response = await api.post('/auth/login', urlEncodedData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })

            const { role, username: returnedUsername } = response.data;
            authLogin(role, returnedUsername ?? username);
            await authInit();

            setStatus({ success: true, message: 'Đăng nhập thành công! Đang chuyển hướng...' })

            setTimeout(() => {
                if (role === 'admin') navigate('/admin/analytics');
                else if (role === 'staff') navigate('/admin/records');
                else navigate('/');
            }, 1200)

        } catch (error) {
            console.error("Lỗi:", error)
            let errorMsg = 'Tài khoản hoặc mật khẩu không chính xác!'
            if (axios.isAxiosError(error) && error.response?.data?.detail) {
                errorMsg = error.response.data.detail
            }
            setStatus({ success: false, message: errorMsg })
        } finally {
            setIsLoading(false)
        }
    }

    const handleGuestLogin = () => {
        localStorage.removeItem('user_role');
        navigate('/');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 p-4 font-sans relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <AnimatePresence>
                {status && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center relative"
                        >
                            <button
                                onClick={() => setStatus(null)}
                                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${status.success ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'}`}>
                                {status.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">
                                {status.success ? 'Thành công!' : 'Thông báo'}
                            </h3>
                            <p className="text-slate-600 text-sm mb-6">{status.message}</p>
                            <button
                                onClick={() => setStatus(null)}
                                className={`w-full py-2.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 ${status.success ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}
                            >
                                {status.success ? 'Đang xử lý...' : 'Đóng'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-white/90 backdrop-blur-xl w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">

                    {/* Left panel */}
                    <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#312e81] text-white text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.dthu.edu.vn/images/slider/02.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 to-transparent"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-28 h-28 bg-white rounded-full p-2 shadow-xl mb-6 flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                                <img src={logoImage} alt="Logo" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <h3 className="text-sm font-bold tracking-[0.2em] text-sky-200 uppercase mb-2">Trường Đại Học Đồng Tháp</h3>
                            <h2 className="text-2xl font-extrabold leading-snug mb-8 text-white uppercase border-b-2 border-sky-400/30 pb-6 w-full max-w-xs mx-auto">
                                Trung Tâm <br /> Ngoại Ngữ & Tin Học
                            </h2>
                            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
                                <p className="text-sm font-medium text-sky-100">
                                    Hệ thống Quản lý Chatbot & Hồ sơ quản lý
                                </p>
                            </div>
                        </div>
                        <div className="absolute bottom-6 text-[10px] text-sky-300/60 uppercase tracking-widest">
                            © Dong Thap University
                        </div>
                    </div>

                    {/* Right panel - Login only */}
                    <div className="p-8 lg:p-12 bg-white flex flex-col justify-center">
                        <div className="max-w-sm mx-auto w-full">

                            <div className="lg:hidden flex justify-center mb-6">
                                <div className="w-16 h-16 bg-sky-50 rounded-full p-1 flex items-center justify-center">
                                    <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            </div>

                            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-1 text-center">Đăng Nhập</h2>
                                <p className="text-sm text-gray-500 text-center">Vui lòng nhập thông tin tài khoản</p>
                            </motion.div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                        Tên đăng nhập <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-600 transition-colors" />
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="Nhập tên đăng nhập..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-600 focus:bg-white transition-all placeholder-gray-400"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                        Mật khẩu <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-600 transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-600 focus:bg-white transition-all placeholder-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-sky-200 hover:shadow-xl hover:shadow-sky-300 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>Đăng Nhập <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </form>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 text-center"
                            >
                                <div className="relative flex items-center py-3">
                                    <div className="flex-grow border-t border-gray-200"></div>
                                    <span className="flex-shrink-0 mx-4 text-xs text-gray-400 font-semibold tracking-wide">HOẶC</span>
                                    <div className="flex-grow border-t border-gray-200"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGuestLogin}
                                    className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Tiếp tục mà không cần đăng nhập
                                    <ArrowRight size={16} className="opacity-70" />
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    )
}
