"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import Brand from "@/components/layout/Brand";
import { pathForRole } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const options = [
  {
    role: "client",
    title: "Necesito ayuda",
    subtitle: "Ver trabajadores, pedir servicio y chatear.",
    icon: UserRound,
  },
  {
    role: "worker",
    title: "Ofrezco mi trabajo",
    subtitle: "Publicar perfil, recibir pedidos y crecer.",
    icon: BriefcaseBusiness,
  },
  {
    role: "supplier",
    title: "Vendo insumos",
    subtitle: "Mostrar productos a trabajadores y clientes.",
    icon: Store,
  },
];

export default function RoleSelectorPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("client");
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  async function saveRole(role = selectedRole) {
    if (!supabase) {
      toast.error("Faltan variables de Supabase.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error || new Error("Inicia sesion primero.");

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || "",
        role,
      });
      if (profileError) throw profileError;

      localStorage.setItem("app_role", role);
      router.replace(role === "worker" ? "/worker/onboard" : pathForRole(role));
    } catch (error) {
      toast.error(error?.message || "No se pudo guardar el rol.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="role-stage">
      <section className="role-frame">
        <header className="role-header">
          <Brand size="md" />
          <span>Elegir modo</span>
        </header>

        <div className="role-roger">
          <Image src="/roger-ok.png" alt="Roger ManosYA" width={260} height={300} priority />
        </div>

        <div className="role-copy">
          <h1>¿Como vas a usar ManosYA?</h1>
          <p>Elegimos tu experiencia inicial. Podés cambiarla luego desde tu perfil.</p>
        </div>

        <div className="role-options">
          {options.map((option) => {
            const Icon = option.icon;
            const active = selectedRole === option.role;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelectedRole(option.role)}
                onDoubleClick={() => saveRole(option.role)}
                className={active ? "active" : ""}
              >
                <Icon size={20} />
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.subtitle}</small>
                </span>
              </button>
            );
          })}
        </div>

        <button className="role-submit" onClick={() => saveRole()} disabled={busy}>
          {busy ? "Guardando..." : "Continuar"}
        </button>
      </section>
    </main>
  );
}
