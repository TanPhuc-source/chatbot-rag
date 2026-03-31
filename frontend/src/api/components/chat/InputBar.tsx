import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 130) + "px";
    }
  };

  const canSend = value.trim() && !disabled;

  return (
    <div
      ref={wrapperRef}
      style={{
        padding: "clamp(10px, 2vh, 16px) clamp(16px, 4vw, 28px)",
        paddingBottom: "max(clamp(10px, 2vh, 16px), env(safe-area-inset-bottom))",
        background: "color-mix(in srgb, var(--bg-base) 70%, transparent)",
        backdropFilter: "blur(10px)",
        //borderTop: "1px solid var(--border)",
        flexShrink: 0,
        position: "relative",
        zIndex: 20,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          className="input-glass"
          style={{
            position: "relative",
            borderRadius: 24,
            border: "2px solid var(--border-mid)",
            background: "var(--bg-2)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--brand)";
            e.currentTarget.style.boxShadow = `0 0 0 4px var(--brand-glow), 0 8px 24px rgba(0,0,0,0.08)`;
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--border-mid)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.04)";
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKey}
            placeholder="Nhập câu hỏi của bạn…"
            rows={1}
            disabled={disabled}
            style={{
              display: "block",
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "clamp(14px, 2.5vw, 16px)",
              lineHeight: 1.6,
              color: "var(--text-primary)",
              padding: "clamp(12px, 2.5vh, 16px) 56px clamp(10px, 2vh, 14px) clamp(16px, 3vw, 22px)",
              minHeight: "clamp(48px, 8vh, 60px)",
              maxHeight: 130,
              boxSizing: "border-box",
              fontFamily: "inherit",
              opacity: disabled ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canSend ? "pointer" : "default",
                background: canSend
                  ? "linear-gradient(145deg, var(--brand), #2563eb)"
                  : "var(--bg-3)",
                color: canSend ? "white" : "var(--text-muted)",
                boxShadow: canSend ? "0 6px 16px var(--brand-glow)" : "none",
                transition: "all 0.2s ease",
                transform: canSend ? "scale(1)" : "scale(0.95)",
                flexShrink: 0,
              }}
            >
              {disabled ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
          </div>
        </div>
        <p
          className="hidden lg:block"
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: 8,
            opacity: 0.7,
          }}
        >
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  );
}