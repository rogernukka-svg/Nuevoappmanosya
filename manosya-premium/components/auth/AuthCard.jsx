"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail, LockKeyhole, UserRound } from "lucide-react";
import Brand from "@/components/layout/Brand";
import { pathForRole, roleChoices } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthCard({ mode = "login" }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Faltan variables de Supabase en .env.local");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 8) {
      toast.error("Revisa email y password minimo 8 caracteres.");
      return;
    }

    setBusy(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        router.replace(pathForRole(profile?.role));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
          },
        },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          email: cleanEmail,
          full_name: fullName.trim(),
          role,
        });
        if (profileError) throw profileError;

        if (role === "worker") {
          await supabase.from("worker_profiles").upsert({ user_id: userId, is_active: false });
        }

        if (role === "supplier") {
          await supabase.from("supplier_profiles").upsert({ user_id: userId, is_active: false });
        }
      }

      router.replace(role === "worker" ? "/worker/onboard" : pathForRole(role));
    } catch (error) {
      toast.error(error?.message || "No se pudo completar la accion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full items-center justify-center bg-[var(--color-primary)] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[32px] bg-white p-5 shadow-[var(--shadow-hard)]">
        <div className="rounded-[26px] bg-[var(--color-primary)] px-5 py-8 text-center">
          <Brand size="lg" />
          <p className="mt-3 text-sm font-black text-black/68">
            {isLogin ? "Volver al ecosistema de trabajo." : "Crear tu puerta de entrada a ManosYA."}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {!isLogin && (
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase text-black/50">Nombre</span>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-black/42" size={18} />
                <input className="field pl-11" placeholder="Tu nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase text-black/50">Email</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/42" size={18} />
              <input className="field pl-11" placeholder="tu@email.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase text-black/50">Password</span>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-black/42" size={18} />
              <input className="field pl-11" placeholder="Minimo 8 caracteres" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </label>

          {!isLogin && (
            <div className="grid gap-2 pt-1">
              {roleChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setRole(choice.value)}
                  className={`rounded-2xl border p-3 text-left active:scale-[0.99] ${choice.value === role ? "border-black bg-[var(--color-primary)]" : "border-black/10 bg-[var(--color-paper)]"}`}
                >
                  <span className="block text-sm font-black">{choice.title}</span>
                  <span className="mt-1 block text-xs font-bold text-black/55">{choice.description}</span>
                </button>
              ))}
            </div>
          )}

          <button className="btn-primary btn-mint w-full" disabled={busy}>
            {busy ? "Procesando..." : isLogin ? "Entrar" : "Crear cuenta"}
            <ArrowRight size={18} />
          </button>
        </div>

        <p className="mt-5 text-center text-sm font-bold text-black/55">
          {isLogin ? "No tenes cuenta?" : "Ya tenes cuenta?"}{" "}
          <Link className="font-black text-black" href={isLogin ? "/register" : "/login"}>
            {isLogin ? "Registrate" : "Inicia sesion"}
          </Link>
        </p>
      </form>
    </section>
  );
}
