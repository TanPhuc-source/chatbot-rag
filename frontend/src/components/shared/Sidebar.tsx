import { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, Sparkles, User, ChevronLeft, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle, onClose }: Props) {
  const { conversations, activeId, clearMessages, setActiveConversation } = useChatStore();
  const { isLoggedIn, username, role, logout, init } = useAuthStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Đọc token từ localStorage khi mount
  useEffect(() => { init(); }, []);

  const T = "0.25s cubic-bezier(0.4,0,0.2,1)";

  const handleNew = () => { clearMessages(); onClose?.(); };
  const handleSelect = (id: string) => { setActiveConversation(id); onClose?.(); };
  const handleLogout = () => { logout(); clearMessages(); navigate("/"); };

  return (
    <aside
      className="sidebar-panel flex flex-col h-full shrink-0"
      style={{ width: collapsed ? 60 : 260, transition: `width ${T}`, overflow: "hidden" }}
    >

      {/* ── Header ── */}
      <div style={{ padding: collapsed ? "16px 0" : "20px 16px 16px", borderBottom: "1px solid var(--sb-border)", transition: `padding ${T}`, flexShrink: 0 }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", height: 34, marginBottom: collapsed ? 0 : 14, transition: `margin-bottom ${T}` }}>
          {/* Logo button — luôn hiện */}
          <button onClick={onToggle} style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#1a5fb4,#2a80d8)",
            boxShadow: "0 4px 14px rgba(26,95,180,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", cursor: "pointer",
            marginLeft: collapsed ? "auto" : 0,
            marginRight: collapsed ? "auto" : 0,
            transition: `margin ${T}`,
          }}>
            <Sparkles size={15} color="white" />
          </button>

          {/* Title — fade */}
          <div style={{
            flex: 1, minWidth: 0, paddingLeft: 10, whiteSpace: "nowrap", overflow: "hidden",
            opacity: collapsed ? 0 : 1,
            transition: `opacity ${T}`,
            pointerEvents: collapsed ? "none" : "auto",
          }}>
            <p className="font-display sb-title">Trợ lý AI TTNN–TH</p>
            <p className="sb-sub">ĐH Đồng Tháp</p>
          </div>

          {/* Chevron — fade */}
          <button onClick={onToggle} style={{
            flexShrink: 0, padding: 5, borderRadius: 7,
            border: "none", background: "var(--sb-badge-bg)",
            cursor: "pointer", color: "var(--sb-muted)", display: "flex",
            opacity: collapsed ? 0 : 1,
            transition: `opacity ${T}, color 0.15s`,
            pointerEvents: collapsed ? "none" : "auto",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-btn-text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-muted)")}
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* New chat button */}
        <div style={{ position: "relative", height: 36, overflow: "visible" }}>
          {/* Full */}
          <button onClick={handleNew} className="sb-new-btn" style={{
            position: "absolute", inset: 0,
            opacity: collapsed ? 0 : 1,
            transition: `opacity ${T}`,
            pointerEvents: collapsed ? "none" : "auto",
          }}>
            <Plus size={14} /> Cuộc trò chuyện mới
          </button>
          {/* Icon */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", justifyContent: "center", alignItems: "center",
            opacity: collapsed ? 1 : 0,
            transition: `opacity ${T}`,
            pointerEvents: collapsed ? "auto" : "none",
          }}>
            <button onClick={handleNew} title="Cuộc trò chuyện mới" style={{
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--sb-btn-bg)", border: "1px solid var(--sb-btn-border)",
              cursor: "pointer", color: "var(--sb-btn-text)",
            }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat list ── */}
      <nav className="sb-nav" style={{ padding: "10px", flex: 1 }}>
        {conversations.length === 0 && (
          <div style={{ position: "relative", minHeight: 80 }}>
            <div style={{ opacity: collapsed ? 0 : 1, transition: `opacity ${T}`, pointerEvents: collapsed ? "none" : "auto" }}>
              <div className="sb-empty">
                <div className="sb-empty-icon"><MessageSquare size={16} /></div>
                <p>Chưa có cuộc trò chuyện</p>
              </div>
            </div>
            <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: collapsed ? 1 : 0, transition: `opacity ${T}`, pointerEvents: "none" }}>
              <MessageSquare size={14} style={{ color: "var(--sb-icon)", opacity: 0.4 }} />
            </div>
          </div>
        )}

        {conversations.map((conv, idx) => (
          <div key={conv.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8, cursor: "pointer",
            background: activeId === conv.id ? "var(--sb-active-bg)" : "transparent",
            transition: `background 0.15s`,
            marginTop: idx === 0 ? 0 : 2,
          }}
            onClick={() => handleSelect(conv.id)}
            onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = "var(--sb-hover)"; setHoveredId(conv.id); }}
            onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = "transparent"; setHoveredId(null); }}
            title={collapsed ? conv.title : undefined}
          >
            <div style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <MessageSquare size={12} style={{ color: activeId === conv.id ? "var(--sb-active-icon)" : "var(--sb-icon)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, opacity: collapsed ? 0 : 1, transition: `opacity ${T}`, pointerEvents: collapsed ? "none" : "auto" }}>
              <p style={{ fontSize: 12, fontWeight: activeId === conv.id ? 500 : 400, color: activeId === conv.id ? "var(--sb-active-text)" : "var(--sb-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, flex: 1 }}>
                {conv.title || "Cuộc trò chuyện"}
              </p>
              {hoveredId === conv.id && (
                <button className="sb-trash-btn" onClick={e => e.stopPropagation()}><Trash2 size={11} /></button>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid var(--sb-border)", flexShrink: 0 }}>

        {/* User info */}
        <div style={{ padding: "12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sb-avatar" style={{ flexShrink: 0 }}>
            <User size={13} />
          </div>
          <div style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: collapsed ? 0 : 1, transition: `opacity ${T}`, pointerEvents: collapsed ? "none" : "auto" }}>
            {isLoggedIn ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--sb-text)", margin: 0, lineHeight: 1.2 }}>{username || "Tài khoản"}</p>
                <p style={{ fontSize: 10, color: "var(--sb-muted)", margin: "2px 0 0", lineHeight: 1, textTransform: "capitalize" }}>{role === "admin" ? "Quản trị viên" : "Người dùng"}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--sb-text)", margin: 0, lineHeight: 1.2 }}>Chế độ khách</p>
                <p style={{ fontSize: 10, color: "var(--sb-muted)", margin: "2px 0 0", lineHeight: 1 }}>Lịch sử không được lưu</p>
              </>
            )}
          </div>
        </div>

        {/* Action button: Đăng nhập hoặc Đăng xuất */}
        <div style={{ padding: "0 12px 14px", position: "relative", height: 46 }}>
          {/* Full button */}
          <div style={{
            position: "absolute", top: 0, left: 12, right: 12,
            opacity: collapsed ? 0 : 1,
            transition: `opacity ${T}`,
            pointerEvents: collapsed ? "none" : "auto",
          }}>
            {isLoggedIn ? (
              <button onClick={handleLogout} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "8px 12px", borderRadius: 9, fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                cursor: "pointer", background: "var(--sb-btn-bg)", border: "1px solid var(--sb-btn-border)",
                color: "var(--sb-btn-text)", transition: "filter 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <LogOut size={13} /> Đăng xuất
              </button>
            ) : (
              <button onClick={() => navigate("/login")} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "8px 12px", borderRadius: 9, fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                cursor: "pointer", background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", border: "none",
                color: "#fff", boxShadow: "0 2px 8px rgba(26,95,180,0.30)", transition: "filter 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <LogIn size={13} /> Đăng nhập
              </button>
            )}
          </div>

          {/* Icon button khi collapsed */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex", justifyContent: "center",
            opacity: collapsed ? 1 : 0,
            transition: `opacity ${T}`,
            pointerEvents: collapsed ? "auto" : "none",
          }}>
            {isLoggedIn ? (
              <button onClick={handleLogout} title="Đăng xuất" style={{
                width: 34, height: 34, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--sb-btn-bg)", border: "1px solid var(--sb-btn-border)",
                cursor: "pointer", color: "var(--sb-btn-text)", transition: "filter 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <LogOut size={14} />
              </button>
            ) : (
              <button onClick={() => navigate("/login")} title="Đăng nhập" style={{
                width: 34, height: 34, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", border: "none",
                cursor: "pointer", color: "#fff",
                boxShadow: "0 2px 8px rgba(26,95,180,0.30)", transition: "filter 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <LogIn size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

    </aside>
  );
}