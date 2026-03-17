import { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, User, ChevronLeft, LogIn, LogOut, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";

// Đảm bảo đường dẫn này trỏ đúng đến file ảnh của bạn. 
import logoImage from '../images/images.jpg';

const SCHOOL_INFO = {
  LOGO_URL: logoImage,
  NAME: "Trường Đại Học Đồng Tháp",
  DEPT: "Trung Tâm Ngoại Ngữ Và Tin Học"
};

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle, onClose }: Props) {
  const { conversations, activeId, clearMessages, setActiveConversation } = useChatStore();
  const { isLoggedIn, logout, init } = useAuthStore() as any;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // Thêm state quản lý modal đăng xuất
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await axios.get('http://127.0.0.1:8000/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data);
        } catch (error) {
          console.error("Lỗi lấy thông tin user:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const T = "0.28s cubic-bezier(0.4,0,0.2,1)";

  const handleNew = () => { clearMessages(); onClose?.(); };
  const handleSelect = (id: string) => { setActiveConversation(id); onClose?.(); };

  const handleLogout = () => {
    logout();
    clearMessages();
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(false); // Đóng modal
    window.location.reload();
  };

  const slideText = (extraStyle?: React.CSSProperties): React.CSSProperties => ({
    overflow: "hidden", whiteSpace: "nowrap", maxWidth: collapsed ? 0 : 999, opacity: collapsed ? 0 : 1, transition: `max-width ${T}, opacity ${T}`, ...extraStyle,
  });

  const displayName = currentUser?.full_name || currentUser?.username || "Tài khoản";
  const avatarSrc = currentUser?.avatar_url
    ? `http://127.0.0.1:8000${currentUser.avatar_url}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&bold=true`;

  return (
    <>
      {/* ── Overlay ẩn menu user ── */}
      {isUserMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setIsUserMenuOpen(false)} />
      )}

      {/* ── Modal Xác Nhận Đăng Xuất ── */}
      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
          <div className="animate-slide-up" style={{ background: "var(--bg-1, #ffffff)", padding: 24, borderRadius: 16, width: "90%", maxWidth: 340, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "var(--text-primary)", fontWeight: 700 }}>Xác nhận đăng xuất</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }}
                className="hover:bg-[var(--bg-2)]"
              >
                Hủy
              </button>
              <button
                onClick={handleLogout}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }}
                className="hover:bg-red-600"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="flex flex-col h-full shrink-0 relative z-50" style={{ width: collapsed ? 68 : 300, transition: `width ${T}`, overflow: "visible", background: "var(--sb-bg)", borderRight: "1px solid var(--border)" }}>
        {/* ── Header ── */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", padding: "16px 14px 14px", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", height: 40 }}>
            <div
              onClick={onToggle}
              style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: "2px solid var(--border)", overflow: "hidden", cursor: "pointer", padding: 2, background: "var(--bg-1)", transition: `all ${T}` }}
              className="hover:scale-105 active:scale-95"
              title="Thu gọn Sidebar"
            >
              <img src={SCHOOL_INFO.LOGO_URL} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            </div>

            <div style={slideText({ display: "flex", alignItems: "center", flex: 1, paddingLeft: 12, gap: 4 })}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p className="font-display" style={{ fontSize: 11, margin: 0, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>
                  {SCHOOL_INFO.NAME}
                </p>
                <p style={{ margin: "2px 0 0 0", color: "var(--brand)", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>
                  {SCHOOL_INFO.DEPT}
                </p>
              </div>

              <button onClick={onToggle} style={{ flexShrink: 0, padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", display: "flex", transition: "all 0.2s" }} className="hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]">
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
          {/* Pop-up Info */}
          {isUserMenuOpen && (
            <div style={{
              position: "absolute",
              // Nếu thu gọn, đặt nó ngang hàng với nút. Nếu mở rộng, đặt lên trên.
              bottom: collapsed ? 16 : "calc(100% - 10px)",
              // Nếu thu gọn, đẩy sang phải văng ra ngoài. Nếu mở rộng, cách lề trái 14px.
              left: collapsed ? "calc(100% + 10px)" : 14,
              // Hủy lề phải khi thu gọn
              right: collapsed ? "auto" : 14,
              // Đặt chiều rộng cố định 220px khi thu gọn
              width: collapsed ? 220 : "auto",
              background: "var(--bg-1)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              overflow: "hidden",
              zIndex: 50,
              padding: 6
            }}>
              {isLoggedIn || currentUser ? (
                <>
                  <div onClick={() => { navigate("/usersProfile"); setIsUserMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }} className="hover:bg-[var(--bg-2)]">
                    <User size={16} color="var(--brand)" /> Thông tin tài khoản
                  </div>
                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0", opacity: 0.6 }} />
                  {/* Sửa onClick tại đây để gọi state hiển thị modal */}
                  <div onClick={() => { setIsUserMenuOpen(false); setShowLogoutConfirm(true); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", borderRadius: 8, color: "#ef4444", fontSize: 13, fontWeight: 500 }} className="hover:bg-red-500/10">
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
              {isLoggedIn || currentUser ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                />
              ) : (
                <User size={18} />
              )}
            </div>

            <div style={slideText({ paddingLeft: 12, flex: 1 })}>
              {isLoggedIn || currentUser ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                      {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
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