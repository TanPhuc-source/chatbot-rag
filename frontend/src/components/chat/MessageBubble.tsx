import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Sparkles, Copy, Check, AlertCircle } from "lucide-react";
import type { Message } from "@/types";
import SourceCard from "./SourceCard";

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
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6,
        color: copied ? "#10b981" : "var(--text-muted)",
        background: "var(--bg-3)", border: "1px solid var(--border)",
        cursor: "pointer", transition: "all 0.14s", flexShrink: 0,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in" style={{ alignItems: "flex-start" }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 12px rgba(26,95,180,0.30)" }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="bubble-ai" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 6 }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="animate-pulse-dot"
            style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

interface Props { message: Message; }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  // Typing indicator khi chưa có content
  if (!isUser && message.isStreaming && !message.content) {
    return <TypingIndicator />;
  }

  if (isUser) return (
    <div className="animate-slide-up" style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: "78%" }}>
        <div className="bubble-user" style={{ padding: "11px 16px" }}>
          <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{message.content}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-slide-up" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* Avatar */}
      <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#1a5fb4,#2a80d8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 12px rgba(26,95,180,0.28)", marginTop: 2 }}>
        <Sparkles size={13} color="white" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="bubble-ai" style={{ padding: "12px 16px" }}>
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span style={{ display: "inline-block", width: 2, height: 14, background: "var(--brand)", marginLeft: 2, animation: "pulse 1s ease infinite", verticalAlign: "middle" }} />
            )}
          </div>
        </div>

        {/* Footer: sources + copy */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, paddingLeft: 4 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {!message.isStreaming && message.sources?.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
          {!message.isStreaming && <CopyButton text={message.content} />}
        </div>
      </div>
    </div>
  );
}
