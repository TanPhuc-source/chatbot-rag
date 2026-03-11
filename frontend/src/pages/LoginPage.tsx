import React, { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff,
    CheckCircle, Mail, Phone, MapPin, Heart, X, Calendar
} from 'lucide-react'
import axios, { AxiosError } from 'axios'
import logoImage from '../components/images/images.jpg';

// --- Định nghĩa kiểu dữ liệu ---
interface StatusState {
    success: boolean;
    message: string;
}

interface FormDataState {
    username: string;
    email: string;
    password: string;
    full_name: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    address: string;
}

export default function LoginPage() {
    const navigate = useNavigate()

    // Quản lý trạng thái form
    const [isLoginMode, setIsLoginMode] = useState<boolean>(true)
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<StatusState | null>(null)
    const [currentStep, setCurrentStep] = useState<number>(1)
    const [agreeTerms, setAgreeTerms] = useState<boolean>(false)
    const [formData, setFormData] = useState<FormDataState>({
        username: '', email: '', password: '', full_name: '',
        gender: '', date_of_birth: '', phone: '', address: ''
    })

    // --- TỰ ĐỘNG TẮT MODAL THÔNG BÁO SAU 8 GIÂY ---
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (status) {
            timer = setTimeout(() => {
                setStatus(null);
            }, 8000); // 8000ms = 8s
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [status]);

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    }

    const stepVariants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isLoginMode && !agreeTerms) {
            setStatus({ success: false, message: 'Vui lòng đồng ý với điều khoản sử dụng!' })
            return
        }

        setIsLoading(true)
        setStatus(null)

        const submitData = new FormData(e.currentTarget)
        const username = submitData.get('username') as string
        const password = submitData.get('password') as string

        try {
            if (isLoginMode) {
                // XỬ LÝ ĐĂNG NHẬP
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
                }, 1200)

            } else {
                // XỬ LÝ ĐĂNG KÝ – DÙNG formData state (đã được kiểm tra ở nextStep)
                const payload = {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name || undefined,
                    gender: formData.gender || undefined,
                    date_of_birth: formData.date_of_birth || undefined,
                    phone: formData.phone || undefined,
                    address: formData.address || undefined,
                };

                await axios.post('http://127.0.0.1:8000/auth/register', payload)

                setStatus({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' })

                setTimeout(() => {
                    setIsLoginMode(true)
                    setStatus(null)
                    setCurrentStep(1)
                    setFormData({ username: '', email: '', password: '', full_name: '', gender: '', date_of_birth: '', phone: '', address: '' })
                }, 1500)
            }
        } catch (error) {
            console.error("Lỗi:", error)
            let errorMsg = isLoginMode ? 'Tài khoản hoặc mật khẩu không chính xác!' : 'Đã có lỗi xảy ra khi đăng ký!'

            if (axios.isAxiosError(error) && error.response?.data?.detail) {
                errorMsg = error.response.data.detail
            }
            setStatus({ success: false, message: errorMsg })
        } finally {
            setIsLoading(false)
        }
    }

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode)
        setStatus(null)
        setCurrentStep(1)
        setFormData({
            username: '', email: '', password: '', full_name: '',
            gender: '', date_of_birth: '', phone: '', address: ''
        })
    }

    const nextStep = () => {
        if (currentStep === 1) {
            if (!formData.username || !formData.email || !formData.password) {
                setStatus({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' })
                return
            }
            if (formData.password.length < 6) {
                setStatus({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' })
                return
            }
        }
        setCurrentStep(prev => prev + 1)
        setStatus(null)
    }

    const prevStep = () => {
        setCurrentStep(prev => prev - 1)
        setStatus(null)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 font-sans relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* --- MODAL THÔNG BÁO --- */}
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
                                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-full"
                            >
                                <X size={18} />
                            </button>

                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${status.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {status.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">
                                {status.success ? 'Thành công!' : 'Thông báo'}
                            </h3>

                            <p className="text-slate-600 text-sm mb-6">
                                {status.message}
                            </p>

                            <button
                                onClick={() => setStatus(null)}
                                className={`w-full py-2.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 ${status.success ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                            >
                                {status.success ? 'Đang xử lý...' : 'Đóng'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-white/90 backdrop-blur-xl w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">

                    {/* ================= CỘT TRÁI: LOGO & THÔNG TIN ================= */}
                    <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#312e81] text-white text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.dthu.edu.vn/images/slider/02.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/90 to-transparent"></div>

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
                    <div className="p-8 lg:p-12 bg-white flex flex-col justify-center">
                        <div className="max-w-md mx-auto w-full">

                            <div className="lg:hidden flex justify-center mb-6">
                                <div className="w-16 h-16 bg-blue-50 rounded-full p-1 flex items-center justify-center">
                                    <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            </div>

                            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
                                    {isLoginMode ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                                </h2>
                                {/* <p className="text-gray-500 text-sm">
                                    {isLoginMode
                                        ? 'Vui lòng đăng nhập để tiếp tục'
                                        : 'Điền thông tin để bắt đầu hành trình học tập'}
                                </p> */}
                            </motion.div>

                            {/* CẬP NHẬT: Progress Steps kéo dài cân đối (Chỉ còn 2 bước) */}
                            {!isLoginMode && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                                    <div className="flex items-center w-full mb-2">
                                        {[1, 2].map((step, index) => (
                                            <React.Fragment key={step}>
                                                {/* Vòng tròn bước */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0
                                                    ${currentStep >= step
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                        : 'bg-gray-100 text-gray-400'}`}
                                                >
                                                    {currentStep > step ? <CheckCircle size={16} /> : step}
                                                </div>

                                                {/* Đường kẻ tự động giãn (flex-1) */}
                                                {index < 1 && (
                                                    <div className={`flex-1 h-1 mx-2 rounded transition-all duration-300
                                                        ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                    />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span className="text-left">Tài khoản</span>
                                        <span className="text-right">Hoàn tất</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit}>
                                <AnimatePresence mode="wait">
                                    {isLoginMode ? (
                                        // Login Form
                                        <motion.div
                                            key="login"
                                            variants={fadeInUp}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="space-y-4"
                                        >
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                    Tên đăng nhập <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        placeholder="Nhập tên đăng nhập..."
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                    Mật khẩu <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        name="password"
                                                        placeholder="••••••••"
                                                        // Đã thêm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden để ẩn con mắt trình duyệt
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    {/* <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> */}
                                                    {/* <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span> */}
                                                </label>
                                                <button type="button" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                                    Quên mật khẩu?
                                                </button>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                                            >
                                                {isLoading ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        Đăng Nhập
                                                        <ArrowRight size={18} />
                                                    </>
                                                )}
                                            </button>
                                        </motion.div>
                                    ) : (
                                        // Register Form with Steps
                                        <motion.div
                                            key="register"
                                            variants={stepVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            className="space-y-4"
                                        >
                                            {currentStep === 1 && (
                                                <motion.div
                                                    key="step1"
                                                    variants={fadeInUp}
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    className="space-y-4"
                                                >
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Tên đăng nhập <span className="text-rose-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    name="username"
                                                                    value={formData.username}
                                                                    onChange={handleInputChange}
                                                                    placeholder="nguyenvan_a"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Email <span className="text-rose-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type="email"
                                                                    name="email"
                                                                    value={formData.email}
                                                                    onChange={handleInputChange}
                                                                    placeholder="your.email@dthu.edu.vn"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Mật khẩu <span className="text-rose-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type={showPassword ? "text" : "password"}
                                                                    name="password"
                                                                    value={formData.password}
                                                                    onChange={handleInputChange}
                                                                    placeholder="••••••••"
                                                                    // Đã thêm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden để ẩn con mắt trình duyệt
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-10 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                                                                    required
                                                                    minLength={6}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowPassword(!showPassword)}
                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                                                                >
                                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1 ml-1">
                                                                Ít nhất 6 ký tự
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {currentStep === 2 && (
                                                <motion.div
                                                    key="step2"
                                                    variants={fadeInUp}
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    className="space-y-4"
                                                >
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Họ và tên
                                                            </label>
                                                            <div className="relative">
                                                                <Heart size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    name="full_name"
                                                                    value={formData.full_name}
                                                                    onChange={handleInputChange}
                                                                    placeholder="Nguyễn Văn A"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Giới tính
                                                            </label>
                                                            <select
                                                                name="gender"
                                                                value={formData.gender}
                                                                onChange={handleInputChange}
                                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                                            >
                                                                <option value="" className="text-gray-400">Chọn</option>
                                                                <option value="Nam">Nam</option>
                                                                <option value="Nữ">Nữ</option>
                                                                <option value="Khác">Khác</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Ngày sinh
                                                            </label>
                                                            <div className="relative">
                                                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                                <input
                                                                    type="date"
                                                                    name="date_of_birth"
                                                                    value={formData.date_of_birth}
                                                                    onChange={handleInputChange}
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Số điện thoại
                                                            </label>
                                                            <div className="relative">
                                                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type="tel"
                                                                    name="phone"
                                                                    value={formData.phone}
                                                                    onChange={handleInputChange}
                                                                    placeholder="0123 456 789"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all placeholder-gray-400"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 ml-1">
                                                                Địa chỉ
                                                            </label>
                                                            <div className="relative">
                                                                <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                                                                <textarea
                                                                    name="address"
                                                                    value={formData.address}
                                                                    onChange={handleInputChange}
                                                                    rows={1}
                                                                    placeholder="Số nhà, đường, phường, thành phố..."
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all resize-none placeholder-gray-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <label className="flex items-start gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={agreeTerms}
                                                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                                                                Tôi đồng ý với{' '}
                                                                <button type="button" className="text-blue-600 hover:text-blue-800 font-medium">
                                                                    Điều khoản sử dụng
                                                                </button>
                                                                {' '}và{' '}
                                                                <button type="button" className="text-blue-600 hover:text-blue-800 font-medium">
                                                                    Chính sách bảo mật
                                                                </button>
                                                            </span>
                                                        </label>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Navigation Buttons */}
                                            {!isLoginMode && (
                                                <div className="flex gap-3 pt-4">
                                                    {currentStep > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={prevStep}
                                                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-all"
                                                        >
                                                            Quay lại
                                                        </button>
                                                    )}

                                                    {currentStep < 2 ? (
                                                        <button
                                                            type="button"
                                                            onClick={nextStep}
                                                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all"
                                                        >
                                                            Tiếp theo
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="submit"
                                                            disabled={isLoading || !agreeTerms}
                                                            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-lg font-semibold text-sm shadow-lg shadow-green-200 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                                        >
                                                            {isLoading ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <>
                                                                    Hoàn tất đăng ký
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>

                            {/* Toggle Mode */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 text-center"
                            >
                                <p className="text-sm text-gray-500">
                                    {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
                                    <button
                                        onClick={toggleMode}
                                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                                    >
                                        {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
                                    </button>
                                </p>
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
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    )
}