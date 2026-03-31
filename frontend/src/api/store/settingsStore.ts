import { create } from 'zustand';
import api from '@/lib/api';

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
    updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
    resetSettings: () => Promise<void>;
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
            const res = await api.get('/ui-settings');
            if (res.data) {
                set({ settings: { ...defaultSettings, ...res.data } });
            }
        } catch (error) {
            console.error("Lỗi khi tải cài đặt:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    // Bỏ tham số token — cookie tự gửi qua withCredentials
    updateSettings: async (newSettings) => {
        set({ isLoading: true });
        try {
            const res = await api.put('/ui-settings', newSettings);
            set({ settings: { ...defaultSettings, ...res.data } });
        } catch (error) {
            console.error("Lỗi khi cập nhật cài đặt:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    resetSettings: async () => {
        set({ isLoading: true });
        try {
            const res = await api.post('/ui-settings/reset', {});
            set({ settings: { ...defaultSettings, ...res.data } });
        } catch (error) {
            console.error("Lỗi khi reset cài đặt:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));