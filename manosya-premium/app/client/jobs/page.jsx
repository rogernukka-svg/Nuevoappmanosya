import AppShell from "@/components/layout/AppShell";
import JobList from "@/components/jobs/JobList";

export default function ClientJobsPage() {
  return (
    <AppShell role="client" title="Mis pedidos">
      <JobList title="Mis pedidos" />
    </AppShell>
  );
}
