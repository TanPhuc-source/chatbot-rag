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

  const themeStyles = chatDarkMode
    ? ({
      "--bg-base": "#0a0f1c",
      "--bg-1": "#141b2b",
      "--bg-2": "#1e293b",
      "--bg-3": "#334155",
      "--text-primary": "#f1f5f9",
      "--text-secondary": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--border": "#1e293b",
      "--border-mid": "#334155",
      "--sb-bg": "#0b1120",
      "--brand": chatColor,
      "--brand-glow": "rgba(26,95,180,0.25)",
    } as React.CSSProperties)
    : ({
      "--bg-base": "#ffffff",
      "--bg-1": "#f9fafb",
      "--bg-2": "#f1f5f9",
      "--bg-3": "#e2e8f0",
      "--text-primary": "#0f172a",
      "--text-secondary": "#334155",
      "--text-muted": "#64748b",
      "--border": "#e2e8f0",
      "--border-mid": "#cbd5e1",
      "--sb-bg": "#f8fafc",
      "--brand": chatColor,
      "--brand-glow": "rgba(26,95,180,0.15)",
    } as React.CSSProperties);

  return (
    <div
      className={chatDarkMode ? "dark" : ""}
      style={{
        display: "flex",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        transition: "background-color 0.3s ease, color 0.2s ease",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ...themeStyles,
      }}
    >
      {/* Desktop sidebar */}
      <div
        className="hidden lg:flex h-full"
        style={{ position: "relative", zIndex: 10, flexShrink: 0 }}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((p) => !p)} />
      </div>

      {/* Mobile sidebar drawer */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          pointerEvents: mobileOpen ? "auto" : "none",
        }}
      >
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
            opacity: mobileOpen ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
          }}
        >
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Main content */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          zIndex: 5,
        }}
      >
        <header
          className="main-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(16px, 4vw, 28px)",
            height: "clamp(56px, 8vh, 68px)",
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(8px)",
            background: "color-mix(in srgb, var(--bg-base) 80%, transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                padding: 8,
                borderRadius: 10,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-muted)",
                transition: "all 0.15s",
                display: "flex",
              }}
              className="lg:!hidden hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]"
            >
              <Menu size={20} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="lg:!hidden"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--brand), #2a80d8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px var(--brand-glow)",
                }}
              >
                <Sparkles size={16} color="white" />
              </div>
            </div>
          </div>

          {/* Theme toggle button with improved style */}
          <button
            onClick={() => setChatDarkMode(!chatDarkMode)}
            style={{
              padding: 8,
              borderRadius: 12,
              border: "1px solid var(--border-mid)",
              background: "var(--bg-2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              color: "var(--text-muted)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            }}
            className="hover:bg-[var(--bg-3)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            title={chatDarkMode ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
          >
            {chatDarkMode ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-indigo-500" />
            )}
          </button>
        </header>

        <ChatWindow />
      </main>
    </div>
  );
}