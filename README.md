# RAG Edu — Hệ thống tư vấn học thuật

## Tech Stack
- **Backend**: FastAPI + LangChain + ChromaDB/Pinecone
- **Frontend**: React 18 + Vite + React Router v6 + Zustand
- **LLM**: OpenAI GPT-4o / Gemini Pro

## Khởi động nhanh
```bash
cp .env.example .env
make dev
```

## Cấu trúc frontend
```
src/
├── routes/     # React Router v6 config + ProtectedRoute
├── pages/      # LoginPage, ChatPage, UploadPage, AdminPage
├── components/ # chat, upload, admin, shared
├── hooks/      # useChat, useStream, useUpload, useAuth
├── store/      # Zustand: authStore, chatStore
├── lib/        # axios instance, auth helpers
└── types/      # TypeScript interfaces
```
