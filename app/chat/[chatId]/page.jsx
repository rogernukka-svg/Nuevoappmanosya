import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage({ params }) {
  return (
    <AppShell title="Chat">
      <ChatPanel title={`Chat ${params.chatId}`} chatId={params.chatId} />
    </AppShell>
  );
}
