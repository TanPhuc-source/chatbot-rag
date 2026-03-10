import React, { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'
import axios, { AxiosError } from 'axios'
import logoImage from '../components/images/images.jpg';

// --- Định nghĩa kiểu dữ liệu ---
interface SubmitButtonProps {
    isLoading: boolean;
}

interface StatusState {
    success: boolean;
    message: string;
}

// --- Component Nút Submit ---
function SubmitButton({ isLoading }: SubmitButtonProps) {
    return (
        <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-800 hover:shadow-blue-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide mt-2"
        >
            {isLoading ? (
                <> <Loader2 size={18} className="animate-spin" /> ĐANG XỬ LÝ... </>
            ) : (
                <> ĐĂNG NHẬP <ArrowRight size={18} /> </>
            )}
        </button>
    )
}

// --- Trang Login Chính ---
export default function LoginPage() {
    const navigate = useNavigate()

    // Quản lý trạng thái form
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<StatusState | null>(null)

    // Hàm xử lý đăng nhập gọi API FastAPI
    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setStatus(null)

        // Lấy dữ liệu từ các thẻ input
        const formData = new FormData(e.currentTarget)
        const identifier = formData.get('identifier') as string
        const password = formData.get('password') as string

        // FastAPI yêu cầu OAuth2 với format x-www-form-urlencoded
        const urlEncodedData = new URLSearchParams()
        if (identifier) urlEncodedData.append('username', identifier)
        if (password) urlEncodedData.append('password', password)

        try {
            const response = await axios.post('http://127.0.0.1:8000/login', urlEncodedData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            // console.log("DỮ LIỆU SERVER TRẢ VỀ LÀ:", response.data); // Thêm dòng này

            // Đăng nhập thành công: Lấy cả token và role từ server trả về
            const { access_token, role } = response.data;

            // Lưu vào localStorage
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_role', role); // Lưu thêm role để tái sử dụng sau này

            setStatus({ success: true, message: 'Đăng nhập thành công! Đang chuyển hướng...' })

            // Chuyển hướng dựa trên phân quyền
            setTimeout(() => {
                if (role === 'admin') {
                    navigate('/admin'); // Admin vào Dashboard
                } else {
                    navigate('/');      // User thường vào trang Chatbot
                }
            }, 1000)

        } catch (error) {
            console.error("Lỗi đăng nhập:", error)

            // Xử lý lỗi an toàn với TypeScript
            let errorMsg = 'Tài khoản hoặc mật khẩu không chính xác!'
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<{ detail: string }>
                if (axiosError.response?.data?.detail) {
                    errorMsg = axiosError.response.data.detail
                }
            }

            setStatus({ success: false, message: errorMsg })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 font-sans text-slate-700 relative overflow-hidden">
            {/* --- NỀN TRANG TRÍ --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-300/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-300/20 rounded-full blur-[120px]" />
            </div>

            {/* --- CARD LOGIN CHÍNH --- */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-white w-full max-w-5xl min-h-[600px] rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative z-10"
            >
                {/* ================= CỘT TRÁI: LOGO & THÔNG TIN ================= */}
                <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white text-center relative">
                    <div className="absolute inset-0 bg-[url('https://www.dthu.edu.vn/images/slider/02.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-28 h-28 bg-white rounded-full p-2 shadow-xl mb-6 flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                            <img src={logoImage} alt="Logo" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <h3 className="text-sm font-bold tracking-[0.2em] text-blue-200 uppercase mb-2">Trường Đại Học Đồng Tháp</h3>
                        <h2 className="text-2xl font-extrabold leading-snug mb-8 text-white uppercase border-b-2 border-blue-400/30 pb-6 w-full max-w-xs mx-auto">
                            Trung Tâm <br /> Ngoại Ngữ & Tin Học
                        </h2>
                        <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
                            <p className="text-sm font-medium text-blue-100">
                                Hệ thống Quản lý Chatbot & Hồ sơ quản lý
                            </p>
                        </div>
                    </div>
                    <div className="absolute bottom-6 text-[10px] text-blue-300/60 uppercase tracking-widest">
                        © Dong Thap University
                    </div>
                </div>

                {/* ================= CỘT PHẢI: FORM ĐĂNG NHẬP ================= */}
                <div className="flex flex-col justify-center p-8 lg:p-16 bg-white relative">
                    <div className="lg:hidden flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full p-1 flex items-center justify-center">
                            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Đăng Nhập</h2>
                        <p className="text-slate-500 text-sm font-medium">Chào mừng quay trở lại hệ thống quản trị.</p>
                    </div>

                    {/* Form action */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Tài khoản / Email</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    name="identifier"
                                    placeholder="admin@dthu.edu.vn"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Mật khẩu</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Thông báo lỗi/thành công */}
                        {status && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`absolute top-4 left-0 right-0 mx-auto w-max z-50 flex items-center gap-3 px-5 py-2.5 rounded-full shadow-xl text-sm font-semibold transition-all ${status.success ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                                    }`}
                            >
                                {status.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span>{status.message}</span>
                            </motion.div>
                        )}

                        <div className="pt-2">
                            <SubmitButton isLoading={isLoading} />
                        </div>
                    </form>

                    <div className="mt-auto pt-8 text-center lg:hidden">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">© DTHU FLIC Center</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}