"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronsUp,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  Star,
  UploadCloud,
  MapPinned,
  UserRound,
  X,
} from "lucide-react";
import Brand from "@/components/layout/Brand";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const demoWorkers = [
  {
    id: "worker-1",
    name: "Carlos Medina",
    trade: "Electricista",
    city: "Asuncion",
    distance: "1.8 km",
    rating: "4.9",
    jobs: 128,
    available: "Disponible",
    likes: "12.4k",
    comments: "318",
    saves: "941",
    caption: "Tablero ordenado, instalacion limpia y garantia del trabajo.",
    image: "linear-gradient(135deg, #050505 0%, #172a27 46%, #64C7BE 100%)",
  },
  {
    id: "worker-2",
    name: "Laura Benitez",
    trade: "Limpieza",
    city: "Fernando de la Mora",
    distance: "3.1 km",
    rating: "4.8",
    jobs: 86,
    available: "Hoy",
    likes: "8.1k",
    comments: "144",
    saves: "512",
    caption: "Antes y despues de limpieza profunda para departamento.",
    image: "linear-gradient(135deg, #080808 0%, #28413d 48%, #7bd6ce 100%)",
  },
  {
    id: "worker-3",
    name: "Miguel Duarte",
    trade: "Plomeria",
    city: "Luque",
    distance: "4.4 km",
    rating: "5.0",
    jobs: 61,
    available: "Turno hoy",
    likes: "5.6k",
    comments: "89",
    saves: "377",
    caption: "Perdida resuelta sin romper de mas. Trabajo prolijo.",
    image: "linear-gradient(135deg, #050505 0%, #213c38 52%, #64C7BE 100%)",
  },
];

export default function WorkerReelFeed({ workers = demoWorkers, role = "client", intent = null }) {
  const feedRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [clientSheet, setClientSheet] = useState(null);

  useEffect(() => {
    const key = `manosya-feed-guide-v2:${role}`;
    setShowGuide(window.localStorage.getItem(key) !== "done");
  }, [role]);

  useEffect(() => {
    if (!showGuide || activeIndex < 2) return;
    const key = `manosya-feed-guide-v2:${role}`;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(key, "done");
      setShowGuide(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [activeIndex, role, showGuide]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector("video");
          const index = Number(entry.target.getAttribute("data-index") || 0);
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            setActiveIndex(index);
            if (video) video.play().catch(() => {});
          } else if (video) {
            video.pause();
          }
        });
      },
      { root, threshold: [0, 0.7, 1] }
    );

    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [workers]);

  return (
    <div className={`feed-immersive feed-role-${role}`}>
      <FeedTop role={role} />
      {showGuide && (
        <FeedGuide
          role={role}
          step={Math.min(activeIndex, 2)}
          onClose={() => {
            window.localStorage.setItem(`manosya-feed-guide-v2:${role}`, "done");
            setShowGuide(false);
          }}
        />
      )}

      <div ref={feedRef} className="feed-scroll">
        {workers.map((worker, index) => (
          <article key={worker.id} data-index={index} className="feed-card">
            <WorkerMedia worker={worker} />
            <div className="feed-vignette" />

            <div className="feed-content">
              <section className="feed-info">
                <div className="feed-author-row">
                  <span className="feed-avatar">{initials(worker.name)}</span>
                  <strong>{worker.name}</strong>
                </div>

                <h2>{worker.trade}</h2>
                <div className="feed-meta">
                  <span><MapPin size={13} />{worker.distance || worker.city}</span>
                  <span><Star size={13} fill="currentColor" />{worker.rating}</span>
                  <span>{worker.available}</span>
                </div>
                <p className="feed-caption">{worker.caption || worker.trade}</p>
              </section>

              <aside className="feed-actions">
                <ActionButton icon={Heart} label="Me gusta" value={worker.likes || "0"} onClick={role === "client" ? () => likeWorker(worker, setClientSheet) : undefined} />
                <ActionButton icon={MessageCircle} label="Comentar" value={worker.comments || "0"} onClick={role === "client" ? () => setClientSheet({ type: "comment", worker }) : undefined} />
                <ActionButton icon={Send} label="Compartir" onClick={role === "client" ? () => shareWorker(worker, setClientSheet) : undefined} />
                {role !== "client" && <ActionLink icon={MessageCircle} label="Mensaje" href={`/dm/${worker.id}`} />}
              </aside>
            </div>
          </article>
        ))}
      </div>

      <FeedBottom role={role} intent={intent} worker={workers[activeIndex]} />
      {role === "client" && clientSheet ? (
        <ClientFeedSheet sheet={clientSheet} onClose={() => setClientSheet(null)} />
      ) : null}
    </div>
  );
}

