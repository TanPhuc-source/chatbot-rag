import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
    themeColor: string;
    setThemeColor: (color: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Thuật toán tách mã HEX thành RGB
const hexToRgb = (hex: string) => {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255];
};

// Thuật toán trộn màu (để tự động tạo các sắc thái đậm nhạt)
const mixColor = (baseRgb: number[], mixRgb: number[], weight: number) => {
    const w = weight / 100;
    const r = Math.round(baseRgb[0] * w + mixRgb[0] * (1 - w));
    const g = Math.round(baseRgb[1] * w + mixRgb[1] * (1 - w));
    const b = Math.round(baseRgb[2] * w + mixRgb[2] * (1 - w));
    return `${r} ${g} ${b}`;
};

export const PRESET_THEMES = [
    { id: '#3b82f6', name: 'Xanh dương' },
    { id: '#10b981', name: 'Xanh ngọc' },
    { id: '#a855f7', name: 'Tím mộng mơ' },
    { id: '#f43f5e', name: 'Hồng cánh sen' },
    { id: '#f59e0b', name: 'Vàng cam' },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeColor, setThemeColorState] = useState<string>('#3b82f6');
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    // Load dữ liệu từ LocalStorage khi khởi động
    useEffect(() => {
        const savedColor = localStorage.getItem('admin_theme_color');
        if (savedColor) setThemeColorState(savedColor);

        const savedMode = localStorage.getItem('admin_dark_mode');
        if (savedMode === 'true') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const setThemeColor = (colorHex: string) => {
        setThemeColorState(colorHex);
        localStorage.setItem('admin_theme_color', colorHex);
    };

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('admin_dark_mode', String(newMode));
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Áp dụng biến CSS mỗi khi đổi màu
    useEffect(() => {
        const root = document.documentElement;
        const baseRgb = hexToRgb(themeColor);
        const white = [255, 255, 255];
        const black = [0, 0, 0];

        // Tự động pha màu tạo thành dải màu 50-800
        root.style.setProperty('--theme-color-50', mixColor(baseRgb, white, 10));
        root.style.setProperty('--theme-color-100', mixColor(baseRgb, white, 20));
        root.style.setProperty('--theme-color-200', mixColor(baseRgb, white, 40));
        root.style.setProperty('--theme-color-300', mixColor(baseRgb, white, 60));
        root.style.setProperty('--theme-color-400', mixColor(baseRgb, white, 80));
        root.style.setProperty('--theme-color-500', `${baseRgb[0]} ${baseRgb[1]} ${baseRgb[2]}`);
        root.style.setProperty('--theme-color-600', mixColor(baseRgb, black, 85)); // 85% gốc, 15% đen
        root.style.setProperty('--theme-color-700', mixColor(baseRgb, black, 70));
        root.style.setProperty('--theme-color-800', mixColor(baseRgb, black, 55));
    }, [themeColor]);

    return (
        <ThemeContext.Provider value={{ themeColor, setThemeColor, isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};