"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, LockKeyhole, Mail, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import Brand from "@/components/layout/Brand";
import { pathForRole } from "@/lib/auth/roles";
import { SERVICE_CATALOG, normalizeService } from "@/lib/services/catalog";
import { buildServiceIntent, clearServiceIntent, intentToQuery, saveServiceIntent } from "@/lib/services/intent";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const serviceHints = {
  plomeria: ["plomero", "plomeria", "agua", "canilla", "cano", "perdida"],
  electricidad: ["electricista", "electricidad", "luz", "enchufe", "termica", "cable"],
  limpieza: ["limpieza", "limpiar", "casa", "oficina"],
  jardineria: ["jardin", "jardineria", "pasto", "cesped", "patio"],
  fletes: ["flete", "mudanza", "camion", "muebles"],
  "auxilio-vehicular": ["grua", "auto", "bateria", "rueda", "auxilio"],
};

const quickPrompts = {
  client: ["necesito plomero", "electricista", "limpieza", "flete"],
  worker: ["soy plomero", "hago electricidad", "limpieza premium", "fletes"],
  supplier: ["vendo cables", "herramientas", "pintura", "materiales"],
};

export default function AssistedAuth({ mode = "login" }) {
  const router = useRouter();
  const isLoginRoute = mode === "login";
  const [stage, setStage] = useState("welcome");
  const [authMode, setAuthMode] = useState(isLoginRoute ? "login" : "register");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [need, setNeed] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [noticeEmail, setNoticeEmail] = useState("");

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const detected = useMemo(() => detectNeed(need, role), [need, role]);
  const prompt = buildPrompt({ stage, authMode, fullName, role, detected });
  const rogerImage = "/roger-ok.png";
  const canGoBack = stage !== "welcome";

  function goBack() {
    const order = authMode === "login"
      ? ["welcome", "email", "password", "done"]
      : ["welcome", "name", "role", "need", "email", "password", "done"];
    const index = order.indexOf(stage);
    setStage(order[Math.max(0, index - 1)] || "welcome");
  }

  function chooseLogin() {
    setNoticeEmail("");
    clearServiceIntent();
    setAuthMode("login");
    setNeed("");
    setRole("");
    setStage("email");
  }

  function chooseRegister() {
    setNoticeEmail("");
    setAuthMode("register");
    setNeed("");
    setRole("");
    setStage("name");
  }

  function nextFromInput() {
    if (stage === "name") {
      if (fullName.trim().length < 3) {
        toast.error("Pone tu nombre completo.");
        return;
      }
      setStage("role");
      return;
    }

    if (stage === "need") {
      setStage("email");
      return;
    }

    if (stage === "email") {
      if (!email.includes("@")) {
        toast.error("Pone un correo valido.");
        return;
      }
      setStage("password");
    }
  }

  async function finish() {
    if (!supabase) {
      toast.error("Faltan variables de Supabase en .env.local");
      return;
    }
    if (!email.includes("@") || password.length < 8) {
      toast.error("Email valido y password minimo 8 caracteres.");
      return;
    }

    const finalRole = authMode === "login" ? "" : detected.role || role || "client";
    const intentPayload = buildServiceIntent({
      role: finalRole || "client",
      serviceSlug: authMode === "login" ? "" : detected.serviceSlug,
      urgency: authMode === "login" ? "normal" : detected.urgency,
      text: authMode === "login" ? "" : need,
      source: authMode,
    });
    if (authMode !== "login") {
      saveServiceIntent(intentPayload);
    }

    async function routeWithSession(sessionUserId, preferredRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionUserId)
        .maybeSingle();

      const nextRole = profile?.role || preferredRole;
      const target = authMode === "login"
        ? (nextRole ? pathForRole(nextRole) : "/role-selector")
        : (nextRole === "worker" ? "/worker/onboard" : targetPathForIntent(nextRole, intentPayload));
      router.replace(authMode === "login" ? target : withIntent(target, intentPayload));
    }

    async function tryExistingLogin() {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (loginError) throw loginError;
      await routeWithSession(loginData.user.id, finalRole);
    }

    setBusy(true);
    try {
      if (authMode === "login") {
        clearServiceIntent();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        await routeWithSession(data.user.id, finalRole);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: finalRole,
            intent: need,
            service_slug: detected.serviceSlug,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        const message = String(error.message || "").toLowerCase();
        const canRetryLogin =
          error.status === 429 ||
          message.includes("already") ||
          message.includes("security purposes") ||
          message.includes("too many");

        if (canRetryLogin) {
          await tryExistingLogin();
          return;
        }

        throw error;
      }

      const userId = data.session?.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: finalRole,
        });
        if (profileError) throw profileError;

        if (finalRole === "worker") {
          await supabase.from("worker_profiles").upsert({
            user_id: userId,
            skills: detected.serviceSlug ? [detected.serviceSlug] : [],
            is_active: false,
          });
        }

        if (finalRole === "supplier") {
          await supabase.from("supplier_profiles").upsert({
            user_id: userId,
            category: categoryForSupplier(need, detected),
            is_active: false,
          });
        }
      }

      if (!data.session) {
        setNoticeEmail(email.trim().toLowerCase());
        setStage("check-email");
        toast.success("Cuenta creada. Revisa tu correo para activar el acceso.");
        return;
      }

      await routeWithSession(data.session.user.id, finalRole);
    } catch (error) {
      toast.error(error?.message || "No se pudo completar la accion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wizard-auth">
      <section className="wizard-frame" data-stage={stage}>
        {canGoBack && (
          <button type="button" className="wizard-back" onClick={goBack} aria-label="Volver">
            <ArrowLeft size={26} />
          </button>
        )}

        <div className="wizard-hero">
          <Image src={rogerImage} alt="Roger ManosYA" width={280} height={320} priority />
        </div>

        <div className="wizard-content">
          {stage === "welcome" ? (
            <>
              <h1>¡Hola!</h1>
              <h2>Bienvenido a ManosYA</h2>
              <div className="wizard-choice-row">
                <CircleChoice label="Ya tengo cuenta" tone="light" onClick={chooseLogin} />
                <CircleChoice label="Crear cuenta" tone="dark" onClick={chooseRegister} />
              </div>
            </>
          ) : (
            <>
              <h1 className="wizard-question">{prompt.title}</h1>
              {prompt.subtitle && <h2 className="wizard-subtitle">{prompt.subtitle}</h2>}

              {stage === "name" && (
                <WizardInput
                  icon={UserRound}
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Tu nombre completo"
                  onSubmit={nextFromInput}
                />
              )}

              {stage === "role" && (
                <div className="wizard-choice-row three">
                  <CircleChoice label="Necesito ayuda" tone="light" onClick={() => { setRole("client"); setStage("need"); }} />
                  <CircleChoice label="Ofrezco trabajo" tone="dark" onClick={() => { setRole("worker"); setStage("need"); }} />
                  <CircleChoice label="Vendo insumos" tone="light" onClick={() => { setRole("supplier"); setStage("need"); }} />
                </div>
              )}

              {stage === "need" && (
                <>
                  <WizardInput
                    icon={Search}
                    value={need}
                    onChange={setNeed}
                    placeholder={placeholderForRole(role)}
                    onSubmit={nextFromInput}
                  />
                  <div className="wizard-chips">
                    {quickPrompts[role || "client"].map((item) => (
                      <button key={item} type="button" onClick={() => setNeed(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {stage === "email" && (
                <WizardInput
                  icon={Mail}
                  value={email}
                  onChange={setEmail}
                  placeholder="Tu correo electronico"
                  type="email"
                  onSubmit={nextFromInput}
                />
              )}

              {stage === "password" && (
                <WizardInput
                  icon={LockKeyhole}
                  value={password}
                  onChange={setPassword}
                  placeholder="Tu contrasena"
                  type="password"
                  onSubmit={finish}
                  busy={busy}
                />
              )}

              {stage === "check-email" && (
                <div className="wizard-confirm">
                  <p>Te enviamos el acceso a {noticeEmail || "tu correo"}.</p>
                  <button type="button" onClick={() => { setAuthMode("login"); setStage("email"); }}>
                    Ya confirme, entrar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="wizard-footer">
          <Brand size="lg" />
          <p>
            Al continuar, aceptas nuestras{" "}
            <Link href="/legal/terms">condiciones de uso</Link> y{" "}
            <Link href="/legal/privacy">politica de privacidad</Link>.
          </p>
        </footer>
      </section>
    </main>
  );
}

function CircleChoice({ label, tone = "light", onClick }) {
  return (
    <button type="button" className={`wizard-circle ${tone}`} onClick={onClick}>
      {label}
    </button>
  );
}

function WizardInput({ icon: Icon, value, onChange, placeholder, type = "text", onSubmit, busy = false }) {
  return (
    <form
      className="wizard-input"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Icon size={22} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} disabled={busy} />
      <button type="submit" disabled={busy} aria-label="Continuar">
        <ArrowRight size={25} />
      </button>
    </form>
  );
}

function detectNeed(value, explicitRole) {
  const text = normalizeService(value).replace(/-/g, " ");
  const role =
    explicitRole ||
    (/trabaj|ofrezco|soy|hago/.test(text) ? "worker" :
      /vendo|proveedor|material|insumo|herramienta/.test(text) ? "supplier" :
        /necesito|busco|quiero|urgente/.test(text) ? "client" : "");

  const serviceSlug = Object.entries(serviceHints).find(([, words]) =>
    words.some((word) => text.includes(normalizeService(word).replace(/-/g, " ")))
  )?.[0];

  return {
    role,
    serviceSlug,
    urgency: /ahora|urgente|rapido|ya|hoy/.test(text) ? "alta" : "normal",
    serviceName: SERVICE_CATALOG.find((item) => item.slug === serviceSlug)?.name || "",
  };
}

function buildPrompt({ stage, authMode, fullName, role, detected }) {
  const firstName = fullName.trim().split(/\s+/)[0] || "";

  if (stage === "name") {
    return { title: "Buenisimo", subtitle: "Primero decime tu nombre completo." };
  }
  if (stage === "role") {
    return {
      title: firstName ? `Un gusto, ${firstName}` : "Un gusto",
      subtitle: "¿Venis a pedir ayuda, ofrecer tu trabajo o vender insumos?",
    };
  }
  if (stage === "need") {
    if (role === "worker") return { title: "¿Que servicio haces?" };
    if (role === "supplier") return { title: "¿Que insumos vendes?" };
    return { title: "¿Que necesitas hoy?" };
  }
  if (stage === "email") {
    if (authMode === "login") {
      return { title: "Mba'eichapa.", subtitle: "Pone tu correo para entrar." };
    }
    if (detected.serviceName) {
      if (role === "supplier") {
        return {
          title: `Perfecto, vendes ${detected.serviceName}.`,
          subtitle: "Pasame tu correo y armamos tu local.",
        };
      }
      if (role === "worker") {
        return {
          title: `Perfecto, haces ${detected.serviceName}.`,
          subtitle: "Pasame tu correo para crear tu perfil.",
        };
      }
      return {
        title: `Jaha, necesitas ${detected.serviceName}.`,
        subtitle: "Pasame tu correo para continuar.",
      };
    }
    return { title: authMode === "login" ? "Perfecto." : "Perfecto.", subtitle: "Pasame tu correo para continuar." };
  }
  if (stage === "password") {
    return { title: "Ultimo paso", subtitle: authMode === "login" ? "Escribi tu contrasena." : "Crea una contrasena segura." };
  }
  return { title: "" };
}

function placeholderForRole(role) {
  if (role === "supplier") return "Ej: vendo cables, canos, pintura...";
  if (role === "worker") return "Ej: hago plomeria, electricidad...";
  return "Ej: necesito plomero...";
}

function categoryForSupplier(need, detected) {
  if (detected.serviceName) return detected.serviceName;
  const text = String(need || "").trim();
  return text.replace(/^vendo\s+/i, "").slice(0, 80);
}

function withIntent(path, intent) {
  const query = intentToQuery(intent);
  if (!query) return path;
  return `${path}?${query}`;
}

function targetPathForIntent(role, intent) {
  if ((role || "client") === "client" && (intent?.serviceSlug || intent?.text)) {
    return "/client";
  }
  return pathForRole(role);
}
