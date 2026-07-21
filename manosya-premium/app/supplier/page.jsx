import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import FeedScreen from "@/components/feed/FeedScreen";

export default function SupplierPage() {
  return (
    <AppShell role="supplier" title="Proveedor" immersive>
      <Suspense fallback={<div className="h-full rounded-[28px] bg-black" />}>
        <FeedScreen role="supplier" />
      </Suspense>
    </AppShell>
  );
}
