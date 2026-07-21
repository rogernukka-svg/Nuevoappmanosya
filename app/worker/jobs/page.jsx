import AppShell from "@/components/layout/AppShell";
import JobList from "@/components/jobs/JobList";

export default function WorkerJobsPage() {
  return (
    <AppShell role="worker" title="Mis trabajos">
      <JobList title="Mis trabajos" />
    </AppShell>
  );
}
