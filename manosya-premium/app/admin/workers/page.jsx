import AppShell from "@/components/layout/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminWorkersPage() {
  return (
    <AppShell role="admin" title="Trabajadores">
      <AdminDashboard title="Control de trabajadores" />
    </AppShell>
  );
}