function FeedGuide({ role, step, onClose }) {
  const steps = guideForRole(role);
  const item = steps[step] || steps[0];
  const Icon = item.icon;

  return (
    <div className={`feed-guide feed-guide-${item.placement}`}>
      <Icon size={18} />
      <div>
        <strong>{item.title}</strong>
        <span>{item.text}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar guia">
        <X size={15} />
      </button>
    </div>
  );
}

function guideForRole(role) {
  if (role === "worker") {
    return [
      { icon: ChevronsUp, title: "Desliza", text: "Subi o baja para ver mas", placement: "swipe" },
      { icon: UploadCloud, title: "Publica", text: "Toca aca para subir video", placement: "publish" },
      { icon: MessageCircle, title: "Mensajes", text: "Aca respondes clientes", placement: "inbox" },
    ];
  }

  if (role === "supplier") {
    return [
      { icon: ChevronsUp, title: "Desliza", text: "Mira demanda y otros locales", placement: "swipe" },
      { icon: MessageCircle, title: "Mensajes", text: "Cotiza sin vueltas", placement: "inbox" },
      { icon: UserRound, title: "Tu local", text: "Subi productos desde perfil", placement: "profile" },
    ];
  }

  return [
    { icon: ChevronsUp, title: "Desliza", text: "Subi o baja para ver trabajadores", placement: "swipe" },
    { icon: MessageCircle, title: "Comenta", text: "Toca aca para preguntar", placement: "comment" },
    { icon: MessageCircle, title: "Mensaje", text: "Aca coordinas precio y hora", placement: "message" },
  ];
}

function WorkerMedia({ worker }) {
  const source = String(worker?.image || worker?.mediaUrl || "");
  const isUrl = source.startsWith("http") || source.startsWith("/");
  const isVideo = worker?.mediaType === "video" || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(source);

  if (isUrl && isVideo) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={source}
        muted
        playsInline
        loop
        preload="metadata"
      />
    );
  }

  if (isUrl) {
    return <Image className="object-cover" src={source} alt="" fill sizes="100vw" priority={false} unoptimized />;
  }

  return <div className="absolute inset-0" style={{ background: source || "linear-gradient(135deg, #050505, #64C7BE)" }} />;
}

function ActionButton({ icon: Icon, label, value, onClick }) {
  return (
    <button type="button" aria-label={label} className="feed-action-button" onClick={onClick}>
      <Icon size={24} />
      <small>{label}</small>
      {value ? <span>{value}</span> : null}
    </button>
  );
}

