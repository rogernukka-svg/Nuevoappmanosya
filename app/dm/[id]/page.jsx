import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";

export default function DirectMessagePage({ params }) {
  return (
    <AppShell title="Mensaje directo">
      <ChatPanel title={`DM ${params.id}`} chatId={params.id} />
    </AppShell>
  );
}
