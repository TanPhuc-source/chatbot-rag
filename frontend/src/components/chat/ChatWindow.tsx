import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { useChat } from "@/hooks/useChat";

const SUGGESTIONS = [
  { icon: "🎓", text: "Thủ tục đăng ký thi VSTEP như thế nào?" },
  { icon: "💰", text: "Học phí các khóa ngoại ngữ là bao nhiêu?" },
  { icon: "📜", text: "Trung tâm có những chứng chỉ tiếng Anh nào?" },
  { icon: "📅", text: "Lịch khai giảng các khóa học sắp tới?" },
];

function WelcomeScreen({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "clamp(20px, 4vw, 36px)", padding: "clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)", overflowY: "auto" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: "clamp(14px, 3vw, 24px)" }}>
          <div style={{ width: "clamp(64px, 10vw, 88px)", height: "clamp(64px, 10vw, 88px)", borderRadius: 26, background: "linear-gradient(135deg,#1a5fb4 0%,#2a80d8 60%,#0ea5e9 100%)", boxShadow: "0 8px 32px rgba(26,95,180,0.35), 0 0 0 10px rgba(26,95,180,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={32} color="white" />
          </div>
          <span style={{ position: "absolute", bottom: 5, right: 5, width: 12, height: 12, borderRadius: "50%", background: "#10b981", border: "2px solid var(--bg-base)", display: "block", boxShadow: "0 0 0 2px rgba(16,185,129,0.3)" }} />
        </div>
        <h2 className="font-display" style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Xin chào! 👋
        </h2>
        <p style={{ fontSize: "clamp(13px, 2.5vw, 16px)", color: "var(--brand)", margin: "0 0 6px", fontWeight: 500 }}>Tôi có thể giúp gì cho bạn?</p>
        <p style={{ fontSize: "clamp(11px, 2vw, 13px)", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Trợ lý AI · Trung tâm Ngoại ngữ &amp; Tin học · ĐH Đồng Tháp
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 640 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textAlign: "center", marginBottom: "clamp(10px, 2vw, 16px)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Câu hỏi thường gặp
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(8px, 2vw, 12px)" }}>
          {SUGGESTIONS.map(({ icon, text }) => (
            <button
              key={text}
              onClick={() => onSuggest(text)}
              className="suggest-card"
              style={{ display: "flex", alignItems: "flex-start", gap: "clamp(8px, 2vw, 12px)", padding: "clamp(10px, 2.5vw, 15px) clamp(10px, 2.5vw, 16px)", borderRadius: 14, textAlign: "left", background: "var(--bg-1)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              <span style={{ fontSize: "clamp(16px, 3vw, 22px)", lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <span style={{ fontSize: "clamp(11px, 2vw, 14px)", color: "var(--text-secondary)", fontWeight: 500, lineHeight: 1.45 }}>{text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { messages, isStreaming, sendMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {messages.length === 0 ? (
        <WelcomeScreen onSuggest={sendMessage} />
      ) : (
        <div className="messages-scroll" style={{ padding: "clamp(16px, 3vw, 28px) clamp(12px, 3vw, 24px)" }}>
          <div style={{ maxWidth: 860, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
      <InputBar onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}