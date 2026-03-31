import { useCallback, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

const uid = () => crypto.randomUUID();
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

  // ✅ FIX: Đồng bộ convIdRef mỗi khi activeId thay đổi
  // useRef chỉ khởi tạo 1 lần khi mount, nên cần useEffect để cập nhật
  useEffect(() => {
    convIdRef.current = activeId;
  }, [activeId]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isStreaming) return;

      // Thêm message của user
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: question,
        createdAt: new Date(),
      };
      addMessage(userMsg);

      // Placeholder cho assistant đang stream
      const assistantMsg: Message = {
        id: uid(),
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
                dbId: data.assistant_message_id,
              };
            }
            return { messages: msgs, isStreaming: false };
          });
        },

        // onError
        (err) => {
          const friendlyMessage = err.includes("429") || err.includes("rate_limit") || err.includes("Rate limit")
            ? "Xin lỗi bạn, hệ thống đang bận quá tải. Bạn vui lòng thử lại sau ít phút nhé! 🙏"
            : err.includes("401") || err.includes("403")
            ? "Xin lỗi bạn, hệ thống đang gặp sự cố xác thực. Vui lòng thử lại sau nhé!"
            : err.includes("Lỗi kết nối") || err.includes("network") || err.includes("fetch")
            ? "Xin lỗi bạn, không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại nhé!"
            : "Xin lỗi bạn, hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút nhé! 🙏";
          useChatStore.setState((s) => {
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = {
                ...last,
                content: friendlyMessage,
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