function ClientFeedSheet({ sheet, onClose }) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const worker = sheet.worker;

  async function submitComment() {
    const text = body.trim();
    if (!text) return;

    if (isUuid(worker.id)) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userId) {
          await supabase.from("worker_comments").insert({
            worker_id: worker.id,
            post_id: isUuid(worker.postId) ? worker.postId : null,
            author_id: userId,
            body: `${text}${rating ? ` · ${rating}/5` : ""}`,
          });
        }
      } catch {}
    }

    onClose();
  }

  if (sheet.type === "liked") {
    return (
      <div className="client-feed-sheet" role="dialog" aria-modal="true">
        <div className="client-feed-panel mini">
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          <Heart size={24} />
          <strong>Guardado</strong>
          <span>{worker.name} queda a mano para escribirle.</span>
          <Link href={`/dm/${worker.id}`}>Enviar mensaje</Link>
        </div>
      </div>
    );
  }

  if (sheet.type === "shared") {
    return (
      <div className="client-feed-sheet" role="dialog" aria-modal="true">
        <div className="client-feed-panel mini">
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          <Send size={24} />
          <strong>Listo</strong>
          <span>Compartiste este perfil de trabajo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="client-feed-sheet" role="dialog" aria-modal="true">
      <div className="client-feed-panel">
        <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <small>{worker.name}</small>
        <strong>Comenta o puntua</strong>
        <div className="client-rating-row" aria-label="Puntuacion">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" className={value <= rating ? "active" : ""} onClick={() => setRating(value)}>
              <Star size={19} fill="currentColor" />
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Pregunta precio, horario o deja tu opinion..." />
        <div className="client-feed-panel-actions">
          <Link href={`/dm/${worker.id}`}>Mensaje</Link>
          <button type="button" onClick={submitComment}>Publicar</button>
        </div>
      </div>
    </div>
  );
}

async function likeWorker(worker, setClientSheet) {
  if (isUuid(worker.id)) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId) {
        await supabase.from("worker_likes").upsert({
          worker_id: worker.id,
          client_id: userId,
        });
      }
    } catch {}
  }

  setClientSheet({ type: "liked", worker });
}

async function shareWorker(worker, setClientSheet) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/client?worker=${worker.id}` : "";
  const text = `${worker.name} en ManosYA: ${worker.trade}`;
  try {
    if (navigator.share) await navigator.share({ title: "ManosYA", text, url });
    else if (navigator.clipboard && url) await navigator.clipboard.writeText(url);
  } catch {}
  setClientSheet({ type: "shared", worker });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function ActionLink({ icon: Icon, label, href }) {
  return (
    <Link aria-label={label} className="feed-action-button" href={href}>
      <Icon size={24} />
      <small>{label}</small>
    </Link>
  );
}

function FeedTop({ role }) {
  const hideBrand = role === "client" || role === "worker";

  if (role === "worker" || role === "supplier") {
    return (
      <header className="feed-top feed-top-worker">
        <div className="feed-top-actions">
          <Link href={role === "supplier" ? "/supplier?search=1" : "/worker/feed?search=1"} aria-label="Buscar">
            <Search size={21} />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="feed-top">
      {hideBrand ? <span aria-hidden="true" /> : <Link href="/" aria-label="Inicio"><Brand size="sm" /></Link>}
      <span aria-hidden="true" />
      <div className="feed-top-actions">
        <Link href={role === "client" ? "/client?search=1" : publishHref(role)} aria-label={role === "client" ? "Buscar" : "Publicar"}>
          {role === "client" ? <Search size={21} /> : <UploadCloud size={21} />}
        </Link>
      </div>
    </header>
  );
}

function FeedBottom({ role, intent, worker }) {
  const homeHref = role === "worker" ? "/worker/feed" : role === "supplier" ? "/supplier" : "/client";
  const items = role === "client"
    ? [
        { href: homeHref, label: "Feed", icon: Home },
        { href: "/client/map", label: "Mapa", icon: MapPinned },
        { href: "/dm", label: "Mensajes", icon: MessageCircle },
        { href: "/client/profile", label: "Perfil", icon: UserRound },
      ]
    : role === "worker"
      ? [
          { href: homeHref, label: "Feed", icon: Home },
          { href: "/dm", label: "Mensajes", icon: MessageCircle },
          { href: "/worker/map", label: "Mapa", icon: MapPinned },
          { href: "/worker/profile", label: "Perfil", icon: UserRound },
        ]
      : [
          { href: homeHref, label: "Feed", icon: Home },
          { href: "/dm", label: "Mensajes", icon: MessageCircle },
          { href: "/supplier/map", label: "Mapa", icon: MapPinned },
          { href: "/supplier/profile", label: "Perfil", icon: UserRound },
        ];

  return (
    <nav className="feed-bottom">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}>
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function publishHref(role) {
  if (role === "supplier") return "/supplier?compose=video";
  return "/worker/feed?compose=video";
}

function initials(name) {
  return String(name || "M")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
