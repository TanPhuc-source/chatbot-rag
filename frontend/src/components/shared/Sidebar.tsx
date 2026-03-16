import { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, Sparkles, User, ChevronLeft, LogIn, LogOut, Moon, Sun, Palette, ChevronUp } from "lucide-react";
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

  const { isLoggedIn, username, full_name, avatar_url, role, logout, init } = useAuthStore() as any;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { init(); }, [init]);

  const T = "0.28s cubic-bezier(0.4,0,0.2,1)";
  const handleNew = () => { clearMessages(); onClose?.(); };
  const handleSelect = (id: string) => { setActiveConversation(id); onClose?.(); };
  const handleLogout = () => {
    logout();
    clearMessages();
    setIsUserMenuOpen(false);
    navigate("/");
  };

  const slideText = (extraStyle?: React.CSSProperties): React.CSSProperties => ({
    overflow: "hidden", whiteSpace: "nowrap", maxWidth: collapsed ? 0 : 999, opacity: collapsed ? 0 : 1, transition: `max-width ${T}, opacity ${T}`, ...extraStyle,
  });

  // ── FIX: LOGIC LẤY ẢNH ĐẠI DIỆN AN TOÀN ──
  const getAvatarSrc = () => {
    if (avatar_url) {
      if (avatar_url.startsWith('blob:') || avatar_url.startsWith('http')) {
        return avatar_url;
      }
      // Tự động xử lý dấu "/" để tránh lỗi http://127.0.0.1:8000uploads/...
      const path = avatar_url.startsWith('/') ? avatar_url : `/${avatar_url}`;
      return `http://127.0.0.1:8000${path}`;
    }
    return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
  };

  const avatarSrc = getAvatarSrc();
  const displayName = full_name || username || "Tài khoản";

  return (
    <>
      {isUserMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setIsUserMenuOpen(false)} />
      )}

      <aside className="flex flex-col h-full shrink-0 relative z-50" style={{ width: collapsed ? 68 : 300, transition: `width ${T}`, overflow: "hidden", background: "var(--sb-bg)", borderRight: "1px solid var(--border)" }}>

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", padding: "16px 14px 14px", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", height: 40 }}>
            <button onClick={onToggle} style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", boxShadow: "0 4px 14px rgba(26,95,180,0.3)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", padding: 0, transition: `all ${T}` }} className="hover:scale-105 active:scale-95">
              <Sparkles size={18} color="white" />
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

          <button onClick={handleNew} title={collapsed ? "Cuộc trò chuyện mới" : undefined} style={{ display: "flex", alignItems: "center", width: "100%", height: 40, overflow: "hidden", background: "var(--bg-1)", border: "1px solid var(--border)", cursor: "pointer", padding: 0, borderRadius: 10, color: "var(--text-primary)", fontSize: 13, fontWeight: 600, transition: `all 0.2s`, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }} className="hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm">
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Plus size={18} />
            </div>
            <span style={slideText({ paddingLeft: 4 })}>Cuộc trò chuyện mới</span>
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "0 14px", opacity: 0.5 }} />

        {/* ── Chat list ── */}
        <nav style={{ padding: "14px", flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>
          {conversations.length === 0 && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 20, opacity: collapsed ? 1 : 0, transition: `opacity ${T}`, position: collapsed ? "static" : "absolute", pointerEvents: "none", width: "100%" }}>
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
              style={{ display: "flex", alignItems: "center", height: 40, padding: 0, borderRadius: 10, cursor: "pointer", background: activeId === conv.id ? "var(--bg-3)" : "transparent", transition: "all 0.2s", overflow: "hidden" }}
              className={activeId !== conv.id ? "hover:bg-[var(--bg-2)]" : ""}
            >
              <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageSquare size={16} style={{ color: activeId === conv.id ? "var(--brand)" : "var(--text-muted)", transition: `color ${T}` }} />
              </div>

              <div style={slideText({ display: "flex", alignItems: "center", flex: 1, paddingLeft: 8, paddingRight: 10, minWidth: 0 })}>
                <p style={{ fontSize: 13, fontWeight: activeId === conv.id ? 600 : 500, color: activeId === conv.id ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, flex: 1 }}>{conv.title || "Cuộc trò chuyện"}</p>
                {hoveredId === conv.id && (
                  <button className="flex items-center justify-center p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 bg-transparent border-none cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>

          {/* Menu Dropdown Popup */}
          <div style={{ display: "flex", gap: 8, opacity: collapsed ? 0 : 1, transition: `opacity ${T}`, maxHeight: collapsed ? 0 : 40, overflow: "hidden" }}>
            <button
              onClick={() => setChatDarkMode?.(!chatDarkMode)}
              style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-1)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}
              className="hover:bg-[var(--bg-2)] hover:text-[var(--text-primary)]"
            >
              {chatDarkMode ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-blue-500" />}
              {chatDarkMode ? "Sáng" : "Tối"}
            </button>

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

          {/* Pop-up Info */}
          {isUserMenuOpen && (
            <div style={{ position: "absolute", bottom: "calc(100% - 10px)", left: 14, right: 14, background: "var(--bg-1)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 50, padding: 6 }}>
              {isLoggedIn ? (
                <>
                  <div onClick={() => { navigate("/usersProfile"); setIsUserMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }} className="hover:bg-[var(--bg-2)]">
                    <User size={16} color="var(--brand)" /> Thông tin tài khoản
                  </div>
                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0", opacity: 0.6 }} />
                  <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", borderRadius: 8, color: "#ef4444", fontSize: 13, fontWeight: 500 }} className="hover:bg-red-500/10">
                    <LogOut size={16} /> Đăng xuất
                  </div>
                </>
              ) : (
                <div onClick={() => { navigate("/login"); setIsUserMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", borderRadius: 8, color: "var(--brand)", fontSize: 13, fontWeight: 500 }} className="hover:bg-[var(--bg-2)]">
                  <LogIn size={16} /> Đăng nhập
                </div>
              )}
            </div>
          )}

          {/* Profile Card */}
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title={collapsed ? "Tài khoản" : undefined}
            style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: collapsed ? 0 : 8, height: collapsed ? 40 : "auto", borderRadius: 12, border: isUserMenuOpen ? "1px solid var(--border)" : "1px solid transparent", background: isUserMenuOpen ? "var(--bg-2)" : "transparent", transition: "all 0.2s" }}
            className="hover:bg-[var(--bg-2)] hover:border-[var(--border)]"
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", color: "var(--text-secondary)", flexShrink: 0, overflow: "hidden", border: "1px solid var(--border)", transition: `all ${T}` }}>
              {isLoggedIn ? (
                <img src={avatarSrc} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
              ) : (
                <User size={18} />
              )}
            </div>

            <div style={slideText({ paddingLeft: 12, flex: 1 })}>
              {isLoggedIn ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                      {role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </p>
                  </div>
                  <ChevronUp size={16} style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isUserMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Khách</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Chưa đăng nhập</p>
                  </div>
                  <ChevronUp size={16} style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isUserMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
              )}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}