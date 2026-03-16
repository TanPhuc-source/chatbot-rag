import { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, Sparkles, User, ChevronLeft, LogIn, LogOut, Moon, Sun, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  chatDarkMode?: boolean;
  setChatDarkMode?: (val: boolean) => void;
  chatColor?: string;
  setChatColor?: (val: string) => void;
}

export default function Sidebar({ collapsed = false, onToggle, onClose, chatDarkMode, setChatDarkMode, chatColor, setChatColor }: Props) {
  const { conversations, activeId, clearMessages, setActiveConversation } = useChatStore();
  const { isLoggedIn, username, role, logout, init } = useAuthStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { init(); }, [init]);

  const T = "0.28s cubic-bezier(0.4,0,0.2,1)";
  const handleNew = () => { clearMessages(); onClose?.(); };
  const handleSelect = (id: string) => { setActiveConversation(id); onClose?.(); };
  const handleLogout = () => { logout(); clearMessages(); navigate("/"); };

  const slideText = (extraStyle?: React.CSSProperties): React.CSSProperties => ({
    overflow: "hidden", whiteSpace: "nowrap", maxWidth: collapsed ? 0 : 999, opacity: collapsed ? 0 : 1, transition: `max-width ${T}, opacity ${T}`, ...extraStyle,
  });

  return (
    <aside className="flex flex-col h-full shrink-0" style={{ width: collapsed ? 68 : 300, transition: `width ${T}`, overflow: "hidden", background: "var(--sb-bg)", borderRight: "1px solid var(--border)" }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", padding: "16px 14px 14px", gap: 16 }}>
        {/* Logo & Title */}
        <div style={{ display: "flex", alignItems: "center", height: 38 }}>
          <button onClick={onToggle} style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", boxShadow: "0 4px 14px rgba(26,95,180,0.3)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", marginLeft: collapsed ? 1 : 0, transition: `all ${T}` }} className="hover:scale-105 active:scale-95">
            <Sparkles size={16} color="white" />
          </button>
          <div style={slideText({ display: "flex", alignItems: "center", flex: 1, paddingLeft: 12 })}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-display" style={{ fontSize: 14, margin: 0, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Trợ lý AI TTNN–TH</p>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>ĐH Đồng Tháp</p>
            </div>
            <button onClick={onToggle} style={{ flexShrink: 0, padding: 6, borderRadius: 8, border: "none", background: "var(--bg-2)", cursor: "pointer", color: "var(--text-muted)", display: "flex", transition: "all 0.2s" }} className="hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]">
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Nút New Chat (Được thiết kế nổi bật hơn) */}
        <button onClick={handleNew} title={collapsed ? "Cuộc trò chuyện mới" : undefined} style={{ display: "flex", alignItems: "center", width: "100%", overflow: "hidden", background: "var(--bg-1)", border: "1px solid var(--border)", cursor: "pointer", padding: "8px 4px", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, transition: `all 0.2s`, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }} className="hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm">
          <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Plus size={18} /></div>
          <span style={slideText({ paddingLeft: 8 })}>Cuộc trò chuyện mới</span>
        </button>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "0 14px", opacity: 0.5 }} />

      {/* ── Chat list ── */}
      <nav style={{ padding: "14px", flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>
        {conversations.length === 0 && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 20, opacity: collapsed ? 1 : 0, transition: `opacity ${T}`, position: collapsed ? "static" : "absolute", pointerEvents: "none" }}>
            <MessageSquare size={16} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            onMouseEnter={() => setHoveredId(conv.id)}
            onMouseLeave={() => setHoveredId(null)}
            title={collapsed ? conv.title : undefined}
            style={{ display: "flex", alignItems: "center", padding: "10px", borderRadius: 10, cursor: "pointer", background: activeId === conv.id ? "var(--bg-3)" : "transparent", transition: "all 0.2s", overflow: "hidden" }}
            className={activeId !== conv.id ? "hover:bg-[var(--bg-2)]" : ""}
          >
            <MessageSquare size={16} style={{ flexShrink: 0, color: activeId === conv.id ? "var(--brand)" : "var(--text-muted)", marginLeft: collapsed ? 3 : 0, transition: `all ${T}` }} />
            <div style={slideText({ display: "flex", alignItems: "center", gap: 8, flex: 1, paddingLeft: 10, minWidth: 0 })}>
              <p style={{ fontSize: 13, fontWeight: activeId === conv.id ? 600 : 500, color: activeId === conv.id ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, flex: 1 }}>{conv.title || "Cuộc trò chuyện"}</p>

              {/* Nút xóa chat hiển thị mượt mà hơn */}
              {hoveredId === conv.id && (
                <button className="flex items-center justify-center p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 bg-transparent border-none cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); /* handle delete */ }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Profile Info Card */}
        <div
          onClick={() => isLoggedIn && navigate("/usersProfile")}
          style={{ display: "flex", alignItems: "center", cursor: isLoggedIn ? "pointer" : "default", padding: "6px", borderRadius: 12, border: "1px solid transparent", transition: "all 0.2s" }}
          className={isLoggedIn ? "hover:bg-[var(--bg-2)] hover:border-[var(--border)]" : ""}
        >
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", color: "var(--text-secondary)", marginLeft: collapsed ? 1 : 0, transition: `all ${T}` }}>
            <User size={18} />
          </div>
          <div style={slideText({ paddingLeft: 12, flex: 1 })}>
            {isLoggedIn ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{username || "Tài khoản"}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", fontWeight: 500 }}>Xem hồ sơ</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Khách</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Chưa đăng nhập</p>
              </>
            )}
          </div>
        </div>


        {/* Tùy chỉnh Theme Cục Bộ */}
        <div style={{ display: "flex", gap: 8, opacity: collapsed ? 0 : 1, transition: `opacity ${T}`, maxHeight: collapsed ? 0 : 40, overflow: "hidden" }}>

          {/* Nút Sáng/Tối */}
          <button
            onClick={() => setChatDarkMode?.(!chatDarkMode)}
            style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-1)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}
            className="hover:bg-[var(--bg-2)] hover:text-[var(--text-primary)]"
          >
            {chatDarkMode ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-blue-500" />}
            {chatDarkMode ? "Sáng" : "Tối"}
          </button>

          {/* Nút Chọn Màu */}
          <div style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center", height: 36, padding: "0 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-1)", position: "relative", transition: "all 0.2s" }} className="hover:bg-[var(--bg-2)]">
            <Palette size={15} color="var(--text-secondary)" style={{ position: "absolute", left: 10, pointerEvents: "none" }} />
            <input
              type="color"
              value={chatColor || "#1a5fb4"}
              onChange={e => setChatColor?.(e.target.value)}
              style={{ width: 24, height: 24, opacity: 0, cursor: "pointer", padding: 0 }}
              title="Đổi màu chủ đạo Chat"
            />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: chatColor || "#1a5fb4", marginLeft: 15, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)", flexShrink: 0 }} />
          </div>

        </div>

        {/* Auth Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              title={collapsed ? "Đăng xuất" : undefined}
              style={{ display: "flex", alignItems: "center", height: 38, width: "100%", borderRadius: 10, background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              className="hover:bg-red-500/10 hover:text-red-500"
            >
              <div style={{ width: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><LogOut size={18} /></div>
              <span style={slideText({ paddingLeft: 8 })}>Đăng xuất</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              title={collapsed ? "Đăng nhập" : undefined}
              style={{ display: "flex", alignItems: "center", height: 40, width: "100%", borderRadius: 10, background: "var(--brand)", border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              className="hover:brightness-110 active:scale-95"
            >
              <div style={{ width: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><LogIn size={18} /></div>
              <span style={slideText({ paddingLeft: 8 })}>Đăng nhập ngay</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}