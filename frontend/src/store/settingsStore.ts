import { create } from 'zustand';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

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
}

interface SettingsState {
    settings: SystemSettings;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<SystemSettings>, token: string) => Promise<void>;
    resetSettings: (token: string) => Promise<void>;
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
            const res = await axios.get(`${API}/ui-settings`);
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
            const res = await axios.put(`${API}/ui-settings`, newSettings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Dùng data trả về từ server để đảm bảo đồng bộ
            set({ settings: { ...defaultSettings, ...res.data } });
        } catch (error) {
            console.error("Lỗi khi cập nhật cài đặt:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    resetSettings: async (token) => {
        set({ isLoading: true });
        try {
            const res = await axios.post(`${API}/ui-settings/reset`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ settings: { ...defaultSettings, ...res.data } });
        } catch (error) {
            console.error("Lỗi khi reset cài đặt:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));