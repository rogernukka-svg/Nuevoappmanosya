"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, CheckCheck, Image as ImageIcon, Loader2, MapPin, Mic, Navigation, Radio, Send, StopCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchMessages, sendMessage } from "@/lib/chat/queries";

const LOCAL_USER_ID = "local-user";
const demoContacts = {
  demo: "Carlos Medina",
  "laura-demo": "Laura Benitez",
  "proveedor-demo": "Proveedor Centro",
};

const demoMessages = [
  {
    id: "demo-1",
    sender_id: "contact",
    body: "Hola, vi tu trabajo en ManosYA.",
    media_type: "text",
    created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
  },
  {
    id: "demo-2",
    sender_id: LOCAL_USER_ID,
    body: "Perfecto. Te ayudo hoy.",
    media_type: "text",
    created_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
  },
  {
    id: "demo-3",
    sender_id: "contact",
    body: locationPayload({
      lat: -25.28646,
      lng: -57.647,
      live: true,
      hours: 2,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    }),
    media_type: "text",
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
];

export default function ChatPanel({ title = "Chat ManosYA", chatId = "demo" }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activeChatId, setActiveChatId] = useState(chatId);
  const [contactName, setContactName] = useState(readableContact(title, chatId));
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState(demoMessages);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [locationSheet, setLocationSheet] = useState(false);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const listRef = useRef(null);
  const channelRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingRef = useRef(0);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const realChat = isUuid(activeChatId);
  const contact = contactName;

  useEffect(() => {
    let alive = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (alive) setUserId(data?.user?.id || LOCAL_USER_ID);
    }

    loadUser();
    return () => {
      alive = false;
    };
  }, [supabase]);

  useEffect(() => {
    let alive = true;

    setActiveChatId(chatId);
    setContactName(readableContact(title, chatId));

    async function resolveDirectChat() {
      if (!isUuid(chatId)) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: existingChat } = await supabase
        .from("chats")
        .select("id,title")
        .eq("id", chatId)
        .maybeSingle();

      if (!alive) return;

      if (existingChat?.id) {
        setActiveChatId(existingChat.id);
        if (existingChat.title) setContactName(existingChat.title);
        return;
      }

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", chatId)
        .maybeSingle();

      const { data: resolvedId, error } = await supabase.rpc("get_or_create_direct_chat", {
        target_user_id: chatId,
      });

      if (!alive) return;

      if (error || !resolvedId) {
        setNotice(error?.message || "No se pudo abrir el chat real.");
        return;
      }

      setActiveChatId(resolvedId);
      if (targetProfile?.full_name) setContactName(targetProfile.full_name);
    }

    resolveDirectChat();

    return () => {
      alive = false;
    };
  }, [chatId, supabase, title]);

  useEffect(() => {
    let alive = true;

    async function loadMessages() {
      if (!realChat) {
        setMessages(demoMessages);
        return;
      }

      try {
        const data = await fetchMessages(supabase, activeChatId);
        if (alive) setMessages(data.map((message) => normalizeMessage(message, userId || LOCAL_USER_ID)));
      } catch (error) {
        if (alive) setNotice(error.message || "No se pudieron cargar mensajes.");
      }
    }

    loadMessages();
    return () => {
      alive = false;
    };
  }, [activeChatId, realChat, supabase, userId]);

  useEffect(() => {
    if (!realChat || !userId) return undefined;

    const channel = supabase
      .channel(`chat:${activeChatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${activeChatId}` },
        (payload) => {
          const next = normalizeMessage(payload.new, userId);
          setMessages((current) => (current.some((message) => message.id === next.id) ? current : [...current, next]));
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.sender_id || payload.sender_id === userId) return;
        setTyping(true);
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(() => setTyping(false), 2600);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      window.clearTimeout(typingTimerRef.current);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeChatId, realChat, supabase, userId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function updateText(value) {
    setText(value);
    if (!realChat || !channelRef.current || !userId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 1200) return;
    lastTypingRef.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { sender_id: userId, at: now },
    });
  }

  async function submitMessage(event) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setText("");
    await sendChatMessage({ body: clean, media_type: "text" });
  }

  async function sendChatMessage(payload) {
    const mineId = userId || LOCAL_USER_ID;
    const optimistic = normalizeMessage(
      {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        chat_id: activeChatId,
        sender_id: mineId,
        body: payload.body || "",
        media_url: payload.media_url || "",
        media_type: payload.media_type || "text",
        created_at: new Date().toISOString(),
      },
      mineId
    );

    setMessages((current) => [...current, { ...optimistic, pending: realChat }]);

    if (!realChat) return;
    if (!userId || userId === LOCAL_USER_ID) {
      setNotice("Inicia sesion para enviar mensajes reales.");
      return;
    }

    setSending(true);
    try {
      const saved = await sendMessage(supabase, {
        chat_id: activeChatId,
        sender_id: userId,
        body: payload.body || "",
        media_url: payload.media_url || null,
        media_type: payload.media_type || "text",
      });

      setMessages((current) =>
        current.some((message) => message.id === saved.id)
          ? current.filter((message) => message.id !== optimistic.id)
          : current.map((message) => (message.id === optimistic.id ? normalizeMessage(saved, userId) : message))
      );
    } catch (error) {
      setNotice(error.message || "No se pudo enviar.");
      setMessages((current) =>
        current.map((message) => (message.id === optimistic.id ? { ...message, pending: false, failed: true } : message))
      );
    } finally {
      setSending(false);
    }
  }

  async function sendMedia(file, forcedType) {
    if (!file) return;
    const mediaType = forcedType || inferMediaType(file);

    if (!realChat) {
      await sendChatMessage({
        body: file.name || mediaLabel(mediaType),
        media_url: URL.createObjectURL(file),
        media_type: mediaType,
      });
      return;
    }

    if (!userId || userId === LOCAL_USER_ID) {
      setNotice("Inicia sesion para subir archivos.");
      return;
    }

    setSending(true);
    setNotice("Subiendo archivo...");
    try {
      const ext = file.name?.split(".").pop() || mediaType;
      const path = `${activeChatId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

      if (error) throw error;
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      await sendChatMessage({
        body: file.name || mediaLabel(mediaType),
        media_url: data.publicUrl,
        media_type: mediaType,
      });
      setNotice("");
    } catch (error) {
      setNotice(error.message || "No se pudo subir el archivo.");
    } finally {
      setSending(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Tu navegador no permite grabar audio aca.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        sendMedia(file, "audio");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setNotice("");
    } catch {
      setNotice("Activa el microfono para mandar audio.");
    }
  }

  function shareLocation(live = false, hours = 0) {
    if (!navigator.geolocation) {
      setNotice("Tu navegador no permite ubicacion.");
      return;
    }

    setNotice("Buscando ubicacion...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const expiresAt = live ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
        await sendChatMessage({
          body: locationPayload({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            live,
            hours,
            expires_at: expiresAt,
          }),
          media_type: "text",
        });
        setLocationSheet(false);
        setNotice("");
      },
      () => {
        setNotice("No pudimos tomar tu ubicacion.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  }

  return (
    <section className="chat-pro">
      <header className="chat-pro-head">
        <button type="button" className="chat-icon-button" onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="chat-avatar">{initials(contact)}</div>
        <div className="chat-title">
          <strong>{contact}</strong>
          <span>{typing ? "escribiendo..." : realChat ? "Realtime listo" : "Demo interactiva"}</span>
        </div>
        <button type="button" className="chat-icon-button" onClick={() => setLocationSheet(true)} aria-label="Compartir ubicacion">
          <Navigation size={20} />
        </button>
      </header>

      {notice ? <p className="chat-notice">{notice}</p> : null}

      <div ref={listRef} className="chat-stream">
        <div className="chat-day">Hoy</div>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {typing ? <TypingBubble /> : null}
      </div>

      <form className="chat-composer" onSubmit={submitMessage}>
        <label className="chat-tool" aria-label="Enviar foto">
          <ImageIcon size={19} />
          <input type="file" accept="image/*,video/*" onChange={(event) => sendMedia(event.target.files?.[0])} />
        </label>
        <button type="button" className={`chat-tool ${recording ? "recording" : ""}`} onClick={toggleRecording} aria-label={recording ? "Detener audio" : "Grabar audio"}>
          {recording ? <StopCircle size={19} /> : <Mic size={19} />}
        </button>
        <button type="button" className="chat-tool" onClick={() => setLocationSheet(true)} aria-label="Compartir ubicacion">
          <MapPin size={19} />
        </button>
        <input value={text} onChange={(event) => updateText(event.target.value)} placeholder="Mensaje..." />
        <button type="submit" className="chat-send" disabled={sending && realChat} aria-label="Enviar">
          {sending ? <Loader2 size={18} className="chat-spin" /> : <Send size={18} />}
        </button>
      </form>

      {locationSheet ? (
        <div className="chat-sheet" role="dialog" aria-modal="true">
          <div className="chat-location-panel">
            <button type="button" className="chat-sheet-close" onClick={() => setLocationSheet(false)} aria-label="Cerrar">
              <X size={19} />
            </button>
            <strong>Ubicacion</strong>
            <span>Comparte solo lo necesario. Ideal para coordinar llegada.</span>
            <button type="button" className="chat-location-primary" onClick={() => shareLocation(false)}>
              <Navigation size={20} />
              Actual
            </button>
            <div className="chat-live-options">
              {[1, 4, 8].map((hours) => (
                <button key={hours} type="button" onClick={() => shareLocation(true, hours)}>
                  <Radio size={17} />
                  En vivo {hours}h
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ChatMessage({ message }) {
  return (
    <article className={`chat-message ${message.mine ? "mine" : ""}`}>
      <div className="chat-bubble">
        <MessageContent message={message} />
        <span className="chat-meta">
          {formatTime(message.created_at)}
          {message.mine ? <CheckCheck size={14} /> : null}
        </span>
      </div>
    </article>
  );
}

function MessageContent({ message }) {
  const location = parseLocation(message.body);
  if (location) return <LocationCard location={location} />;

  if (message.media_type === "image" && message.media_url) {
    return <img className="chat-media-image" src={message.media_url} alt={message.body || "Imagen enviada"} />;
  }

  if (message.media_type === "video" && message.media_url) {
    return <video className="chat-media-video" src={message.media_url} controls playsInline />;
  }

  if (message.media_type === "audio") {
    return message.media_url ? (
      <audio className="chat-audio" src={message.media_url} controls />
    ) : (
      <span className="chat-audio-fallback"><Mic size={16} /> Audio</span>
    );
  }

  if (message.media_type === "file" && message.media_url) {
    return <a href={message.media_url} target="_blank" rel="noreferrer">{message.body || "Abrir archivo"}</a>;
  }

  return <p>{message.body || "Mensaje"}</p>;
}

function LocationCard({ location }) {
  const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  return (
    <a className="chat-location-card" href={mapsUrl} target="_blank" rel="noreferrer">
      <span><Navigation size={18} /></span>
      <div>
        <strong>{location.live ? `Ubicacion en vivo ${location.hours || 1}h` : "Ubicacion actual"}</strong>
        <small>{location.live ? "Seguimiento preparado" : "Abrir en mapa"}</small>
      </div>
    </a>
  );
}

function TypingBubble() {
  return (
    <div className="chat-message">
      <div className="chat-bubble typing">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function normalizeMessage(message, userId) {
  return {
    ...message,
    body: message.body || message.text || message.content || "",
    media_url: message.media_url || "",
    media_type: message.media_type || "text",
    mine: message.sender_id === userId,
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

function readableContact(title, chatId) {
  if (demoContacts[chatId]) return demoContacts[chatId];
  return String(title || "Chat ManosYA").replace(/^DM\s+/i, "").replace(/^Chat\s+/i, "");
}

function initials(value) {
  return String(value || "MY")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function inferMediaType(file) {
  if (file.type?.startsWith("image")) return "image";
  if (file.type?.startsWith("video")) return "video";
  if (file.type?.startsWith("audio")) return "audio";
  return "file";
}

function mediaLabel(type) {
  if (type === "audio") return "Audio";
  if (type === "image") return "Foto";
  if (type === "video") return "Video";
  return "Archivo";
}

function locationPayload(payload) {
  return `MANOSYA_LOCATION::${JSON.stringify(payload)}`;
}

function parseLocation(body = "") {
  if (!body.startsWith("MANOSYA_LOCATION::")) return null;
  try {
    return JSON.parse(body.replace("MANOSYA_LOCATION::", ""));
  } catch {
    return null;
  }
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("es-PY", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "";
  }
}
