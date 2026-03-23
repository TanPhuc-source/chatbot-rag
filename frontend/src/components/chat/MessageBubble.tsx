import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Sparkles, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Message } from "@/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title={copied ? "Đã sao chép" : "Sao chép"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        color: copied ? "#10b981" : "var(--text-muted)",
        background: "var(--bg-3)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
      className="hover:bg-[var(--bg-2)] hover:border-[var(--brand)]"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function FeedbackButtons({ messageId }: { messageId: number }) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (r: "up" | "down") => {
    // Cho phép đổi rating, chỉ block khi đang load hoặc nhấn lại đúng rating
    if (isLoading || rating === r) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/feedback/${messageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: r }),
      });
      if (res.ok) setRating(r);
    } catch { }
    finally {
      setIsLoading(false);
    }
  };

  const btnStyle = (r: "up" | "down") => ({
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 30,
    height: 30,
    borderRadius: 8,
    border: rating === r
      ? `1px solid ${r === "up" ? "#86efac" : "#fca5a5"}`
      : "1px solid var(--border)",
    cursor: (isLoading || rating === r) ? "default" as const : "pointer" as const,
    transition: "all 0.15s ease",
    flexShrink: 0 as const,
    background: rating === r
      ? (r === "up" ? "#dcfce7" : "#fee2e2")
      : "var(--bg-3)",
    color: rating === r
      ? (r === "up" ? "#16a34a" : "#dc2626")
      : "var(--text-muted)",
    opacity: isLoading ? 0.6 : 1,
    transform: rating === r ? "scale(1.1)" : "scale(1)",
  });

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        onClick={() => submit("up")}
        title={rating === "up" ? "Đã đánh giá hữu ích" : "Hữu ích"}
        disabled={isLoading}
        style={btnStyle("up")}
        className={rating !== "up" ? "hover:bg-[var(--bg-2)] hover:border-[var(--brand)]" : ""}
      >
        <ThumbsUp size={12} />
      </button>
      <button
        onClick={() => submit("down")}
        title={rating === "down" ? "Đã đánh giá không hữu ích" : "Không hữu ích"}
        disabled={isLoading}
        style={btnStyle("down")}
        className={rating !== "down" ? "hover:bg-[var(--bg-2)] hover:border-[var(--brand)]" : ""}
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className="flex gap-3 animate-fade-in"
      style={{ alignItems: "flex-start" }}
    >
      <div
        style={{
          width: "clamp(32px, 5vw, 40px)",
          height: "clamp(32px, 5vw, 40px)",
          borderRadius: 12,
          background: "linear-gradient(145deg, var(--brand), #2a80d8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 6px 16px var(--brand-glow)",
        }}
      >
        <Sparkles size={16} color="white" />
      </div>
      <div
        className="bubble-ai"
        style={{
          padding: "clamp(12px, 2.5vh, 16px) clamp(16px, 3vw, 22px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-2)",
          borderRadius: 20,
          border: "1px solid var(--border)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-pulse-dot"
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--brand)",
              animation: `pulse 1.2s ease infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  if (!isUser && message.isStreaming && !message.content) {
    return <TypingIndicator />;
  }

  if (isUser)
    return (
      <div
        className="animate-slide-up"
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <div style={{ maxWidth: "80%" }}>
          <div
            className="bubble-user"
            style={{
              padding: "clamp(10px, 2.2vh, 14px) clamp(14px, 3vw, 20px)",
              background: "var(--brand)",
              color: "white",
              borderRadius: 22,
              borderBottomRightRadius: 4,
              boxShadow: "0 6px 16px var(--brand-glow)",
            }}
          >
            <p
              style={{
                fontSize: "clamp(14px, 2.5vw, 16px)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div
      className="animate-slide-up"
      style={{
        display: "flex",
        gap: "clamp(10px, 2.5vw, 16px)",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "clamp(32px, 5vw, 40px)",
          height: "clamp(32px, 5vw, 40px)",
          borderRadius: 12,
          background: "linear-gradient(145deg, var(--brand), #2a80d8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 6px 16px var(--brand-glow)",
          marginTop: 4,
        }}
      >
        <Sparkles size={16} color="white" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="bubble-ai"
          style={{
            padding: "clamp(12px, 2.5vh, 16px) clamp(16px, 3vw, 22px)",
            background: "var(--bg-2)",
            borderRadius: 22,
            borderBottomLeftRadius: 4,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
          }}
        >
          <div className="prose-chat" style={{ color: "var(--text-primary)" }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 16,
                  background: "var(--brand)",
                  marginLeft: 4,
                  animation: "pulse 1s ease infinite",
                  verticalAlign: "middle",
                }}
              />
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            paddingLeft: 4,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} />
          {!message.isStreaming && (
            <div style={{ display: "flex", gap: 6 }}>
              {message.dbId && <FeedbackButtons messageId={message.dbId} />}
              <CopyButton text={message.content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}