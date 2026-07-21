import AppShell from "@/components/layout/AppShell";
import ClientMapScreen from "@/components/maps/ClientMapScreen";

export default function SupplierMapPage() {
  return (
    <AppShell role="supplier" title="Mapa">
      <ClientMapScreen audience="supplier" />
    </AppShell>
  );
}
