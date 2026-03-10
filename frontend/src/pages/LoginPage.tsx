
import React, { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, Mail, UserPlus } from 'lucide-react'
import axios, { AxiosError } from 'axios'
import logoImage from '../components/images/images.jpg';

// --- Định nghĩa kiểu dữ liệu ---
interface StatusState {
    success: boolean;
    message: string;
}

export default function LoginPage() {
    const navigate = useNavigate()

    // Quản lý trạng thái form
    const [isLoginMode, setIsLoginMode] = useState<boolean>(true) // True = Login, False = Register
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<StatusState | null>(null)

    // Hàm xử lý Submit (Dùng chung cho cả Đăng nhập & Đăng ký)
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setStatus(null)

        const formData = new FormData(e.currentTarget)
        const username = formData.get('username') as string
        const password = formData.get('password') as string

        try {
            if (isLoginMode) {
                // ================= XỬ LÝ ĐĂNG NHẬP =================
                const urlEncodedData = new URLSearchParams()
                if (username) urlEncodedData.append('username', username)
                if (password) urlEncodedData.append('password', password)

                const response = await axios.post('http://127.0.0.1:8000/auth/login', urlEncodedData, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })

                const { access_token, role } = response.data;
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('user_role', role);

                setStatus({ success: true, message: 'Đăng nhập thành công! Đang chuyển hướng...' })

                setTimeout(() => {
                    if (role === 'admin') navigate('/admin');
                    else navigate('/');
                }, 1000)

            } else {
                // ================= XỬ LÝ ĐĂNG KÝ =================
                const email = formData.get('email') as string

                // Lấy các trường (chỉ gửi nếu có giá trị)
                const payload: any = {
                    username,
                    email,
                    password
                };

                const full_name = (formData.get('full_name') as string || '').trim();
                const gender = (formData.get('gender') as string || '').trim();
                const date_of_birth = (formData.get('date_of_birth') as string || '').trim();
                const phone = (formData.get('phone') as string || '').trim();
                const address = (formData.get('address') as string || '').trim();

                if (full_name) payload.full_name = full_name;
                if (gender) payload.gender = gender;
                if (date_of_birth) payload.date_of_birth = date_of_birth;
                if (phone) payload.phone = phone;
                if (address) payload.address = address;

                await axios.post('http://127.0.0.1:8000/auth/register', payload)

                setStatus({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' })

                // Tự động chuyển về trang đăng nhập sau 1.5s
                setTimeout(() => {
                    setIsLoginMode(true)
                    setStatus(null)
                }, 1500)
            }
        } catch (error) {
            console.error("Lỗi:", error)
            let errorMsg = isLoginMode ? 'Tài khoản hoặc mật khẩu không chính xác!' : 'Đã có lỗi xảy ra khi đăng ký!'

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

    // Toggle chế độ Đăng nhập / Đăng ký
    const toggleMode = () => {
        setIsLoginMode(!isLoginMode)
        setStatus(null) // Xóa thông báo lỗi khi chuyển mode
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 font-sans text-slate-700 relative overflow-hidden">
            {/* --- NỀN TRANG TRÍ --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-300/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-300/20 rounded-full blur-[120px]" />
            </div>

            {/* --- CARD MAIN --- */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-white w-full max-w-5xl min-h-[600px] rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative z-10"
            >
                {/* ================= CỘT TRÁI: LOGO & THÔNG TIN ================= */}
                <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white text-center relative overflow-hidden">
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

                {/* ================= CỘT PHẢI: FORM ================= */}
                <div className="flex flex-col justify-center p-8 lg:p-14 bg-white relative max-h-screen overflow-y-auto custom-scrollbar">
                    <div className="lg:hidden flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full p-1 flex items-center justify-center">
                            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="mb-6 text-center lg:text-left">
                        <motion.h2
                            key={isLoginMode ? 'login' : 'register'}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-slate-800 mb-2"
                        >
                            {isLoginMode ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                        </motion.h2>
                        <p className="text-slate-500 text-sm font-medium">
                            {isLoginMode ? 'Chào mừng quay trở lại hệ thống quản trị.' : 'Đăng ký để trải nghiệm các tính năng của hệ thống.'}
                        </p>
                    </div>

                    {/* --- THÔNG BÁO STATUS --- */}
                    <div className="h-12 w-full relative mb-4">
                        <AnimatePresence>
                            {status && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className={`absolute inset-0 flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm text-sm font-semibold border ${status.success
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : 'bg-rose-50 text-rose-600 border-rose-200'
                                        }`}
                                >
                                    {status.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                    <span className="flex-1">{status.message}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ================= BẮT ĐẦU FORM (LƯỚI 2 CỘT) ================= */}
                    <form onSubmit={handleSubmit}>
                        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">

                            {/* --- Ô NHẬP TÊN ĐĂNG NHẬP (Luôn có) --- */}
                            <motion.div layout className={`space-y-1.5 ${isLoginMode ? 'col-span-1 sm:col-span-2' : 'col-span-1'}`}>
                                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Tên đăng nhập <span className="text-rose-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder={isLoginMode ? "Nhập tên đăng nhập..." : "VD: nguyenvan_a"}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                            </motion.div>

                            {/* --- Ô NHẬP EMAIL (Chỉ có khi Đăng ký) --- */}
                            <AnimatePresence>
                                {!isLoginMode && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout className="space-y-1.5 col-span-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase ml-1">Địa chỉ Email <span className="text-rose-500">*</span></label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="email@dthu.edu.vn"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                                required={!isLoginMode}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* --- Ô NHẬP MẬT KHẨU (Luôn có - luôn chiếm 2 cột) --- */}
                            <motion.div layout className="space-y-1.5 col-span-1 sm:col-span-2">
                                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Mật khẩu <span className="text-rose-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </motion.div>

                            {/* === CÁC TRƯỜNG MỚI (CHIA 3 CỘT KHI ĐĂNG KÝ) === */}
                            <AnimatePresence>
                                {!isLoginMode && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        layout
                                        className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden"
                                    >
                                        {/* Divider ngăn cách thông tin phụ */}
                                        <div className="col-span-1 sm:col-span-3 pt-2 pb-1 border-t border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thông tin cá nhân (Tùy chọn)</span>
                                        </div>

                                        {/* Họ và tên (Cột 1/3) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Họ và tên</label>
                                            <input
                                                type="text"
                                                name="full_name"
                                                placeholder="Nguyễn Văn A"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                            />
                                        </div>

                                        {/* Giới tính (Cột 2/3) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Giới tính</label>
                                            <select
                                                name="gender"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all text-slate-600"
                                            >
                                                <option value="">Chọn giới tính</option>
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                                <option value="Khác">Khác</option>
                                            </select>
                                        </div>

                                        {/* Ngày sinh (Cột 3/3) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Ngày sinh</label>
                                            <input
                                                type="date"
                                                name="date_of_birth"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all text-slate-600"
                                            />
                                        </div>

                                        {/* Số điện thoại (Chiếm full 3 cột - xuống dòng) */}
                                        <div className="space-y-1.5 sm:col-span-3">
                                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Số điện thoại</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                placeholder="0123456789"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                            />
                                        </div>

                                        {/* Địa chỉ (Chiếm full 3 cột) */}
                                        <div className="space-y-1.5 col-span-1 sm:col-span-3">
                                            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Địa chỉ</label>
                                            <textarea
                                                name="address"
                                                rows={2}
                                                placeholder="Số nhà, đường, phường, thành phố..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all resize-none min-h-[60px]"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* --- NÚT SUBMIT CHÍNH --- */}
                            <motion.div layout className="col-span-1 sm:col-span-2 pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-800 hover:shadow-blue-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
                                >
                                    {isLoading ? (
                                        <> <Loader2 size={18} className="animate-spin" /> ĐANG XỬ LÝ... </>
                                    ) : (
                                        <>
                                            {isLoginMode ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOÁN'}
                                            {isLoginMode ? <ArrowRight size={18} /> : <UserPlus size={18} />}
                                        </>
                                    )}
                                </button>
                            </motion.div>

                        </motion.div>
                    </form>

                    {/* --- NÚT CHUYỂN ĐỔI CHẾ ĐỘ (TOGGLE MODE) --- */}
                    <motion.div layout className="mt-6 text-center pb-4">
                        <p className="text-sm text-slate-500">
                            {isLoginMode ? "Bạn chưa có tài khoản? " : "Bạn đã có tài khoản? "}
                            <button
                                onClick={toggleMode}
                                type="button"
                                className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none"
                            >
                                {isLoginMode ? "Đăng ký ngay" : "Đăng nhập tại đây"}
                            </button>
                        </p>
                    </motion.div>

                    <div className="mt-auto text-center lg:hidden">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">© DTHU FLIC Center</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
