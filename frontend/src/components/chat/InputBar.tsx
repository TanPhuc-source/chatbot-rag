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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 130) + "px"; }
  };

  const canSend = value.trim() && !disabled;

  return (
    <div ref={wrapperRef} style={{ padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", background: "transparent", flexShrink: 0, position: "relative", zIndex: 20 }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div
          className="input-glass"
          style={{ position: "relative", borderRadius: 20, border: "1.5px solid var(--border-mid)", boxShadow: "0 4px 24px rgba(26,95,180,0.08), 0 1px 4px rgba(12,26,46,0.06)", transition: "border-color 0.15s, box-shadow 0.15s" }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--brand-glow), 0 4px 24px rgba(26,95,180,0.12)"; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(26,95,180,0.08), 0 1px 4px rgba(12,26,46,0.06)"; }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { setValue(e.target.value); handleInput(); }}
            onKeyDown={handleKey}
            placeholder="Nhập câu hỏi của bạn…"
            rows={1}
            disabled={disabled}
            style={{ display: "block", width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", padding: "14px 52px 10px 18px", minHeight: 50, maxHeight: 130, boxSizing: "border-box", fontFamily: "inherit", opacity: disabled ? 0.5 : 1 }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{ position: "absolute", right: 10, bottom: 10, width: 34, height: 34, borderRadius: 11, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSend ? "pointer" : "default", background: canSend ? "linear-gradient(135deg,#1a5fb4,#2a80d8)" : "var(--bg-3)", color: canSend ? "white" : "var(--text-muted)", boxShadow: canSend ? "0 3px 12px rgba(26,95,180,0.38)" : "none", transition: "all 0.16s", transform: canSend ? "scale(1)" : "scale(0.92)" }}
          >
            {disabled
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : <ArrowUp size={14} />
            }
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 7, opacity: 0.7 }}>
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  );
}
