/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class', // BẬT CHẾ ĐỘ DARK MODE BẰNG CLASS
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Geist'", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "monospace"],
      },
      colors: {
        bg: "#0d0d0d",
        surface: "#161616",
        border: "#2a2a2a",
        muted: "#666666",
        accent: "#00e5a0",
        "accent-dim": "#00e5a022",
        user: "#1a1a2e",
        // Hỗ trợ độ trong suốt hoàn hảo bằng định dạng RGB
        blue: {
          50: 'rgb(var(--theme-color-50) / <alpha-value>)',
          100: 'rgb(var(--theme-color-100) / <alpha-value>)',
          200: 'rgb(var(--theme-color-200) / <alpha-value>)',
          300: 'rgb(var(--theme-color-300) / <alpha-value>)',
          400: 'rgb(var(--theme-color-400) / <alpha-value>)',
          500: 'rgb(var(--theme-color-500) / <alpha-value>)',
          600: 'rgb(var(--theme-color-600) / <alpha-value>)',
          700: 'rgb(var(--theme-color-700) / <alpha-value>)',
          800: 'rgb(var(--theme-color-800) / <alpha-value>)',
        }
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        blink: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        fadeUp: "fadeUp 0.25s ease forwards",
        blink: "blink 1s step-end infinite",
        shimmer: "shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [],
};