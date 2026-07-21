import AppShell from "@/components/layout/AppShell";
import ClientMapScreen from "@/components/maps/ClientMapScreen";

export default function WorkerMapPage() {
  return (
    <AppShell role="worker" title="Mapa">
      <ClientMapScreen audience="worker" />
    </AppShell>
  );
}
