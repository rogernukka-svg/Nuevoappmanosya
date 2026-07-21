"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WorkerReelFeed from "./WorkerReelFeed";
import { readServiceIntent } from "@/lib/services/intent";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function FeedScreen({ role = "client" }) {
  const searchParams = useSearchParams();
  const [workers, setWorkers] = useState(null);
  const [intent, setIntent] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const storedIntent = readServiceIntent();
      const canUseStoredIntent = storedIntent?.role === role || (!storedIntent?.role && role === "client");
      const service = searchParams.get("service") || (canUseStoredIntent ? storedIntent?.serviceSlug : "") || "";
      const urgency = searchParams.get("urgency") || (canUseStoredIntent ? storedIntent?.urgency : "") || "";
      const text = searchParams.get("intent") || (canUseStoredIntent ? storedIntent?.text : "") || "";

      if (alive && (service || text)) {
        setIntent({ serviceSlug: service, urgency, text });
      }

      try {
        const query = service ? `?service=${encodeURIComponent(service)}` : "";
        const response = await fetch(`/api/workers${query}`, { cache: "no-store" });
        const payload = await response.json();
        let feedItems = Array.isArray(payload.workers) ? payload.workers : [];

        if (role === "supplier") {
          const supabase = createSupabaseBrowserClient();
          const { data: products } = await supabase
            .from("supplier_products")
            .select("id,supplier_id,title,description,price,service_slug,media_url,created_at")
            .eq("is_active", true)
            .not("media_url", "is", null)
            .order("created_at", { ascending: false })
            .limit(12);

          const supplierProducts = (products || []).filter((product) => product.service_slug !== "__cover__");
          const supplierIds = [...new Set(supplierProducts.map((item) => item.supplier_id).filter(Boolean))];
          let supplierMap = new Map();

          if (supplierIds.length) {
            const { data: suppliers } = await supabase
              .from("supplier_profiles")
              .select("user_id,business_name,category,city,is_active")
              .in("user_id", supplierIds);

            supplierMap = new Map((suppliers || []).map((item) => [item.user_id, item]));
          }

          const supplierItems = supplierProducts.map((product) => supplierProductToFeedItem(product, supplierMap.get(product.supplier_id)));
          feedItems = [...feedItems, ...supplierItems];
        }

        if (alive && (Array.isArray(payload.workers) || role === "supplier")) {
          setWorkers(feedItems);
        }
      } catch {
        if (alive) setWorkers(null);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [searchParams, role]);

  return (
    <div className="relative h-full">
      <WorkerReelFeed workers={workers?.length ? workers : undefined} role={role} intent={intent} />
    </div>
  );
}

function supplierProductToFeedItem(product, supplier) {
  const mediaUrl = product.media_url || "";
  return {
    id: `supplier-${product.id}`,
    name: supplier?.business_name || "Proveedor ManosYA",
    trade: product.title || supplier?.category || "Producto disponible",
    city: supplier?.city || "Local digital",
    distance: supplier?.city || "Local",
    rating: "4.9",
    jobs: 0,
    available: supplier?.is_active ? "Stock" : "Nuevo",
    likes: "0",
    comments: "0",
    saves: "0",
    caption: product.description || "Stock listo para trabajadores y clientes.",
    image: mediaUrl,
    mediaUrl,
    mediaType: /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl) ? "video" : "image",
  };
}
