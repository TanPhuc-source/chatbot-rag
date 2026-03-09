import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { SourceDoc } from "@/types";

interface Props { source: SourceDoc; }

export default function SourceCard({ source }: Props) {
  const [open, setOpen] = useState(false);
  const name = source.source_file.replace(/\.[^/.]+$/, "");
  const page = source.first_page ? ` · tr.${source.first_page}` : "";

  return (
    <div style={{ fontSize: 11, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)", overflow: "hidden", maxWidth: 240 }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", textAlign: "left" }}
      >
        <FileText size={11} style={{ color: "var(--brand)", flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}{page}</span>
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div style={{ padding: "6px 10px 8px", borderTop: "1px solid var(--border)", color: "var(--text-muted)", lineHeight: 1.5, fontSize: 11 }}>
          {source.excerpt}
        </div>
      )}
    </div>
  );
}
