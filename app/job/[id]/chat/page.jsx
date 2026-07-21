import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";

export default function JobChatPage({ params }) {
  return (
    <AppShell title="Chat del trabajo">
      <ChatPanel title={`Trabajo ${params.id}`} chatId={params.id} />
    </AppShell>
  );
}
