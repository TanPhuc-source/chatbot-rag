// src/store/settingsStore.ts
import { create } from 'zustand';
import axios from 'axios';

interface SystemSettings {
    themeColor: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    schoolName: string;
    schoolDept: string;
    faq1: string;
    faq2: string;
    faq3: string;
    faq4: string;
    // Bạn có thể thêm logoUrl sau nếu backend hỗ trợ upload file
}

interface SettingsState {
    settings: SystemSettings;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<SystemSettings>, token: string) => Promise<void>;
}

const defaultSettings: SystemSettings = {
    themeColor: "#1a5fb4",
    welcomeTitle: "Xin chào! 👋",
    welcomeSubtitle: "Tôi có thể giúp gì cho bạn?",
    schoolName: "Trường Đại Học Đồng Tháp",
    schoolDept: "Trung Tâm Ngoại Ngữ Và Tin Học",
    faq1: "Thủ tục đăng ký thi VSTEP như thế nào?",
    faq2: "Học phí của các khóa học ngoại ngữ là bao nhiêu?",
    faq3: "Trung tâm có các chứng chỉ tiếng Anh nào?",
    faq4: "Lịch khai giảng các khóa học mới?",
};

export const useSettingsStore = create<SettingsState>((set) => ({
    settings: defaultSettings,
    isLoading: false,

    fetchSettings: async () => {
        set({ isLoading: true });
        try {
            // Thay bằng endpoint thực tế của bạn
            const res = await axios.get("http://127.0.0.1:8000/settings");
            if (res.data) {
                set({ settings: { ...defaultSettings, ...res.data } });
            }
        } catch (error) {
            console.error("Lỗi khi tải cài đặt:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateSettings: async (newSettings, token) => {
        set({ isLoading: true });
        try {
            // Gọi API cập nhật cấu hình
            await axios.put("http://127.0.0.1:8000/settings", newSettings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set((state) => ({ settings: { ...state.settings, ...newSettings } }));
        } catch (error) {
            console.error("Lỗi khi cập nhật cài đặt:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    }
}));