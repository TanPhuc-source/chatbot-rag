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

  useEffect(() => { init(); }, []);

  const T = "0.25s cubic-bezier(0.4,0,0.2,1)";
  const handleNew = () => { clearMessages(); onClose?.(); };
  const handleSelect = (id: string) => { setActiveConversation(id); onClose?.(); };
  const handleLogout = () => { logout(); clearMessages(); navigate("/"); };

  // Chiều rộng phần text slide (sidebar 260 - icon 34 - padding 24 - gap 10)
  const TEXT_W = 192;

  return (
    <aside
      className="sidebar-panel flex flex-col h-full shrink-0"
      style={{ width: collapsed ? 60 : 260, transition: `width ${T}`, overflow: "hidden" }}
    >

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        borderBottom: "1px solid var(--sb-border)",
        display: "flex", flexDirection: "column",
        padding: "14px 12px 12px",
        gap: 10,
      }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", height: 34 }}>
          <button onClick={onToggle} style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#1a5fb4,#2a80d8)",
            boxShadow: "0 4px 14px rgba(26,95,180,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", cursor: "pointer",
          }}>
            <Sparkles size={15} color="white" />
          </button>

          <div style={{
            width: collapsed ? 0 : TEXT_W,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: `width ${T}, opacity ${T}`,
            display: "flex", alignItems: "center", flexShrink: 0,
          }}>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 10, whiteSpace: "nowrap" }}>
              <p className="font-display sb-title">Trợ lý AI TTNN–TH</p>
              <p className="sb-sub">ĐH Đồng Tháp</p>
            </div>
            <button onClick={onToggle} style={{
              flexShrink: 0, padding: 5, borderRadius: 7,
              border: "none", background: "var(--sb-badge-bg)",
              cursor: "pointer", color: "var(--sb-muted)", display: "flex",
              transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-btn-text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-muted)")}
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* New chat button */}
        <button
          onClick={handleNew}
          title={collapsed ? "Cuộc trò chuyện mới" : undefined}
          className="sb-new-btn"
          style={{
            display: "flex", alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: collapsed ? 34 : "100%",
            alignSelf: "center",
            transition: `width ${T}`,
            overflow: "hidden",
          }}
        >
          <Plus size={14} style={{ flexShrink: 0 }} />
          <span style={{
            width: collapsed ? 0 : "auto",
            maxWidth: collapsed ? 0 : 200,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: `max-width ${T}, opacity ${T}`,
            whiteSpace: "nowrap",
            display: "inline-block",
          }}>
            Cuộc trò chuyện mới
          </span>
        </button>
      </div>

      {/* ── Chat list ── */}
      <nav className="sb-nav" style={{ padding: "10px", flex: 1 }}>
        {conversations.length === 0 && (
          <div style={{ position: "relative", minHeight: 60 }}>
            <div style={{
              position: "absolute", top: 16, left: 0, right: 0,
              display: "flex", justifyContent: "center",
              opacity: collapsed ? 1 : 0,
              transition: `opacity ${T}`,
              pointerEvents: "none",
            }}>
              <MessageSquare size={14} style={{ color: "var(--sb-icon)", opacity: 0.4 }} />
            </div>
            <div style={{
              opacity: collapsed ? 0 : 1,
              transition: `opacity ${T}`,
              pointerEvents: collapsed ? "none" : "auto",
            }}>
              <div className="sb-empty">
                <div className="sb-empty-icon"><MessageSquare size={16} /></div>
                <p>Chưa có cuộc trò chuyện</p>
              </div>
            </div>
          </div>
        )}

        {conversations.map((conv, idx) => (
          <div key={conv.id} style={{
            display: "flex", alignItems: "center",
            padding: collapsed ? "8px 0" : "8px 10px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 8, cursor: "pointer",
            background: activeId === conv.id ? "var(--sb-active-bg)" : "transparent",
            transition: "background 0.15s",
            marginTop: idx === 0 ? 0 : 2,
            overflow: "hidden",
          }}
            onClick={() => handleSelect(conv.id)}
            onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = "var(--sb-hover)"; setHoveredId(conv.id); }}
            onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = "transparent"; setHoveredId(null); }}
            title={collapsed ? conv.title : undefined}
          >
            <div style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <MessageSquare size={12} style={{ color: activeId === conv.id ? "var(--sb-active-icon)" : "var(--sb-icon)" }} />
            </div>
            <div style={{
              overflow: "hidden",
              maxWidth: collapsed ? 0 : 300,
              opacity: collapsed ? 0 : 1,
              transition: `max-width ${T}, opacity ${T}`,
              display: "flex", alignItems: "center", gap: 8,
              paddingLeft: 8,
            }}>
              <p style={{
                fontSize: 12, fontWeight: activeId === conv.id ? 500 : 400,
                color: activeId === conv.id ? "var(--sb-active-text)" : "var(--sb-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0,
                width: 140,
              }}>
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
      <div style={{
        flexShrink: 0,
        borderTop: "1px solid var(--sb-border)",
        padding: "12px 12px 14px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", height: 34 }}>
          <div className="sb-avatar" style={{ flexShrink: 0, width: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={13} />
          </div>
          <div style={{
            width: collapsed ? 0 : TEXT_W,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: `width ${T}, opacity ${T}`,
            paddingLeft: 10,
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {isLoggedIn ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--sb-text)", margin: 0, lineHeight: 1.2 }}>
                  {username || "Tài khoản"}
                </p>
                <p style={{ fontSize: 10, color: "var(--sb-muted)", margin: "2px 0 0", lineHeight: 1 }}>
                  {role === "admin" ? "Quản trị viên" : "Người dùng"}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--sb-text)", margin: 0, lineHeight: 1.2 }}>Chế độ khách</p>
                <p style={{ fontSize: 10, color: "var(--sb-muted)", margin: "2px 0 0", lineHeight: 1 }}>Lịch sử không được lưu</p>
              </>
            )}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={isLoggedIn ? handleLogout : () => navigate("/login")}
          title={collapsed ? (isLoggedIn ? "Đăng xuất" : "Đăng nhập") : undefined}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 7,
            height: 34,
            width: collapsed ? 34 : "100%",
            alignSelf: "center",
            borderRadius: 9,
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
            overflow: "hidden",
            ...(isLoggedIn
              ? { background: "var(--sb-btn-bg)", border: "1px solid var(--sb-btn-border)", color: "var(--sb-btn-text)" }
              : { background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", border: "none", color: "#fff", boxShadow: "0 2px 8px rgba(26,95,180,0.30)" }
            ),
            transition: `width ${T}, filter 0.15s`,
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
        >
          {isLoggedIn ? <LogOut size={13} style={{ flexShrink: 0 }} /> : <LogIn size={13} style={{ flexShrink: 0 }} />}
          <span style={{
            maxWidth: collapsed ? 0 : 200,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: `max-width ${T}, opacity ${T}`,
            whiteSpace: "nowrap",
            display: "inline-block",
          }}>
            {isLoggedIn ? "Đăng xuất" : "Đăng nhập"}
          </span>
        </button>

      </div>
    </aside>
  );
}