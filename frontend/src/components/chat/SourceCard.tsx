import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { SourceDoc } from "@/types";

interface Props {
  source: SourceDoc;
}

export default function SourceCard({ source }: Props) {
  const [open, setOpen] = useState(false);
  const name = source.source_file.replace(/\.[^/.]+$/, "");
  const page = source.first_page ? ` · tr.${source.first_page}` : "";

  return (
    <div
      style={{
        fontSize: 12,
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--bg-1)",
        overflow: "hidden",
        maxWidth: 260,
        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        transition: "box-shadow 0.2s",
      }}
      className="hover:shadow-md"
    >
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        className="hover:bg-[var(--bg-2)]"
      >
        <FileText size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
        >
          {name}
          {page}
        </span>
        {open ? (
          <ChevronUp size={12} style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
        )}
      </button>
      {open && (
        <div
          style={{
            padding: "8px 12px 10px",
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            fontSize: 12,
            background: "var(--bg-2)",
          }}
        >
          {source.excerpt}
        </div>
      )}
    </div>
  );
}