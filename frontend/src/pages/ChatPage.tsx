import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import Sidebar from "@/components/shared/Sidebar";
import { useSettingsStore } from "@/store/settingsStore";

export default function ChatPage() {
  const { settings, fetchSettings } = useSettingsStore();
  // Sidebar mặc định thu gọn trên desktop/tablet
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const brandColor = settings.themeColor || "#1a5fb4";

  return (
    <div
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
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "--brand": brandColor,
        "--brand-glow": `${brandColor}33`,
      } as React.CSSProperties}
    >
      {/* Desktop sidebar — luôn hiện, mặc định thu gọn */}
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
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
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
            boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
          }}
        >
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Main content — không có header */}
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
        {/* Nút hamburger chỉ hiện trên mobile, nổi lên trên màn hình */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:!hidden"
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            zIndex: 20,
            padding: 8,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-1)",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.18s ease",
          }}
        >
          <Menu size={20} />
        </button>

        <ChatWindow />
      </main>
    </div>
  );
}