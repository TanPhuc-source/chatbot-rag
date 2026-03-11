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
    <div ref={wrapperRef} style={{ padding: "clamp(8px, 2vw, 14px) clamp(12px, 3vw, 24px)", paddingBottom: "max(clamp(8px, 2vw, 14px), env(safe-area-inset-bottom))", background: "transparent", flexShrink: 0, position: "relative", zIndex: 20 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div
          className="input-glass"
          style={{ position: "relative", borderRadius: 18, border: "1.5px solid var(--border-mid)", boxShadow: "0 4px 24px rgba(26,95,180,0.08), 0 1px 4px rgba(12,26,46,0.06)", transition: "border-color 0.15s, box-shadow 0.15s" }}
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
            style={{ display: "block", width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontSize: "clamp(13px, 2.5vw, 15px)", lineHeight: 1.6, color: "var(--text-primary)", padding: "clamp(10px, 2vw, 15px) 52px clamp(8px, 1.5vw, 11px) clamp(12px, 2.5vw, 20px)", minHeight: "clamp(42px, 7vw, 54px)", maxHeight: 130, boxSizing: "border-box", fontFamily: "inherit", opacity: disabled ? 0.5 : 1 }}
          />
          <div style={{ position: "absolute", right: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{ width: 32, height: 32, borderRadius: 10, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSend ? "pointer" : "default", background: canSend ? "linear-gradient(135deg,#1a5fb4,#2a80d8)" : "var(--bg-3)", color: canSend ? "white" : "var(--text-muted)", boxShadow: canSend ? "0 3px 12px rgba(26,95,180,0.38)" : "none", transition: "all 0.16s", transform: canSend ? "scale(1)" : "scale(0.92)", flexShrink: 0 }}
            >
              {disabled
                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                : <ArrowUp size={14} />
              }
            </button>
          </div>
        </div>
        <p className="hidden lg:block" style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 7, opacity: 0.7 }}>
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  );
}