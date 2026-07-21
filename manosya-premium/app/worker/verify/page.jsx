import AccountScreen from "@/components/account/AccountScreen";
import AppShell from "@/components/layout/AppShell";

export default function WorkerVerifyPage() {
  return (
    <AppShell role="worker" title="Verificar">
      <AccountScreen role="worker" showWorkerVerification />
    </AppShell>
  );
}
