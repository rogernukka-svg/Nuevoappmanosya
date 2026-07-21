import AppShell from "@/components/layout/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <AppShell role="admin" title="Admin">
      <AdminDashboard />
    </AppShell>
  );
}
