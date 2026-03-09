import { Plus, MessageSquare, Trash2, BookOpen } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

export default function Sidebar() {
  const { conversations, activeId, clearMessages, setActiveConversation } = useChatStore();

  return (
    <div className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <BookOpen size={14} className="text-accent" />
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">FLIC</span>
        </div>
        <button
          onClick={clearMessages}
          className="w-full flex items-center gap-2 text-sm text-[#aaa] hover:text-white bg-border/40 hover:bg-border/70 rounded-xl px-3 py-2 transition-all"
        >
          <Plus size={15} />
          Cuộc hội thoại mới
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted text-center mt-8 px-4">Chưa có cuộc hội thoại nào</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-xl transition-all group ${
                activeId === conv.id
                  ? "bg-accent/10 border border-accent/20 text-white"
                  : "text-[#aaa] hover:bg-border/40 hover:text-white"
              }`}
            >
              <MessageSquare size={13} className="flex-shrink-0 opacity-60" />
              <span className="truncate flex-1">{conv.title}</span>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted">Trường Đại học Đồng Tháp</p>
      </div>
    </div>
  );
}
