import AppShell from "@/components/layout/AppShell";
import AccountScreen from "@/components/account/AccountScreen";

export default function ClientProfilePage() {
  return (
    <AppShell role="client" title="Perfil">
      <AccountScreen role="client" />
    </AppShell>
  );
}
