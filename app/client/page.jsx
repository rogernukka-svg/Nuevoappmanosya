import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import FeedScreen from "@/components/feed/FeedScreen";

export default function ClientPage() {
  return (
    <AppShell role="client" title="Trabajadores cerca" immersive>
      <Suspense fallback={<div className="h-full rounded-[28px] bg-black" />}>
        <FeedScreen role="client" />
      </Suspense>
    </AppShell>
  );
}
