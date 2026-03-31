import { create } from "zustand";
import type { Message, Conversation } from "@/types";

const API = "";

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  messages: Message[];
  isStreaming: boolean;
  // actions
  setActiveConversation: (id: string | null) => void;
  addConversation: (conv: Conversation) => void;
  setConversations: (convs: Conversation[]) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string, done?: boolean) => void;
  setStreaming: (val: boolean) => void;
  clearMessages: () => void;
  // async helpers — không cần token, cookie tự gửi
  loadHistory: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  isStreaming: false,

  setActiveConversation: (id) => set({ activeId: id }),
  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),
  setConversations: (convs) => set({ conversations: convs }),
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (content, done = false) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content, isStreaming: !done };
      }
      return { messages: msgs, isStreaming: !done };
    }),
  setStreaming: (val) => set({ isStreaming: val }),
  clearMessages: () => set({ messages: [], activeId: null }),

  // Fetch danh sách sessions từ DB — cookie HttpOnly tự gửi
  loadHistory: async () => {
    try {
      const res = await fetch(`${API}/history/sessions`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data: { id: number; title: string; created_at: string }[] = await res.json();
      const convs: Conversation[] = data.map((s) => ({
        id: String(s.id),
        title: s.title || "Cuộc trò chuyện",
        updatedAt: new Date(s.created_at),
      }));
      set({ conversations: convs });
    } catch { /* silent fail */ }
  },

  // Click vào session cũ → load messages từ DB
  selectConversation: async (id: string) => {
    set({ activeId: id, messages: [] });
    try {
      const res = await fetch(`${API}/history/sessions/${id}/messages`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data: { id: number; role: string; content: string; created_at: string }[] = await res.json();
      const msgs: Message[] = data.map((m) => ({
        id: String(m.id),
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: new Date(m.created_at),
        isStreaming: false,
        sources: [],
        dbId: m.id,
      }));
      set({ messages: msgs });
    } catch { /* silent fail */ }
  },

  deleteConversation: async (id: string) => {
    try {
      const res = await fetch(`${API}/history/sessions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return;

      const { conversations, activeId, selectConversation } = get();
      const updated = conversations.filter((c) => c.id !== id);
      set({ conversations: updated });

      if (activeId === id) {
        if (updated.length > 0) {
          selectConversation(updated[0].id);
        } else {
          set({ activeId: null, messages: [] });
        }
      }
    } catch {
      console.error("Lỗi khi xóa cuộc trò chuyện");
    }
  },
}));