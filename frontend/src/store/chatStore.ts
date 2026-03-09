import { create } from "zustand";
import type { Message, Conversation } from "@/types";

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  messages: Message[];
  isStreaming: boolean;
  // actions
  setActiveConversation: (id: string | null) => void;
  addConversation: (conv: Conversation) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string, done?: boolean) => void;
  setStreaming: (val: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeId: null,
  messages: [],
  isStreaming: false,

  setActiveConversation: (id) => set({ activeId: id }),
  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (content, done = false) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = {
          ...last,
          content,
          isStreaming: !done,
        };
      }
      return { messages: msgs, isStreaming: !done };
    }),
  setStreaming: (val) => set({ isStreaming: val }),
  clearMessages: () => set({ messages: [], activeId: null }),
}));
