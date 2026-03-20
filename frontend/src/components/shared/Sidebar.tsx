import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // Thêm import createPortal
import {
  Plus,
  MessageSquare,
  Trash2,
  User,
  ChevronLeft,
  LogIn,
  LogOut,
  ChevronUp,
  X,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";
import { useSettingsStore } from "@/store/settingsStore";
import logoImage from "../images/images.jpg";

const SCHOOL_INFO = {
  LOGO_URL: logoImage, // Đường dẫn đến logo của trường
  schoolName: "Trường Đại học Đồng Tháp", // Tên trường
  schoolDept: "Trung Tâm Ngoại Ngữ Và Tin Học" // Khoa/Phòng ban
};

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle, onClose }: Props) {
  // const { conversations, activeId, clearMessages, setActiveConversation } =
  //   useChatStore();
  const { settings, fetchSettings } = useSettingsStore();
  const {
    conversations,
    activeId,
    clearMessages,
    loadHistory,
    selectConversation,
    deleteConversation
  } = useChatStore();

  const { isLoggedIn, logout, init } = useAuthStore() as any;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const response = await axios.get("http://127.0.0.1:8000/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentUser(response.data);
          loadHistory(token); // Tải lịch sử cuộc trò chuyện sau khi lấy được thông tin người dùng

        } catch (error) {
          console.error("Lỗi lấy thông tin user:", error);
        }
      }
    };
    fetchUserData();
  }, [loadHistory]);

  const T = "0.28s cubic-bezier(0.4,0,0.2,1)";

  const handleNew = () => {
    clearMessages();
    onClose?.();
  };
  // Sửa lại hàm handleSelect
  const handleSelect = (id: string) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      selectConversation(id, token); // Gọi hàm khôi phục tin nhắn từ DB
    }
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    clearMessages();
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(false);
    window.location.reload();
  };

  const slideText = (extraStyle?: React.CSSProperties): React.CSSProperties => ({
    overflow: "hidden",
    whiteSpace: "nowrap",
    maxWidth: collapsed ? 0 : 999,
    opacity: collapsed ? 0 : 1,
    transition: `max-width ${T}, opacity ${T}`,
    ...extraStyle,
  });

  const displayName = currentUser?.full_name || currentUser?.username || "Tài khoản";
  const avatarSrc = currentUser?.avatar_url
    ? `http://127.0.0.1:8000${currentUser.avatar_url}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=0D8ABC&color=fff&bold=true`;

  return (
    <>
      <style>{`
        /* CSS cho User Menu Portal (Thoát khỏi Sidebar) */
        .user-menu-portal {
          position: fixed;
          z-index: 10000;
          background: var(--bg-1);
          border-radius: 16px;
          border: 1px solid var(--border);
          box-shadow: 0 12px 28px rgba(0,0,0,0.15);
          overflow: hidden;
          padding: 8px;
          /* Vị trí Desktop mặc định (khi mở rộng) */
          bottom: 80px;
          left: 14px;
          width: 270px;
          animation: slide-up 0.2s ease-out forwards;
        }

        .user-menu-portal.is-collapsed {
          /* Vị trí Desktop khi thu gọn */
          bottom: 16px;
          left: 86px;
          width: 220px;
        }

        @media (max-width: 1024px) {
          /* Mobile & Tablet: Nằm chính giữa màn hình */
          .user-menu-portal, .user-menu-portal.is-collapsed {
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            margin: auto;
            height: fit-content;
            width: 90%;
            max-width: 320px;
          }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ─── DÙNG PORTAL CHO MENU USER ĐỂ THOÁT KHỎI SIDEBAR ─── */}
      {isUserMenuOpen && createPortal(
        <>
          {/* Overlay mờ che toàn màn hình */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setIsUserMenuOpen(false)}
          />
          {/* Menu Box */}
          <div className={`user-menu-portal ${collapsed ? 'is-collapsed' : ''}`}>
            {isLoggedIn || currentUser ? (
              <>
                <div
                  onClick={() => {
                    navigate("/usersProfile");
                    setIsUserMenuOpen(false);
                    onClose?.(); // Đóng sidebar mobile sau khi chuyển trang
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    cursor: "pointer", borderRadius: 10, color: "var(--text-primary)",
                    fontSize: 14, fontWeight: 500, transition: "background 0.15s",
                  }}
                  className="hover:bg-[var(--bg-2)]"
                >
                  <User size={16} color="var(--brand)" /> Thông tin tài khoản
                </div>
                <div style={{ height: 1, background: "var(--border)", margin: "4px 0", opacity: 0.6 }} />
                <div
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    cursor: "pointer", borderRadius: 10, color: "#ef4444",
                    fontSize: 14, fontWeight: 500, transition: "background 0.15s",
                  }}
                  className="hover:bg-red-500/10"
                >
                  <LogOut size={16} /> Đăng xuất
                </div>
              </>
            ) : (
              <div
                onClick={() => {
                  navigate("/login");
                  setIsUserMenuOpen(false);
                  onClose?.();
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  cursor: "pointer", borderRadius: 10, color: "var(--brand)",
                  fontSize: 14, fontWeight: 500, transition: "background 0.15s",
                }}
                className="hover:bg-[var(--bg-2)]"
              >
                <LogIn size={16} /> Đăng nhập
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      {/* ─── DÙNG PORTAL CHO MODAL XÁC NHẬN ĐĂNG XUẤT ─── */}
      {showLogoutConfirm && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: "var(--bg-1)", padding: 28, borderRadius: 24,
              width: "90%", maxWidth: 360, boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: "var(--text-primary)", fontWeight: 700 }}>
                Xác nhận
              </h3>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ margin: "0 0 28px", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "10px 18px", borderRadius: 12, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-primary)", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, transition: "background 0.2s",
                }}
                className="hover:bg-[var(--bg-2)]"
              >
                Hủy
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 18px", borderRadius: 12, border: "none",
                  background: "#ef4444", color: "#fff", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, transition: "background 0.2s",
                }}
                className="hover:bg-red-600"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── NỘI DUNG SIDEBAR GỐC ─── */}
      <aside
        className="flex flex-col h-full shrink-0 relative z-50"
        style={{
          width: collapsed ? 72 : 300,
          transition: `width ${T}`,
          overflow: "visible",
          background: "var(--sb-bg)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", padding: collapsed ? "18px 14px 14px" : "24px 14px 14px", gap: 18, position: "relative" }}>

          {/* Nút thu gọn (chỉ hiện khi Sidebar đang mở rộng) */}
          {!collapsed && (
            <button
              onClick={onToggle}
              style={{ position: "absolute", top: 12, right: 12, padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)" }}
              className="hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Khu vực Logo & Tiêu đề */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: collapsed ? 0 : 12, transition: "all 0.3s ease" }}>

            {/* Logo to ở trên khi mở rộng, thu nhỏ thành nút khi gập lại */}
            <div
              onClick={collapsed ? onToggle : undefined}
              style={{
                width: collapsed ? 44 : 80,
                height: collapsed ? 44 : 80,
                borderRadius: collapsed ? "50%" : 20,
                border: collapsed ? "2px solid var(--border)" : "none",
                overflow: "hidden",
                cursor: collapsed ? "pointer" : "default",
                padding: collapsed ? 2 : 0,
                background: "var(--bg-1)",
                transition: "all 0.3s ease",
                boxShadow: collapsed ? "none" : "0 8px 24px rgba(0,0,0,0.08)",
                flexShrink: 0
              }}
              className={collapsed ? "hover:scale-105 active:scale-95" : ""}
              title={collapsed ? "Mở rộng Sidebar" : undefined}
            >
              <img src={SCHOOL_INFO.LOGO_URL} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: collapsed ? "50%" : 20 }} />
            </div>

            {/* Tên trường & Trung tâm (chỉ hiển thị khi mở rộng) */}
            <div style={slideText({ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" })}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", lineHeight: 1.4, whiteSpace: "normal" }}>
                {settings.schoolName}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--brand)", margin: 0, opacity: 0.9, lineHeight: 1.4, whiteSpace: "normal" }}>
                {settings.schoolDept}
              </p>
            </div>
          </div>

          <button
            onClick={handleNew}
            title={collapsed ? "Cuộc trò chuyện mới" : undefined}
            style={{ display: "flex", alignItems: "center", width: "100%", height: 44, overflow: "hidden", background: "var(--bg-1)", border: "1px solid var(--border)", cursor: "pointer", padding: 0, borderRadius: 12, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, transition: "all 0.2s", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}
            className="hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-md"
          >
            <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Plus size={20} />
            </div>
            <span style={slideText({ paddingLeft: 4 })}>Cuộc trò chuyện mới</span>
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "0 14px", opacity: 0.5 }} />

        {/* Chat list */}
        <nav style={{ padding: "14px", flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>
          {conversations.length === 0 && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 24, opacity: collapsed ? 1 : 0, transition: `opacity ${T}`, position: collapsed ? "static" : "absolute", pointerEvents: "none", width: "100%" }}>
              <MessageSquare size={18} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            </div>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={collapsed ? conv.title : undefined}
              style={{ display: "flex", alignItems: "center", height: 44, padding: 0, borderRadius: 12, cursor: "pointer", background: activeId === conv.id ? "var(--bg-3)" : "transparent", transition: "all 0.2s", overflow: "hidden" }}
              className={activeId !== conv.id ? "hover:bg-[var(--bg-2)]" : ""}
            >
              <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageSquare size={18} style={{ color: activeId === conv.id ? "var(--brand)" : "var(--text-muted)", transition: `color ${T}` }} />
              </div>

              <div style={slideText({ display: "flex", alignItems: "center", flex: 1, paddingLeft: 8, paddingRight: 10, minWidth: 0 })}>
                <p style={{ fontSize: 14, fontWeight: activeId === conv.id ? 600 : 500, color: activeId === conv.id ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, flex: 1 }}>
                  {conv.title || "Cuộc trò chuyện"}
                </p>
                {hoveredId === conv.id && (
                  <button
                    className="flex items-center justify-center p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 bg-transparent border-none cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault(); // <-- THÊM DÒNG NÀY ĐỂ CHỐNG RELOAD TRANG
                      e.stopPropagation();
                      const token = localStorage.getItem("access_token");
                      if (token) {
                        deleteConversation(conv.id, token);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - user profile */}
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Profile card - Bấm để hiện popup menu qua Portal */}
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title={collapsed ? "Tài khoản" : undefined}
            style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: collapsed ? 0 : 8, height: collapsed ? 44 : "auto", borderRadius: 14, border: isUserMenuOpen ? "1px solid var(--border)" : "1px solid transparent", background: isUserMenuOpen ? "var(--bg-2)" : "transparent", transition: "all 0.2s" }}
            className="hover:bg-[var(--bg-2)] hover:border-[var(--border)]"
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", color: "var(--text-secondary)", flexShrink: 0, overflow: "hidden", border: "1px solid var(--border)", transition: `all ${T}` }}>
              {isLoggedIn || currentUser ? (
                <img src={avatarSrc} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={20} />
              )}
            </div>

            <div style={slideText({ paddingLeft: 12, flex: 1 })}>
              {isLoggedIn || currentUser ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      {currentUser?.role === "admin" ? "Quản trị viên" : "Người dùng"}
                    </p>
                  </div>
                  <ChevronUp size={18} style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isUserMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Khách</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Chưa đăng nhập</p>
                  </div>
                  <ChevronUp size={18} style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isUserMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}