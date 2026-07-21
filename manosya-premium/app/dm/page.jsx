import AppShell from "@/components/layout/AppShell";
import InboxPanel from "@/components/chat/InboxPanel";

export default function DmPage() {
  return (
    <AppShell title="Mensajes">
      <InboxPanel />
    </AppShell>
  );
}
