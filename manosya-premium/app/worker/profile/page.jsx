import AppShell from "@/components/layout/AppShell";
import AccountScreen from "@/components/account/AccountScreen";

export default function WorkerProfilePage() {
  return (
    <AppShell role="worker" title="Perfil">
      <AccountScreen role="worker" showWorkerStudio />
    </AppShell>
  );
}
