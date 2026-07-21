import AppShell from "@/components/layout/AppShell";
import AccountScreen from "@/components/account/AccountScreen";

export default function SupplierProfilePage() {
  return (
    <AppShell role="supplier" title="Perfil">
      <AccountScreen role="supplier" />
    </AppShell>
  );
}
