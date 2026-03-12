export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceDoc[];
  isStreaming?: boolean;
  createdAt: Date;
  dbId?: number;  // ID tin nhắn trong PostgreSQL (dùng cho feedback)
}

export interface SourceDoc {
  source_file: string;
  first_page?: number | null;
  excerpt: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
}