"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getServiceLabel, normalizeService } from "@/lib/services/catalog";
import { readServiceIntent } from "@/lib/services/intent";

export default function NewJobAssistant() {
  const searchParams = useSearchParams();
  const [serviceSlug, setServiceSlug] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const stored = readServiceIntent();
    const nextService = normalizeService(searchParams.get("service") || stored?.serviceSlug || "");
    const nextText = searchParams.get("intent") || stored?.text || "";
    if (nextService) setServiceSlug(nextService);
    if (nextText) setDescription(nextText);
  }, [searchParams]);

  const serviceName = useMemo(
    () => serviceSlug ? getServiceLabel(serviceSlug) : "Servicio",
    [serviceSlug]
  );

  return (
    <section className="request-minimal">
      <div className="request-chip"><Sparkles size={14} />Pedido</div>
      <h1>{serviceName}</h1>
      <p>Conta lo minimo. Te mostramos trabajadores listos.</p>

      <label className="request-field">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej: no prende una llave, necesito revisar hoy..."
        />
      </label>

      <Link className="request-primary" href={`/client?service=${encodeURIComponent(serviceSlug)}&intent=${encodeURIComponent(description)}`}>
        Ver trabajadores
        <ArrowRight size={20} />
      </Link>
    </section>
  );
}
