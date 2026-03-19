import { useEffect, useRef } from "react";
import { Sparkles, Zap } from "lucide-react";
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "clamp(28px, 6vh, 48px)",
        padding: "clamp(24px, 5vw, 48px) clamp(20px, 4vw, 36px)",
        overflowY: "auto",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 600 }}>
        <div
          style={{
            position: "relative",
            display: "inline-block",
            marginBottom: "clamp(16px, 4vh, 28px)",
          }}
        >
          <div
            style={{
              width: "clamp(72px, 12vw, 96px)",
              height: "clamp(72px, 12vw, 96px)",
              borderRadius: 32,
              background: "linear-gradient(145deg, var(--brand), #2a80d8, #0ea5e9)",
              boxShadow: "0 12px 32px var(--brand-glow), 0 0 0 8px color-mix(in srgb, var(--brand) 12%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={36} color="white" />
          </div>
          <span
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#10b981",
              border: "3px solid var(--bg-base)",
              display: "block",
              boxShadow: "0 0 0 2px rgba(16,185,129,0.3)",
            }}
          />
        </div>
        <h2
          style={{
            fontSize: "clamp(24px, 5vw, 34px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Xin chào! 👋
        </h2>
        <p
          style={{
            fontSize: "clamp(15px, 2.8vw, 18px)",
            color: "var(--brand)",
            margin: "0 0 8px",
            fontWeight: 500,
          }}
        >
          Tôi có thể giúp gì cho bạn?
        </p>
        <p
          style={{
            fontSize: "clamp(12px, 2.2vw, 14px)",
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Trợ lý AI · Trung tâm Ngoại ngữ & Tin học · ĐH Đồng Tháp
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 720 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "clamp(12px, 2.5vh, 18px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Câu hỏi thường gặp
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "clamp(10px, 2vw, 14px)",
          }}
        >
          {SUGGESTIONS.map(({ icon, text }) => (
            <button
              key={text}
              onClick={() => onSuggest(text)}
              className="suggest-card"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "clamp(10px, 2vw, 14px)",
                padding: "clamp(12px, 2.5vh, 16px) clamp(14px, 3vw, 18px)",
                borderRadius: 18,
                textAlign: "left",
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backdropFilter: "blur(4px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand)";
                e.currentTarget.style.boxShadow = "0 8px 20px var(--brand-glow)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.02)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span
                style={{
                  fontSize: "clamp(18px, 3.5vw, 24px)",
                  lineHeight: 1,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {icon}
              </span>
              <span
                style={{
                  fontSize: "clamp(12px, 2.2vw, 15px)",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {text}
              </span>
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--bg-base)",
      }}
    >
      {messages.length === 0 ? (
        <WelcomeScreen onSuggest={sendMessage} />
      ) : (
        <div
          className="messages-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "clamp(20px, 4vh, 32px) clamp(16px, 3vw, 28px)",
          }}
        >
          <div
            style={{
              maxWidth: 900,
              width: "100%",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
      <InputBar onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}