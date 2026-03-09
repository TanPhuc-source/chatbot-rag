import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Message } from "@/types";
import SourceCard from "./SourceCard";

interface Props { message: Message; }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fadeUp ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar assistant */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-accent text-xs font-bold">F</span>
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-accent/15 border border-accent/20 text-white rounded-br-sm"
              : "bg-surface border border-border text-[#e0e0e0] rounded-bl-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              {message.isStreaming && !message.content ? (
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blink" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blink" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blink" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {message.content}
                </ReactMarkdown>
              )}
              {message.isStreaming && message.content && (
                <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-blink align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.sources.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
        )}
      </div>

      {/* Avatar user */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-[#1e1e2e] border border-border flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-muted text-xs">U</span>
        </div>
      )}
    </div>
  );
}
