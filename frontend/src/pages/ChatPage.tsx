import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import Sidebar from "@/components/shared/Sidebar";
import { useChatStore } from "@/store/chatStore";

export default function ChatPage() {
  const { activeId } = useChatStore();
  const [collapsed, setCollapsed] = useState(false);   // desktop: thu gọn
  const [mobileOpen, setMobileOpen] = useState(false); // mobile: mở drawer

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100vw", overflow: "hidden", position: "fixed", top: 0, left: 0, background: "var(--bg-base)" }}>

      {/* ── Desktop sidebar (lg+): luôn hiển thị, chỉ thu/mở) ── */}
      <div className="hidden lg:flex h-full" style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      </div>

      {/* ── Mobile sidebar: drawer overlay ── */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          pointerEvents: mobileOpen ? "auto" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(5,12,22,0.55)",
            backdropFilter: "blur(4px)",
            opacity: mobileOpen ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        />
        {/* Drawer */}
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
        {/* Header */}
        <header
          className="main-header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, flexShrink: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger — chỉ hiện trên mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              style={{ padding: 7, borderRadius: 9, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", transition: "color 0.15s", display: "flex" }}
              className="lg:!hidden"
            >
              <Menu size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Logo nhỏ — chỉ hiện trên mobile */}
              <div className="lg:!hidden" style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} color="white" />
              </div>
              <div>
                <p className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                  {activeId ? "Cuộc trò chuyện" : "Trợ lý AI Trung tâm Ngoại ngữ – Tin học"}
                </p>
                {!activeId && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.2, marginTop: 1 }}>Đại học Đồng Tháp</p>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px rgba(16,185,129,0.22)", display: "inline-block", animation: "pulse 2.5s ease infinite" }} />
            <span className="hidden sm:inline" style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>Đang hoạt động</span>
          </div>
        </header>

        <ChatWindow />
      </main>
    </div>
  );
}
