import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import FeedScreen from "@/components/feed/FeedScreen";

export default function WorkerFeedPage() {
  return (
    <AppShell role="worker" title="Tu feed profesional" immersive>
      <Suspense fallback={<div className="h-full rounded-[28px] bg-black" />}>
        <FeedScreen role="worker" />
      </Suspense>
    </AppShell>
  );
}
