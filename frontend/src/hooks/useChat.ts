import { useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import { useChatStore } from "@/store/chatStore";
import { useStream } from "./useStream";
import type { Message, SourceDoc } from "@/types";

export function useChat() {
  const {
    messages, activeId, isStreaming,
    addMessage, addConversation,
    setActiveConversation, setStreaming,
  } = useChatStore();

  const { streamChat } = useStream();
  const convIdRef = useRef<string | null>(activeId);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isStreaming) return;

      // Thêm message của user
      const userMsg: Message = {
        id: uuid(),
        role: "user",
        content: question,
        createdAt: new Date(),
      };
      addMessage(userMsg);

      // Placeholder cho assistant đang stream
      const assistantMsg: Message = {
        id: uuid(),
        role: "assistant",
        content: "",
        isStreaming: true,
        sources: [],
        createdAt: new Date(),
      };
      addMessage(assistantMsg);
      setStreaming(true);

      await streamChat(
        question,
        convIdRef.current,

        // onDone
        (data) => {
          convIdRef.current = data.conversation_id;
          setActiveConversation(data.conversation_id);

          // Tạo conversation mới nếu chưa có
          if (!activeId) {
            addConversation({
              id: data.conversation_id,
              title: question.slice(0, 50),
              updatedAt: new Date(),
            });
          }

          // Cập nhật sources vào message cuối
          useChatStore.setState((s) => {
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = {
                ...last,
                sources: data.sources,
                isStreaming: false,
              };
            }
            return { messages: msgs, isStreaming: false };
          });
        },

        // onError
        (err) => {
          useChatStore.setState((s) => {
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = {
                ...last,
                content: `⚠️ Lỗi: ${err}`,
                isStreaming: false,
              };
            }
            return { messages: msgs, isStreaming: false };
          });
        }
      );
    },
    [isStreaming, activeId, addMessage, addConversation, setActiveConversation, setStreaming, streamChat]
  );

  return { messages, isStreaming, sendMessage };
}
