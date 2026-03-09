import ChatWindow from "@/components/chat/ChatWindow";
import Sidebar from "@/components/shared/Sidebar";

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  );
}
