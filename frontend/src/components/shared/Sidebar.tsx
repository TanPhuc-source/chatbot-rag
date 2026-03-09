import { useState } from "react";
import { Plus, MessageSquare, Trash2, Sparkles, User, ChevronRight, ChevronLeft } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void; // đóng drawer mobile
}

export default function Sidebar({ collapsed = false, onToggle, onClose }: Props) {
  const { conversations, activeId, clearMessages, setActiveConversation } = useChatStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleNew = () => {
    clearMessages();
    onClose?.(); // đóng sidebar mobile
  };

  const handleSelect = (id: string) => {
    setActiveConversation(id);
    onClose?.(); // đóng sidebar mobile
  };

  return (
    <aside
      className="sidebar-panel flex flex-col h-full shrink-0"
      style={{ width: collapsed ? 60 : 260, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ padding: collapsed ? "16px 12px" : "20px 16px 16px", borderBottom: "1px solid var(--sb-border)", transition: "padding 0.25s" }}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", marginBottom: collapsed ? 0 : 14 }}>
          {collapsed ? (
            <button onClick={onToggle} style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", boxShadow: "0 4px 14px rgba(26,95,180,0.45)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <Sparkles size={15} color="white" />
            </button>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="sb-logo-icon"><Sparkles size={15} color="white" /></div>
                <div>
                  <p className="font-display sb-title">Trợ lý AI TTNN–TH</p>
                  <p className="sb-sub">ĐH Đồng Tháp</p>
                </div>
              </div>
              <button onClick={onToggle} style={{ padding: 5, borderRadius: 7, border: "none", background: "var(--sb-badge-bg)", cursor: "pointer", color: "var(--sb-muted)", display: "flex", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--sb-btn-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--sb-muted)"}
              >
                <ChevronLeft size={14} />
              </button>
            </>
          )}
        </div>

        {/* New chat button */}
        {!collapsed && (
          <button onClick={handleNew} className="sb-new-btn">
            <Plus size={14} /> Cuộc trò chuyện mới
          </button>
        )}
        {collapsed && (
          <button onClick={handleNew} style={{ width: 36, height: 36, borderRadius: 10, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sb-btn-bg)", border: "1px solid var(--sb-btn-border)", cursor: "pointer", color: "var(--sb-btn-text)", transition: "all 0.15s" }}
            title="Cuộc trò chuyện mới"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Chat list */}
      <nav className="sb-nav" style={{ padding: collapsed ? "10px 12px" : "10px" }}>
        {conversations.length === 0 && !collapsed && (
          <div className="sb-empty">
            <div className="sb-empty-icon"><MessageSquare size={16} /></div>
            <p>Chưa có cuộc trò chuyện</p>
          </div>
        )}
        {conversations.length === 0 && collapsed && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <MessageSquare size={14} style={{ color: "var(--sb-icon)", opacity: 0.4 }} />
          </div>
        )}

        {conversations.map((conv, idx) => (
          <div
            key={conv.id}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: collapsed ? "9px" : "8px 10px",
              borderRadius: 8, cursor: "pointer",
              justifyContent: collapsed ? "center" : undefined,
              background: activeId === conv.id ? "var(--sb-active-bg)" : "transparent",
              transition: "background 0.15s",
              marginTop: idx === 0 ? 0 : 2,
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
            <MessageSquare size={12} style={{ flexShrink: 0, color: activeId === conv.id ? "var(--sb-active-icon)" : "var(--sb-icon)" }} />
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: activeId === conv.id ? 500 : 400, color: activeId === conv.id ? "var(--sb-active-text)" : "var(--sb-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                    {conv.title || "Cuộc trò chuyện"}
                  </p>
                </div>
                {hoveredId === conv.id && (
                  <button className="sb-trash-btn" onClick={e => e.stopPropagation()}>
                    <Trash2 size={11} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? "12px" : "12px", borderTop: "1px solid var(--sb-border)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : undefined, gap: 10 }}>
        <div className="sb-avatar" style={{ flexShrink: 0 }}><User size={13} /></div>
        {!collapsed && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--sb-text)", margin: 0, lineHeight: 1.2 }}>Chế độ khách</p>
            <p style={{ fontSize: 10, color: "var(--sb-muted)", margin: "2px 0 0", lineHeight: 1 }}>Lịch sử không được lưu</p>
          </div>
        )}
      </div>
    </aside>
  );
}
