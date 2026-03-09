import { useEffect, useRef } from "react";
import { BookOpen } from "lucide-react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
  const { messages, isStreaming, sendMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll khi có message mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 max-w-3xl mx-auto w-full">
        <InputBar onSend={sendMessage} disabled={isStreaming} />
        <p className="text-center text-xs text-muted mt-3">
          FLIC có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    "Học phí lớp Python cơ bản là bao nhiêu?",
    "Sinh viên hộ nghèo được giảm bao nhiêu % học phí?",
    "Lịch thi VSTEP năm 2025 như thế nào?",
    "Cách đăng ký lớp ngoại ngữ online?",
  ];

  const { sendMessage } = useChat();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 text-center px-4">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <BookOpen size={28} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">FLIC</h1>
          <p className="text-muted text-sm mt-1">Trợ lý tư vấn học thuật · Trung tâm Ngoại ngữ & Tin học</p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => sendMessage(s)}
            className="text-left text-sm px-4 py-3 rounded-xl bg-surface border border-border text-[#aaa] hover:border-accent/30 hover:text-white hover:bg-accent/5 transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
