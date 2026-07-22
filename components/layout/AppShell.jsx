"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Home, MapPinned, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Brand from "./Brand";

const roleHome = {
  client: "/client",
  worker: "/worker/feed",
  supplier: "/supplier",
  admin: "/admin",
};

const roleProfile = {
  client: "/client/profile",
  worker: "/worker/profile",
  supplier: "/supplier/profile",
  admin: "/admin",
};

const navByRole = {
  client: [
    { href: "/client", label: "Feed", icon: Home },
    { href: "/client/map", label: "Mapa", icon: MapPinned },
    { href: "/dm", label: "Mensajes", icon: MessageCircle },
    { href: "/client/profile", label: "Perfil", icon: UserRound },
  ],
  worker: [
    { href: "/worker/feed", label: "Feed", icon: Home },
    { href: "/worker/jobs", label: "Trabajos", icon: BriefcaseBusiness },
    { href: "/dm", label: "Mensajes", icon: MessageCircle },
    { href: "/worker/map", label: "Mapa", icon: MapPinned },
    { href: "/worker/profile", label: "Perfil", icon: UserRound },
  ],
  supplier: [
    { href: "/supplier", label: "Feed", icon: Home },
    { href: "/dm", label: "Mensajes", icon: MessageCircle },
    { href: "/supplier/map", label: "Mapa", icon: MapPinned },
    { href: "/supplier/profile", label: "Perfil", icon: UserRound },
  ],
  admin: [
    { href: "/admin", label: "Ops", icon: Home },
    { href: "/admin/workers", label: "Workers", icon: UserRound },
    { href: "/admin/analytics", label: "Datos", icon: BarChart3 },
    { href: "/dm", label: "Inbox", icon: MessageCircle },
  ],
};

export default function AppShell({ role = "auto", title, children, action, immersive = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const requestedRole = role === "auto" ? "auto" : normalizeRole(role);
  const [resolvedRole, setResolvedRole] = useState(requestedRole === "auto" ? null : requestedRole);
  const isMapScreen = title === "Mapa";

  useEffect(() => {
    let alive = true;

    async function resolveRole() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (alive && requestedRole === "auto") setResolvedRole("client");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const actualRole = normalizeRole(data?.role);
      if (!alive) return;
      if (!actualRole) {
        if (requestedRole === "auto") setResolvedRole("client");
        return;
      }

      if (requestedRole === "auto") {
        setResolvedRole(actualRole);
        return;
      }

      const protectedRole = ["client", "worker", "supplier", "admin"].includes(requestedRole);
      const canStay = actualRole === requestedRole || actualRole === "admin";
      if (protectedRole && !canStay) {
        const target = roleTarget(actualRole, pathname);
        if (target !== pathname) router.replace(target);
      }
    }

    resolveRole();
    return () => {
      alive = false;
    };
  }, [pathname, requestedRole, router, supabase]);

  const shellRole = resolvedRole || "client";
  const roleReady = requestedRole !== "auto" || Boolean(resolvedRole);
  const isWorkerProfile = shellRole === "worker" && title === "Perfil";
  const isWorkerVerify = shellRole === "worker" && title === "Verificar";
  const nav = isWorkerProfile
    ? navByRole.worker.map((item) =>
        item.label === "Perfil"
          ? { href: "/worker/verify", label: "Verificar", icon: ShieldCheck }
          : item
      )
    : navByRole[shellRole] || navByRole.client;
  const headerAction = action || (
    isWorkerProfile ? (
      <Link href="/worker/verify" aria-label="Verificacion ManosYA">
        <ShieldCheck size={19} />
      </Link>
    ) : isWorkerVerify ? (
      <Link href="/worker/profile" aria-label="Volver al perfil">
        <UserRound size={19} />
      </Link>
    ) : (
      <UserRound size={19} />
    )
  );

  if (immersive) {
    return <section className="h-[100dvh] w-full overflow-hidden bg-black">{children}</section>;
  }

  return (
    <section className={`premium-shell${isMapScreen ? " premium-shell-map" : ""}`}>
      {!isMapScreen ? (
        <header className="safe-x flex items-center justify-between pt-4">
          <Link href="/" aria-label="ManosYA inicio" className="rounded-full bg-[var(--color-primary)] px-4 py-3 text-[var(--color-ink)]">
            <Brand size="sm" />
          </Link>
          <div className="min-w-0 px-3 text-center">
            <p className="truncate text-sm font-black">{title}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
            {headerAction}
          </div>
        </header>
      ) : null}

      <div className={isMapScreen ? "screen map-screen-slot" : "screen safe-x py-4"}>{children}</div>

      {roleReady ? (
        <nav
          className={`safe-x safe-bottom grid gap-2 border-t border-black/5 bg-white/92 pt-2 backdrop-blur-2xl${isMapScreen ? " map-shell-nav" : ""}`}
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        >
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black text-black/58 active:scale-95">
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </section>
  );
}

function normalizeRole(value) {
  return ["client", "worker", "supplier", "admin"].includes(value) ? value : null;
}

function roleTarget(role, pathname = "") {
  if (pathname.includes("/profile") || pathname.includes("/verify")) return roleProfile[role] || roleHome[role] || "/";
  return roleHome[role] || "/";
}
