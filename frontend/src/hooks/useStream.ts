import { useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import type { SourceDoc } from "@/types";

interface StreamDoneData {
  conversation_id: string;
  sources: SourceDoc[];
  chunks_used: number;
  assistant_message_id: number;
}

export function useStream() {
  const { updateLastMessage, setStreaming } = useChatStore();

  const streamChat = useCallback(
    async (
      question: string,
      conversationId: string | null,
      onDone: (data: StreamDoneData) => void,
      onError: (err: string) => void
    ) => {
      setStreaming(true);

      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch("/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            question,
            conversation_id: conversationId,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw);

              if (event.type === "token") {
                accumulated += event.data;
                updateLastMessage(accumulated, false);
              } else if (event.type === "done") {
                updateLastMessage(accumulated, true);
                onDone(event.data);
              } else if (event.type === "error") {
                onError(event.data);
                setStreaming(false);
                return;
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      } catch (err: any) {
        onError(err.message || "Lỗi kết nối");
        setStreaming(false);
      }
    },
    [updateLastMessage, setStreaming]
  );

  return { streamChat };
}