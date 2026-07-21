import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import NewJobAssistant from "@/components/jobs/NewJobAssistant";

export default function NewJobPage() {
  return (
    <AppShell role="client" title="Nuevo pedido">
      <Suspense fallback={<div className="panel h-full" />}>
        <NewJobAssistant />
      </Suspense>
    </AppShell>
  );
}
