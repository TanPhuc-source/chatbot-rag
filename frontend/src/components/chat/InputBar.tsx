import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  return (
    <div className="relative flex items-end gap-3 bg-surface border border-border rounded-2xl px-4 py-3 focus-within:border-accent/40 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); handleInput(); }}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Hỏi bất kỳ điều gì về tài liệu..."
        rows={1}
        className="flex-1 bg-transparent resize-none outline-none text-sm text-[#e0e0e0] placeholder:text-muted leading-relaxed max-h-40 disabled:opacity-50"
        style={{ fontFamily: "var(--font-sans)" }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 hover:bg-accent/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {disabled
          ? <Loader2 size={14} className="text-bg animate-spin" />
          : <ArrowUp size={14} className="text-bg font-bold" />
        }
      </button>
    </div>
  );
}
