import AppShell from "@/components/layout/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminAnalyticsPage() {
  return (
    <AppShell role="admin" title="Analytics">
      <AdminDashboard title="Metricas de crecimiento" />
    </AppShell>
  );
}
