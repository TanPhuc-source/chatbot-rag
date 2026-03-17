import { useState, useEffect } from "react";
import { Menu, Sparkles, Moon, Sun } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import Sidebar from "@/components/shared/Sidebar";
import { useChatStore } from "@/store/chatStore";

export default function ChatPage() {
  const { activeId } = useChatStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [chatDarkMode, setChatDarkMode] = useState(() => {
    return localStorage.getItem("chat_theme_dark") === "true";
  });
  const [chatColor, setChatColor] = useState(() => {
    return localStorage.getItem("chat_theme_color") || "#1a5fb4";
  });

  useEffect(() => {
    localStorage.setItem("chat_theme_dark", String(chatDarkMode));
    localStorage.setItem("chat_theme_color", chatColor);
  }, [chatDarkMode, chatColor]);

  const themeStyles = chatDarkMode ? {
    "--bg-base": "#050c16",
    "--bg-1": "#0d1b2a",
    "--bg-2": "#1b263b",
    "--bg-3": "#415a77",
    "--text-primary": "#f8fafc",
    "--text-secondary": "#e2e8f0",
    "--text-muted": "#94a3b8",
    "--border": "#1e293b",
    "--border-mid": "#334155",
    "--sb-bg": "#020617",
    "--brand": chatColor,
  } as React.CSSProperties : {
    "--bg-base": "#ffffff",
    "--bg-1": "#ffffff",
    "--bg-2": "#f8fafc",
    "--bg-3": "#e2e8f0",
    "--text-primary": "#0f172a",
    "--text-secondary": "#334155",
    "--text-muted": "#64748b",
    "--border": "#e2e8f0",
    "--border-mid": "#cbd5e1",
    "--sb-bg": "#f8fafc",
    "--brand": chatColor,
  } as React.CSSProperties;

  return (
    <div
      className={chatDarkMode ? "dark" : ""}
      style={{
        display: "flex", height: "100dvh", width: "100vw", overflow: "hidden",
        position: "fixed", top: 0, left: 0,
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        transition: "background 0.3s, color 0.3s",
        ...themeStyles
      }}
    >
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex h-full" style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      </div>

      {/* ── Mobile sidebar: drawer overlay ── */}
      <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: mobileOpen ? "auto" : "none" }}>
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(5,12,22,0.55)", backdropFilter: "blur(4px)", opacity: mobileOpen ? 1 : 0, transition: "opacity 0.25s ease" }}
        />
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative", zIndex: 5 }}>
        <header
          className="main-header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(12px, 3vw, 24px)", height: "clamp(52px, 8vw, 64px)", flexShrink: 0, borderBottom: "1px solid var(--border)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ padding: 7, borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", transition: "color 0.15s", display: "flex" }}
              className="lg:!hidden hover:bg-[var(--bg-3)]"
            >
              <Menu size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="lg:!hidden" style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} color="white" />
              </div>
            </div>
          </div>

          {/* ── NÚT ĐỔI CHẾ ĐỘ SÁNG/TỐI TẠI HEADER ── */}
          <button
            onClick={() => setChatDarkMode(!chatDarkMode)}
            style={{ padding: 8, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            className="hover:bg-[var(--bg-3)]"
            title={chatDarkMode ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
          >
            {chatDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-blue-500" />}
          </button>
        </header>

        <ChatWindow />
      </main>
    </div>
  );
}