import Link from "next/link";
import { ArrowRight, UploadCloud } from "lucide-react";
import AppShell from "@/components/layout/AppShell";

export default function WorkerOnboardPage() {
  return (
    <AppShell role="worker" title="Publicar">
      <section className="publish-minimal">
        <div className="publish-icon"><UploadCloud size={30} /></div>
        <h1>Subi tu trabajo.</h1>
        <p>Un video claro vende mas que un formulario largo.</p>
        <button type="button">Elegir video</button>
        <Link href="/worker/feed">
          Ver feed
          <ArrowRight size={20} />
        </Link>
      </section>
    </AppShell>
  );
}
