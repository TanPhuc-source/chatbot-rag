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

  useEffect(() => { init(); }, [init]);

  const T = "0.25s cubic-bezier(0.4,0,0.2,1)";
  const handleNew = () => { clearMessages(); onClose?.(); };
  const handleSelect = (id: string) => { setActiveConversation(id); onClose?.(); };
  const handleLogout = () => { logout(); clearMessages(); navigate("/"); };

  // Shared style cho phần text slide — opacity + width transition
  const slideText = (extraStyle?: React.CSSProperties): React.CSSProperties => ({
    overflow: "hidden",
    whiteSpace: "nowrap",
    maxWidth: collapsed ? 0 : 999,
    opacity: collapsed ? 0 : 1,
    transition: `max-width ${T}, opacity ${T}`,
    ...extraStyle,
  });

  return (
    <aside
      className="sidebar-panel flex flex-col h-full shrink-0"
      style={{ width: collapsed ? 68 : 300, transition: `width ${T}`, overflow: "hidden" }}
    >

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        borderBottom: "1px solid var(--sb-border)",
        display: "flex", flexDirection: "column",
        padding: "14px 12px 12px",
        gap: 10,
      }}>

        {/* Logo row — icon luôn cố định bên trái, text slide ra */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, height: 38 }}>
          <button
            onClick={onToggle}
            style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "linear-gradient(135deg,#1a5fb4,#2a80d8)",
              boxShadow: "0 4px 14px rgba(26,95,180,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer",
              marginLeft: collapsed ? 3 : 0,
              transition: `margin-left ${T}`,
            }}
          >
            <Sparkles size={15} color="white" />
          </button>

          {/* Text + chevron slide */}
          <div style={slideText({ display: "flex", alignItems: "center", flex: 1, paddingLeft: 10 })}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-display sb-title" style={{ fontSize: 13, margin: 0 }}>Trợ lý AI TTNN–TH</p>
              <p className="sb-sub" style={{ margin: 0 }}>ĐH Đồng Tháp</p>
            </div>
            <button
              onClick={onToggle}
              style={{
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

        {/* New chat button — icon cố định, text slide */}
        <button
          onClick={handleNew}
          title={collapsed ? "Cuộc trò chuyện mới" : undefined}
          style={{
            display: "flex", alignItems: "center",
            gap: 0,
            width: "100%",
            overflow: "hidden",
            background: "none", border: "none",
            cursor: "pointer",
            padding: "8px 2px",
            borderRadius: 8,
            color: "var(--sb-text)",
            fontFamily: "inherit", fontSize: 13, fontWeight: 500,
            transition: `color 0.15s`,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-active-text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-text)")}
        >
          <div style={{ width: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Plus size={17} />
          </div>
          <span style={slideText({ paddingLeft: 9 })}>
            Cuộc trò chuyện mới
          </span>
        </button>
      </div>

      {/* ── Chat list ── */}
      <nav className="sb-nav" style={{ padding: "10px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {conversations.length === 0 && (
          <>
            {/* Icon hiển thị khi collapsed */}
            <div style={{
              display: "flex", justifyContent: "center", paddingTop: 16,
              opacity: collapsed ? 1 : 0,
              transition: `opacity ${T}`,
              position: collapsed ? "static" : "absolute",
              pointerEvents: "none",
            }}>
              <MessageSquare size={14} style={{ color: "var(--sb-icon)", opacity: 0.4 }} />
            </div>
            {/* Text hiển thị khi expanded */}
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
          </>
        )}

        {conversations.map((conv, idx) => (
          <div
            key={conv.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 10px",
              borderRadius: 8,
              cursor: "pointer",
              background: activeId === conv.id ? "var(--sb-active-bg)" : "transparent",
              transition: "background 0.15s",
              marginTop: idx === 0 ? 0 : 3,
              overflow: "hidden",
            }}
            onClick={() => handleSelect(conv.id)}
            onMouseEnter={e => {
              if (activeId !== conv.id) e.currentTarget.style.background = "var(--sb-hover)";
              setHoveredId(conv.id);
            }}
            onMouseLeave={e => {
              if (activeId !== conv.id) e.currentTarget.style.background = "transparent";
              setHoveredId(null);
            }}
            title={collapsed ? conv.title : undefined}
          >
            {/* Icon — luôn cố định, không dịch chuyển */}
            <MessageSquare
              size={15}
              style={{
                flexShrink: 0,
                color: activeId === conv.id ? "var(--sb-active-icon)" : "var(--sb-icon)",
                marginLeft: collapsed ? 6 : 0,
                transition: `margin-left ${T}`,
              }}
            />

            {/* Text + trash — slide in/out */}
            <div style={slideText({
              display: "flex", alignItems: "center", gap: 8,
              flex: 1, paddingLeft: 9, minWidth: 0,
            })}>
              <p style={{
                fontSize: 13,
                fontWeight: activeId === conv.id ? 500 : 400,
                color: activeId === conv.id ? "var(--sb-active-text)" : "var(--sb-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                margin: 0, flex: 1, minWidth: 0,
              }}>
                {conv.title || "Cuộc trò chuyện"}
              </p>
              {hoveredId === conv.id && (
                <button
                  className="sb-trash-btn"
                  onClick={e => { e.stopPropagation(); /* TODO: deleteConversation(conv.id) */ }}
                >
                  <Trash2 size={13} />
                </button>
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

        {/* User info — avatar cố định, text slide */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 0" }}>
          <div
            className="sb-avatar"
            style={{
              flexShrink: 0, width: 38, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: collapsed ? 3 : 0,
              transition: `margin-left ${T}`,
            }}
          >
            <User size={13} />
          </div>

          <div style={slideText({ paddingLeft: 10, flex: 1 })}>
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

        {/* Login / Logout button — icon cố định, text slide */}
        <button
          onClick={isLoggedIn ? handleLogout : () => navigate("/login")}
          title={collapsed ? (isLoggedIn ? "Đăng xuất" : "Đăng nhập") : undefined}
          style={{
            display: "flex", alignItems: "center",
            gap: 0,
            height: 38,
            width: "100%",
            borderRadius: 8,
            paddingLeft: 0, paddingRight: 2,
            fontFamily: "inherit", fontSize: 13, fontWeight: 500,
            cursor: "pointer",
            overflow: "hidden",
            background: "none", border: "none",
            color: isLoggedIn ? "var(--sb-muted)" : "var(--sb-active-icon)",
            transition: `color 0.15s`,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = isLoggedIn ? "var(--sb-btn-text)" : "var(--sb-active-text)")}
          onMouseLeave={e => (e.currentTarget.style.color = isLoggedIn ? "var(--sb-muted)" : "var(--sb-active-icon)")}
        >
          <div style={{ width: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isLoggedIn ? <LogOut size={17} /> : <LogIn size={17} />}
          </div>
          <span style={slideText({ paddingLeft: 9 })}>
            {isLoggedIn ? "Đăng xuất" : "Đăng nhập"}
          </span>
        </button>

      </div>
    </aside>
  );
}