import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { SourceDoc } from "@/types";

interface Props { source: SourceDoc; }

export default function SourceCard({ source }: Props) {
  const [open, setOpen] = useState(false);
  const name = source.source_file.replace(/\.[^/.]+$/, "");
  const page = source.first_page ? ` · tr.${source.first_page}` : "";

  return (
    <div className="text-xs rounded-xl border border-border bg-surface/60 overflow-hidden max-w-xs">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2 w-full hover:bg-border/30 transition-colors text-left"
      >
        <FileText size={12} className="text-accent flex-shrink-0" />
        <span className="text-[#aaa] truncate flex-1">{name}{page}</span>
        {open ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-0 text-muted border-t border-border/50 leading-relaxed">
          {source.excerpt}
        </div>
      )}
    </div>
  );
}
