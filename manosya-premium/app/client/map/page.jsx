import AppShell from "@/components/layout/AppShell";
import ClientMapScreen from "@/components/maps/ClientMapScreen";

export default function ClientMapPage() {
  return (
    <AppShell role="client" title="Mapa">
      <ClientMapScreen />
    </AppShell>
  );
}
