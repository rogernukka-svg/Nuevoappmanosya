'use client';

import { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  SendHorizontal,
  ChevronLeft,
  Map,
  CheckSquare,
  CheckCircle2,
  Power,
  MessageCircle,
  Home,
  User2,
  ArrowLeftCircle,
  Sparkles,
  BadgeCheck,
  Clock3,
  Briefcase,
  MapPin,
  Bell,
  XCircle,
  Bot,
  ShieldCheck,
  Wrench,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase';
import { startRealtimeCore, stopRealtimeCore } from '@/lib/realtimeCore';
import { requireRole } from '@/lib/roleRedirect';
import { canAttemptAction, inspectTextSafety, safeExternalUrl } from '@/lib/security';
import { userFriendlyError } from '@/lib/userFacingErrors';
import dynamic from 'next/dynamic';

const ManosYaMap = dynamic(() => import('@/components/ManosYaMap'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-slate-100"><div className="text-sm font-bold text-slate-500">Cargando mapa...</div></div>,
});

const supabase = getSupabase();

const CHAT_SERVICE_WATERMARKS = [
  'Taxi', 'Chofer', 'Plomeria', 'Electricidad', 'Limpieza', 'Jardineria', 'Pintura', 'Albanileria',
  'Carpinteria', 'Cerrajeria', 'Mecanica', 'Refrigeracion', 'Mudanza', 'Fletes', 'Parrillero', 'Cocina',
  'NiÃ±era', 'Cuidador', 'Enfermeria', 'Belleza', 'Maquillaje', 'Peluqueria', 'Masajes', 'Costura',
  'Tecnico PC', 'Celulares', 'Internet', 'Camara CCTV', 'Soldadura', 'Herreria', 'Vidrieria', 'Tapiceria',
  'Piscina', 'Fumigacion', 'Lavadero', 'Delivery', 'Mensajeria', 'Eventos', 'Fotografia', 'Video',
  'DJ', 'Musica', 'Profesor', 'Traduccion', 'Contabilidad', 'Abogacia', 'Arquitectura', 'DiseÃ±o',
  'Veterinaria', 'Mascotas', 'Seguridad', 'Servicio general',
];

function ChatServicePattern() {
  const icons = [Wrench, Briefcase, WalletCards, Sparkles, MapPin, ShieldCheck];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 16px 16px, rgba(255,255,255,.58) 1.2px, transparent 1.4px),
            linear-gradient(135deg, transparent 0 44%, rgba(255,255,255,.25) 45% 46%, transparent 47% 100%)
          `,
          backgroundSize: '82px 82px, 118px 118px',
        }}
      />
      <div className="absolute inset-0 grid grid-cols-4 content-start gap-x-8 gap-y-9 p-6 text-white/20 sm:grid-cols-6">
        {CHAT_SERVICE_WATERMARKS.map((service, index) => {
          const Icon = icons[index % icons.length];
          return (
            <div key={`${service}-${index}`} className="flex -rotate-[18deg] flex-col items-center gap-1">
              <Icon size={22 + (index % 3) * 5} strokeWidth={2.4} />
              <span className="max-w-[74px] truncate text-[8px] font-black uppercase tracking-wide">{service}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   HELPERS
========================= */

function prettyStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'open') return 'Disponible';
  if (s === 'scheduled') return 'Agendado';
  if (s === 'accepted') return 'En curso';
  if (s === 'completed') return 'Finalizado';
  if (s === 'rejected') return 'Rechazado';
  if (s === 'cancelled') return 'Cancelado';
  if (s === 'assigned') return 'Asignado';
  return status || 'Sin estado';
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function makeAvatarMarkerIcon({ avatarUrl, name, borderColor = '#18b8aa' }) {
  if (typeof window === 'undefined') return null;

  const L = require('leaflet');

  const safeAvatar = avatarUrl || '/avatar-fallback.png';
  const safeName = String(name || 'Usuario').replace(/"/g, '');

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:56px;
        height:56px;
        border-radius:999px;
        border:4px solid white;
        background:${borderColor};
        box-shadow:0 12px 30px rgba(0,0,0,.28);
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
      ">
        <img
          src="${safeAvatar}"
          alt="${safeName}"
          style="
            width:44px;
            height:44px;
            border-radius:999px;
            object-fit:cover;
            border:2px solid ${borderColor};
            background:white;
          "
        />
        <span style="
          position:absolute;
          bottom:-4px;
          right:-2px;
          width:16px;
          height:16px;
          border-radius:999px;
          background:${borderColor};
          border:3px solid white;
        "></span>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -26],
  });
}
function jobStatusPill(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'open') {
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
  if (s === 'scheduled') {
    return 'bg-violet-50 text-violet-700 border border-violet-200';
  }
  if (s === 'accepted') {
    return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
  }
  if (s === 'completed') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (s === 'rejected' || s === 'cancelled') {
    return 'bg-red-50 text-red-600 border border-red-200';
  }

  return 'bg-gray-50 text-gray-700 border border-gray-200';
}
function parseJobRequestDetails(description) {
  const text = String(description || '');

  const parts = text
    .split(' Â· ')
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  const result = {
    raw: text,
    summary: [],
    serviceLabel: null,
    requestedDate: null,
    requestedTime: null,
    notes: null,
    requestKind: 'standard',
  };

  for (const part of parts) {
    if (part.startsWith('Servicio:')) {
      result.serviceLabel = part.replace('Servicio:', '').trim();
      continue;
    }

    if (part.startsWith('Fecha solicitada:')) {
      result.requestedDate = part.replace('Fecha solicitada:', '').trim();
      result.requestKind = 'booking';
      continue;
    }

    if (part.startsWith('Hora solicitada:')) {
      result.requestedTime = part.replace('Hora solicitada:', '').trim();
      result.requestKind = 'booking';
      continue;
    }

    if (part.startsWith('Notas:')) {
      result.notes = part.replace('Notas:', '').trim();
      continue;
    }

    result.summary.push(part);
  }

  if (
    !result.requestedDate &&
    !result.requestedTime &&
    /presupuesto|cotizaciÃ³n|cotizacion|diagnÃ³stico|diagnostico/i.test(text)
  ) {
    result.requestKind = 'quote';
  }

  return result;
}

function shouldKeepWorkerAvailable(job) {
  const details = parseJobRequestDetails(job?.description);

  return details.requestKind === 'booking' || details.requestKind === 'quote';
}

function normalizeServiceKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function matchesWorkerService(job, workerSkills = []) {
  const details = parseJobRequestDetails(job?.description);

  const jobService = normalizeServiceKey(
    job?.service_type || details.serviceLabel || ''
  );

  if (!jobService) return false;

  if (!Array.isArray(workerSkills) || workerSkills.length === 0) {
    return false;
  }

  return workerSkills.some((skill) => {
    const normalizedSkill = normalizeServiceKey(skill);

    return (
      normalizedSkill === jobService ||
      normalizedSkill.includes(jobService) ||
      jobService.includes(normalizedSkill)
    );
  });
}
function workerModeMeta(status) {
  if (status === 'available') {
    return {
      title: 'Disponible',
      subtitle: 'Recibiendo solicitudes en tiempo real',
      tone: 'emerald',
      pill: 'Conectado',
      dot: 'bg-emerald-500',
      glow: 'shadow-[0_16px_34px_rgba(16,185,129,0.18)]',
      banner: 'from-emerald-500 to-cyan-400',
    };
  }

  if (status === 'paused') {
    return {
      title: 'En pausa',
      subtitle: 'No recibÃ­s pedidos temporalmente',
      tone: 'gray',
      pill: 'Pausado',
      dot: 'bg-gray-400',
      glow: 'shadow-[0_16px_34px_rgba(17,24,39,0.10)]',
      banner: 'from-gray-700 to-gray-900',
    };
  }

  return {
    title: 'Ocupado',
    subtitle: 'TenÃ©s un trabajo en curso',
    tone: 'cyan',
    pill: 'Trabajando',
    dot: 'bg-cyan-500',
    glow: 'shadow-[0_16px_34px_rgba(34,211,238,0.18)]',
    banner: 'from-cyan-500 to-emerald-500',
  };
}

/* =========================
   PERFIL BASE
========================= */

async function ensureWorkerProfile(userId) {
  if (!userId) return;

  try {
    const { data: existing } = await supabase
      .from('worker_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('worker_profiles').insert([
        {
          user_id: userId,
          is_active: true,
          radius_km: 5,
          lat: null,
          lng: null,
        },
      ]);
    }
  } catch (err) {
    console.error('Error creando worker_profile:', err.message);
  }
}

const HOTSPOTS = [
  { name: 'Shopping Paris', lat: -25.5093, lng: -54.6111, intensity: 9 },
  { name: 'Shopping China', lat: -25.5091, lng: -54.6102, intensity: 9 },
  { name: 'Monalisa', lat: -25.5101, lng: -54.612, intensity: 8 },
  { name: 'Microcentro CDE', lat: -25.516, lng: -54.6118, intensity: 10 },
  { name: 'Km 4', lat: -25.5039, lng: -54.635, intensity: 7 },
  { name: 'Km 7', lat: -25.4812, lng: -54.625, intensity: 8 },
  { name: 'Km 8', lat: -25.475, lng: -54.635, intensity: 6 },
  { name: 'Km 9 Monday', lat: -25.467, lng: -54.642, intensity: 6 },
  { name: 'Barrio BoquerÃ³n', lat: -25.529, lng: -54.6078, intensity: 7 },
  { name: 'Barrio Obrero', lat: -25.5247, lng: -54.6172, intensity: 6 },
  { name: 'Ãrea 1 Minga', lat: -25.4974, lng: -54.6621, intensity: 8 },
  { name: 'Ãrea 2 Minga', lat: -25.502, lng: -54.671, intensity: 7 },
  { name: 'Km 14 Monday', lat: -25.437, lng: -54.712, intensity: 6 },
  { name: 'Centro Minga', lat: -25.5085, lng: -54.6398, intensity: 7 },
  { name: 'AviaciÃ³n Minga', lat: -25.495, lng: -54.648, intensity: 7 },
  { name: 'Costanera Hernandarias', lat: -25.4052, lng: -54.6424, intensity: 7 },
  { name: 'Centro Hernandarias', lat: -25.4062, lng: -54.64, intensity: 8 },
  { name: 'UNINTER Hernandarias', lat: -25.43, lng: -54.635, intensity: 6 },
  { name: 'ItaipÃº Acceso 1', lat: -25.4105, lng: -54.5895, intensity: 8 },
  { name: 'Centro Franco', lat: -25.558, lng: -54.613, intensity: 7 },
  { name: 'RÃ­o Monday', lat: -25.554, lng: -54.62, intensity: 6 },
  { name: 'FracciÃ³n San AgustÃ­n', lat: -25.548, lng: -54.595, intensity: 7 },
  { name: 'Shopping del Sol', lat: -25.2914, lng: -57.5802, intensity: 10 },
  { name: 'Shopping Mariscal', lat: -25.2989, lng: -57.5889, intensity: 9 },
  { name: 'Villa Morra', lat: -25.2972, lng: -57.582, intensity: 8 },
  { name: 'Las Lomas', lat: -25.2849, lng: -57.566, intensity: 7 },
  { name: 'Centro AsunciÃ³n', lat: -25.2836, lng: -57.6359, intensity: 9 },
  { name: 'Avenida Eusebio Ayala', lat: -25.3026, lng: -57.5837, intensity: 9 },
  { name: 'San Lorenzo Centro', lat: -25.3401, lng: -57.5078, intensity: 8 },
  { name: 'Universidad Nacional (UNA)', lat: -25.3385, lng: -57.5088, intensity: 7 },
  { name: 'Luque Centro', lat: -25.3204, lng: -57.4906, intensity: 7 },
  { name: 'Aeropuerto Silvio Pettirossi', lat: -25.2401, lng: -57.5139, intensity: 10 },
  { name: 'Zona Norte - Fdo', lat: -25.307, lng: -57.527, intensity: 7 },
  { name: 'Zona Sur - Fdo', lat: -25.325, lng: -57.531, intensity: 6 },
  { name: 'LambarÃ© Centro', lat: -25.345, lng: -57.606, intensity: 7 },
  { name: 'Yacht y Golf Club', lat: -25.3647, lng: -57.6004, intensity: 8 },
  { name: 'Ã‘emby Centro', lat: -25.394, lng: -57.535, intensity: 7 },
  { name: 'Limpio Centro', lat: -25.159, lng: -57.485, intensity: 6 },
];

/* =========================
   AVAILABILITY CAROUSEL
========================= */

function AvailabilityCarousel({ value, onChange }) {
  const items = [
    {
      id: 'available',
      title: 'Disponible',
      subtitle: 'Recibir pedidos en tiempo real',
      pill: 'Conectado',
      tone: 'emerald',
    },
    {
      id: 'paused',
      title: 'En pausa',
      subtitle: 'No recibÃ­s pedidos temporalmente',
      pill: 'Pausado',
      tone: 'amber',
    },
    {
      id: 'busy',
      title: 'Ocupado',
      subtitle: 'TenÃ©s un trabajo en curso',
      pill: 'Trabajando',
      tone: 'rose',
    },
  ];

  const idx = Math.max(0, items.findIndex((x) => x.id === value));
  const active = items[idx];

  function setByIndex(nextIdx) {
    const clamped = Math.max(0, Math.min(items.length - 1, nextIdx));
    const next = items[clamped].id;
    if (next !== value) {
      if (navigator?.vibrate) navigator.vibrate(20);
      onChange(next);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(16,24,40,0.10)] overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl ${
                  active.tone === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Power size={18} />
              </span>
              <h3 className="text-[17px] font-extrabold text-gray-900">{active.title}</h3>
            </div>

            <p className="text-[13px] text-gray-500 mt-1">{active.subtitle}</p>
          </div>

          <span
            className={`text-[12px] font-bold px-3 py-1.5 rounded-full border ${
              active.tone === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {active.pill}
          </span>
        </div>

        <div className="px-4 pb-5">
          <div className="relative rounded-2xl bg-gray-50 border border-gray-200 p-2 overflow-hidden">
            <div
              className={`absolute inset-0 pointer-events-none ${
                active.tone === 'emerald'
                  ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.20),transparent_55%)]'
                  : 'bg-[radial-gradient(circle_at_30%_20%,rgba(17,24,39,0.10),transparent_55%)]'
              }`}
            />

            <motion.div
              className="flex gap-2"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(e, info) => {
                const x = info.offset.x;
                if (x < -40) setByIndex(idx + 1);
                if (x > 40) setByIndex(idx - 1);
              }}
              animate={{ x: -idx * 260 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ width: items.length * 260 }}
            >
              {items.map((it) => {
                const activeItem = it.id === value;
                return (
                  <button
                    key={it.id}
                    onClick={() => onChange(it.id)}
                    className={`w-[252px] shrink-0 rounded-2xl px-4 py-4 text-left border transition ${
                      activeItem
                        ? it.tone === 'emerald'
                          ? 'bg-white border-emerald-200 shadow-[0_12px_30px_rgba(16,185,129,0.18)]'
                          : 'bg-white border-gray-200 shadow-[0_12px_30px_rgba(17,24,39,0.12)]'
                        : 'bg-white/70 border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-extrabold text-gray-900">{it.title}</div>
                      <AnimatePresence>
                        {activeItem && (
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            className={`inline-flex items-center gap-1 text-[12px] font-bold ${
                              it.tone === 'emerald' ? 'text-emerald-700' : 'text-gray-700'
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            Activo
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="text-[12px] text-gray-500 mt-1">{it.subtitle}</div>

                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          it.tone === 'emerald' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-[12px] font-semibold text-gray-700">
                        DeslizÃ¡ para cambiar
                      </span>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </div>

          <div className="flex justify-center gap-2 mt-3">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setByIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === idx ? 'w-8 bg-emerald-500' : 'w-2.5 bg-gray-300'
                }`}
                aria-label={`Ir a ${it.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkerTabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-3 py-3 text-[13px] font-black transition active:scale-[0.98] ${
        active
  ? 'bg-[#18b8aa] text-white shadow-[0_12px_28px_rgba(98,191,185,0.28)]'
  : label === 'Ganar clientes'
  ? 'bg-[#18b8aa]/8 text-[#18b8aa] border border-[#18b8aa]/15 animate-pulse'
  : 'bg-transparent text-slate-500 hover:bg-[#62bfb9]/8'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-[18px] font-black text-slate-950">{value}</div>
      <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</div>
    </div>
  );
}

function WorkerFeedPlaceholder({ onOpenProfile }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-[#62bfb9]/20 bg-white/86 p-5 shadow-[0_18px_52px_rgba(98,191,185,0.12)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#62bfb9]/12 text-[#18b8aa]"><Sparkles size={22} /></div>
        <div>
          <h2 className="text-[19px] font-black text-slate-950">Feed profesional</h2>
          <p className="text-[13px] font-semibold text-slate-500">MostrÃ¡ trabajos, fotos y videos.</p>
        </div>
      </div>
     <button
  type="button"
  onClick={onOpenProfile}
  className="mt-5 w-full rounded-full bg-[#18b8aa] px-5 py-4 text-[15px] font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.26)] active:scale-[0.98]"
>
  Ver mi oficio
</button>
      <div className="mt-4 rounded-[24px] border border-dashed border-[#62bfb9]/25 bg-[#62bfb9]/6 p-5 text-center">
        <div className="text-[15px] font-black text-slate-900">Feed listo para conectar</div>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">Mantenemos la funciÃ³n y dejamos la vista limpia para el prÃ³ximo paso.</p>
      </div>
    </section>
  );
}

export default function WorkerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkChatId = searchParams.get('chat');

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [clientProfile, setClientProfile] = useState(null);
  const [jobLastMessages, setJobLastMessages] = useState({});
  const [workerSelfProfile, setWorkerSelfProfile] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatViewportHeight, setChatViewportHeight] = useState('100dvh');
  const [chatKeyboardOffset, setChatKeyboardOffset] = useState(0);
   const [isActive, setIsActive] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);
const [workerUnreadByJob, setWorkerUnreadByJob] = useState({});
const [clientTyping, setClientTyping] = useState(false);
 const [mapOpen, setMapOpen] = useState(false);
const [previewMapOpen, setPreviewMapOpen] = useState(false);
const [previewTarget, setPreviewTarget] = useState(null);
const [previewRoute, setPreviewRoute] = useState(null);
const [workerLocation, setWorkerLocation] = useState(null);
const [sheetSnap, setSheetSnap] = useState('mid');
const [workerTab, setWorkerTab] = useState('jobs');
const inputRef = useRef(null);
const chatChannelRef = useRef(null);
const bottomRef = useRef(null);
const chatMessagesRef = useRef(null);
const soundRef = useRef(null);
const typingTimeoutRef = useRef(null);
const workerChatIdsRef = useRef(new Set());
const openedChatParamRef = useRef(null);

function scrollWorkerChatToBottom(behavior = chatKeyboardOffset > 40 ? 'auto' : 'smooth') {
  const wrap = chatMessagesRef.current;
  if (wrap) {
    wrap.scrollTo({ top: wrap.scrollHeight, behavior });
    return;
  }

  bottomRef.current?.scrollIntoView({ behavior });
}

  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined') return 'available';
    return localStorage.getItem('worker_status') === 'paused' ? 'paused' : 'available';
  });

  const [isConnected, setIsConnected] = useState(true);

  const meta = workerModeMeta(status);

  useEffect(() => {
    if (!isChatOpen) {
      setChatViewportHeight('100dvh');
      setChatKeyboardOffset(0);
      return undefined;
    }

    if (typeof window === 'undefined' || !window.visualViewport) return undefined;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      setChatViewportHeight(`${viewport.height}px`);
      setChatKeyboardOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    updateViewport();
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);

    return () => {
      window.visualViewport.removeEventListener('resize', updateViewport);
      window.visualViewport.removeEventListener('scroll', updateViewport);
    };
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) return;
    scrollWorkerChatToBottom(chatKeyboardOffset > 40 ? 'auto' : 'smooth');
  }, [messages.length, chatKeyboardOffset, isChatOpen]);

  useEffect(() => {
  if (!selectedJob?.client_id) return;

  let active = true;

  async function loadClientProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', selectedJob.client_id)
      .maybeSingle();

    if (error) {
      console.warn('Error cargando perfil cliente:', error.message);
      return;
    }

    if (active) {
      setClientProfile(data || null);
    }
  }

  loadClientProfile();

  return () => {
    active = false;
  };
}, [selectedJob?.client_id]);
useEffect(() => {
  if (!user?.id) return;

  let active = true;

  async function loadWorkerSelfProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && active) {
      setWorkerSelfProfile(data || null);
    }
  }

  loadWorkerSelfProfile();

  return () => {
    active = false;
  };
}, [user?.id]);
async function fetchRoadRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return null;

    const coords = data.routes[0].geometry.coordinates;
    const route = coords.map((c) => [c[1], c[0]]);

    return {
      route,
      distanceKm: data.routes[0].distance / 1000,
      durationMin: Math.round(data.routes[0].duration / 60),
    };
  } catch (e) {
    console.warn('route error', e);
    return null;
  }
}

function openGoogleMaps(lat, lng) {
  if (lat == null || lng == null) {
    toast.error('El cliente todavía no compartió ubicación');
    return;
  }

  const la = Number(lat);
  const lo = Number(lng);

  if (Number.isNaN(la) || Number.isNaN(lo)) {
    toast.error('Ubicación inválida');
    return;
  }

  const mapUrl = safeExternalUrl(
    `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}&travelmode=driving`,
    { allowedHosts: ['google.com', 'www.google.com'] }
  );

  if (!mapUrl) {
    toast.error('No pudimos abrir Google Maps');
    return;
  }

  window.open(mapUrl, '_blank', 'noopener,noreferrer');
}

function openExternalNavigation(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);

  if (Number.isNaN(la) || Number.isNaN(lo)) {
    toast.error('UbicaciÃ³n invÃ¡lida');
    return;
  }

  const mapUrl = safeExternalUrl(
    `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}&travelmode=driving`,
    { allowedHosts: ['google.com'] }
  );
  if (!mapUrl) return;

  window.open(mapUrl, '_blank', 'noopener,noreferrer');
}
const stats = useMemo(() => {
  const total = jobs.length;
  const available = jobs.filter((j) => j.status === 'open').length;
  const inProgress = jobs.filter((j) =>
    j.status === 'accepted' || j.status === 'assigned'
  ).length;
  const scheduled = jobs.filter((j) => j.status === 'scheduled').length;
  const completed = jobs.filter((j) => j.status === 'completed').length;

  return { total, available, inProgress, scheduled, completed };
}, [jobs]);
const sheetSnapMeta = useMemo(() => {
  if (sheetSnap === 'full') {
    return {
      y: 0,
      height: 'min(78dvh, 680px)',
    };
  }

  if (sheetSnap === 'mini') {
    return {
      y: 240,
      height: '170px',
    };
  }

  return {
    y: 110,
    height: '360px',
  };
}, [sheetSnap]);
  useEffect(() => {
    if (typeof window !== 'undefined' && status) {
      localStorage.setItem('worker_status', status);
    }
  }, [status]);

  /* === SESIÃ“N === */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (async () => {
      try {
        if (typeof Audio !== 'undefined') {
          soundRef.current = new Audio('/notify.mp3');
          soundRef.current.load();
        }

        const { user: currentUser } = await requireRole({
          supabase,
          router,
          allowedRoles: ['worker'],
          fallbackPath: '/role-selector',
        });

        if (!currentUser) return;

        setUser(currentUser);
        await ensureWorkerProfile(currentUser.id);
      } catch (err) {
        console.error('Error inicializando sesiÃ³n:', err);
        toast.error('Error al obtener usuario o sesiÃ³n expirada');
        router.replace('/auth/login');
      }
    })();
  }, [router]);


 /* === GEO FIX REALTIME PRO === */
useEffect(() => {
  if (!user?.id || !navigator.geolocation) return;

  let lastSent = 0;
  let lastLat = null;
  let lastLng = null;

  const distance = (a, b, c, d) => {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(c - a);
    const dLon = toRad(d - b);
    const la1 = toRad(a);
    const la2 = toRad(c);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  const watcher = navigator.geolocation.watchPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setWorkerLocation({ lat, lng });

      const now = Date.now();
      const movedEnough =
        lastLat === null || distance(lastLat, lastLng, lat, lng) > 50;
      const timeOk = now - lastSent > 30000;

      if (!movedEnough && !timeOk) return;

      lastLat = lat;
      lastLng = lng;
      lastSent = now;

      try {
        // ðŸ”¥ 1. actualizar perfil
        await supabase.from('worker_profiles').upsert(
          {
            user_id: user.id,
            lat,
            lng,
            last_lat: lat,
            last_lon: lng,
            status,
            is_active: status === 'available',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        // ðŸ”¥ 2. guardar en tabla realtime (ESTO FALTABA)
       await supabase.from('worker_locations').upsert(
  {
    user_id: user.id,
    lat,
    lng,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'user_id' }
);

        if (process.env.NODE_ENV === 'development') {
  console.log('ubicación enviada realtime');
}
      } catch (err) {
        console.error('âŒ Error GPS realtime:', err);
      }
    },
    (err) => console.warn('ðŸš« Error GPS:', err),
    {
  enableHighAccuracy: false,
  maximumAge: 30000,
  timeout: 7000,
}
  );

  return () => navigator.geolocation.clearWatch(watcher);
}, [user?.id, status]);

  /* === CARGAR STATUS === */
  useEffect(() => {
    if (!user?.id) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('status, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo estado:', error.message);
        return;
      }

      if (data?.status) setStatus(data.status === 'paused' ? 'paused' : 'available');
    };

    fetchStatus();
  }, [user?.id]);

  /* === INTERNET === */
  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsConnected(online);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  /* === JOBS === */
  async function loadJobs() {
  const workerId = user?.id;
  if (!workerId) return;

  try {
    setLoading((prev) => (jobs.length === 0 ? true : prev));

    const { data: workerProfile, error: workerProfileErr } = await supabase
      .from('worker_profiles')
      .select('status, skills')
      .eq('user_id', workerId)
      .maybeSingle();

    if (workerProfileErr) throw workerProfileErr;

    const workerSkills = Array.isArray(workerProfile?.skills) ? workerProfile.skills : [];

    const { data: jobsData, error: jobsErr } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        status,
        client_id,
        worker_id,
        client_lat,
        client_lng,
        created_at,
        service_type
      `)
      .or(`status.eq.open,worker_id.eq.${workerId}`)
      .order('created_at', { ascending: false });

    if (jobsErr) throw jobsErr;

    const rawList = jobsData || [];

   const filteredList = rawList.filter((job) => {
  const assignedToMe = String(job.worker_id || '') === String(workerId);
  const isOpen = String(job.status || '').toLowerCase() === 'open';

  // âœ… Si el pedido ya viene dirigido a este trabajador,
  // debe aparecer sÃ­ o sÃ­.
  if (assignedToMe) return true;

  // ðŸš« Si no estÃ¡ abierto y no es mÃ­o, no se muestra.
  if (!isOpen) return false;

  // âœ… Pedidos generales: filtrar por rubro/skills.
  return matchesWorkerService(job, workerSkills);
});

    const clientIds = [...new Set(filteredList.map((j) => j.client_id).filter(Boolean))];

    let profilesMap = {};
    if (clientIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', clientIds);

      if (profErr) throw profErr;

      profilesMap = (profs || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }

    const jobIds = filteredList.map((job) => job.id).filter(Boolean);
    const { data: chatsData } = jobIds.length
      ? await supabase
          .from('chats')
          .select('id, job_id, created_at')
          .in('job_id', jobIds)
          .eq('worker_id', workerId)
      : { data: [] };

    const chatByJobId = {};
    for (const chat of chatsData || []) {
      if (chat?.job_id && !chatByJobId[String(chat.job_id)]) {
        chatByJobId[String(chat.job_id)] = chat;
      }
    }

    const chatIds = (chatsData || []).map((chat) => chat.id).filter(Boolean);
    const { data: messagesData } = chatIds.length
  ? await supabase
      .from('messages')
      .select('id, chat_id, text, content, body, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })
      .limit(80)
  : { data: [] };

    const lastMessageByChatId = {};
    for (const message of messagesData || []) {
      const chatId = String(message.chat_id || '');
      if (chatId && !lastMessageByChatId[chatId]) {
        lastMessageByChatId[chatId] = message;
      }
    }

    const nextJobLastMessages = {};
    const enriched = filteredList
      .map((j) => {
        const chat = chatByJobId[String(j.id)] || null;
        const lastMessage = chat?.id ? lastMessageByChatId[String(chat.id)] || null : null;
        if (lastMessage) nextJobLastMessages[String(j.id)] = lastMessage;

        return {
          ...j,
          client: profilesMap[j.client_id] || null,
          chat_id: chat?.id || null,
          last_activity_at: lastMessage?.created_at || chat?.created_at || j.created_at || null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.last_activity_at || b.created_at || 0).getTime() -
          new Date(a.last_activity_at || a.created_at || 0).getTime()
      );

    setJobs(enriched);
    setJobLastMessages(nextJobLastMessages);

    const currentStatus = workerProfile?.status || 'available';
    const finalStatus = currentStatus === 'paused' ? 'paused' : 'available';
    const finalIsActive = finalStatus === 'available';

    setStatus(finalStatus);

    await supabase
      .from('worker_profiles')
      .update({
        status: finalStatus,
        is_active: finalIsActive,
        busy_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', workerId);
  } catch (err) {
    console.error('âŒ Error cargando trabajos:', err);
    toast.error(userFriendlyError(err, 'Estamos actualizando tus pedidos. Proba de nuevo en un momento.'));
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  if (!user?.id) return;

  loadJobs();
}, [user?.id]);

async function refreshWorkerUnreadBadges() {
  if (!user?.id) return;

  try {
    const seenRaw = localStorage.getItem('manosya_worker_chat_seen_map');
    const seenMap = seenRaw ? JSON.parse(seenRaw) : {};

    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, job_id')
      .eq('worker_id', user.id);

    if (chatsError) throw chatsError;

    const chatIds = (chats || []).map((c) => c.id).filter(Boolean);

    if (!chatIds.length) {
      setWorkerUnreadByJob({});
      setUnreadCount(0);
      setHasUnread(false);
      return;
    }

    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, text, content, body, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    if (msgsError) throw msgsError;

    const chatToJob = (chats || []).reduce((acc, chat) => {
      if (chat.id && chat.job_id) acc[String(chat.id)] = String(chat.job_id);
      return acc;
    }, {});

    const nextByJob = {};
    const nextLastMessages = {};

    (msgs || []).forEach((msg) => {
      const chatId = String(msg.chat_id);
      const jobId = chatToJob[chatId];
      if (!jobId) return;

      if (!nextLastMessages[jobId]) {
        nextLastMessages[jobId] = msg;
      }

      const seenAt = Number(seenMap[chatId] || 0);
      const msgTime = new Date(msg.created_at).getTime();

      if (String(msg.sender_id || '') !== String(user.id) && msgTime > seenAt) {
        nextByJob[jobId] = (nextByJob[jobId] || 0) + 1;
      }
    });

    const total = Object.values(nextByJob).reduce((sum, n) => sum + Number(n || 0), 0);

    setWorkerUnreadByJob(nextByJob);
    setJobLastMessages((prev) => ({ ...prev, ...nextLastMessages }));
    setJobs((prev) =>
      [...prev]
        .map((job) => {
          const lastMessage = nextLastMessages[String(job.id)];
          return lastMessage
            ? { ...job, last_activity_at: lastMessage.created_at || job.last_activity_at || job.created_at }
            : job;
        })
        .sort(
          (a, b) =>
            new Date(b.last_activity_at || b.created_at || 0).getTime() -
            new Date(a.last_activity_at || a.created_at || 0).getTime()
        )
    );
    setUnreadCount(total);
    setHasUnread(total > 0);
  } catch (err) {
    console.warn('Error refrescando badges trabajador:', err);
  }
}

useEffect(() => {
  if (!user?.id) return;

  refreshWorkerUnreadBadges();

  const timer = setInterval(refreshWorkerUnreadBadges, 20000);

  return () => clearInterval(timer);
}, [user?.id]);

  useEffect(() => {
    if (mapOpen) {
      setTimeout(() => {
        const map = document.querySelector('.leaflet-container');
        if (map) window.dispatchEvent(new Event('resize'));
      }, 300);
    }
  }, [mapOpen]);
useEffect(() => {
  if (!selectedJob?.id) return;

  const fresh = jobs.find((j) => String(j.id) === String(selectedJob.id));
  if (!fresh) return;

  const ended = ['cancelled', 'completed', 'worker_completed'].includes(
    String(fresh.status || '').toLowerCase()
  );

 if (!ended) return;

setPreviewMapOpen(false);
setPreviewTarget(null);
setPreviewRoute(null);
setMapOpen(false);

if (String(fresh.status || '').toLowerCase() === 'cancelled') {
  setSelectedJob(null);
  setIsChatOpen(false);
}

  toast(
    fresh.status === 'cancelled'
      ? 'ðŸš« El cliente cancelÃ³ el trabajo'
      : 'âœ… El cliente finalizÃ³ el trabajo'
  );
}, [jobs, selectedJob]);
/* === NUEVOS TRABAJOS === */
useEffect(() => {
  if (!user?.id) return;

  let cancelled = false;

  const playNotify = async () => {
    try {
      if (!soundRef.current) return;
      soundRef.current.pause();
      soundRef.current.currentTime = 0;
      await soundRef.current.play();
    } catch (err) {
      console.warn('Error reproduciendo sonido de nuevo trabajo:', err);
    }
  };

  const channel = supabase
    .channel(`worker-new-job-sound-${user.id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'jobs' },
      async (payload) => {
        const job = payload.new;

        if (!job || cancelled) return;
        if (String(job.status || '').toLowerCase() !== 'open') return;
        if (status !== 'available') return;

        const { data: workerProfile, error } = await supabase
          .from('worker_profiles')
          .select('skills')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('Error leyendo skills del worker para notificaciÃ³n:', error.message);
          return;
        }

        const workerSkills = Array.isArray(workerProfile?.skills)
          ? workerProfile.skills
          : [];

        const assignedToMe = String(job.worker_id || '') === String(user.id);

        if (!assignedToMe && !matchesWorkerService(job, workerSkills)) return;

        let client = null;

        if (job.client_id) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', job.client_id)
            .maybeSingle();

          if (!profileErr) {
            client = profile || null;
          }
        }

        const enrichedJob = {
          ...job,
          client,
        };

        setJobs((prev) => {
          const exists = prev.some((j) => String(j.id) === String(enrichedJob.id));
          return exists ? prev : [enrichedJob, ...prev];
        });

        await playNotify();

        const details = parseJobRequestDetails(job.description);

        toast(
          details.requestKind === 'booking'
            ? 'ðŸ—“ï¸ Nueva agenda disponible para tu servicio'
            : details.requestKind === 'quote'
            ? 'ðŸ’¬ Nuevo presupuesto disponible para tu servicio'
            : 'ðŸ†• Â¡Nueva solicitud de trabajo disponible!'
        );
      }
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}, [user?.id, status]);


/* === REALTIME CORE === */
useEffect(() => {
  if (!user?.id) return;

  async function messageBelongsToThisWorker(message) {
    if (!message?.chat_id) return false;

    const chatId = String(message.chat_id);

    if (workerChatIdsRef.current.has(chatId)) {
      return true;
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .select('id, worker_id')
      .eq('id', message.chat_id)
      .eq('worker_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo validar el chat del trabajador:', error.message);
      return false;
    }

    if (!chat?.id) return false;

    workerChatIdsRef.current.add(String(chat.id));
    return true;
  }

  const stop = startRealtimeCore((type, data) => {
    try {
      switch (type) {
        case 'job': {
          if (data.__source === 'insert' && data.status === 'open') {
            if (status === 'available') {
              (async () => {
                const { data: workerProfile, error: workerErr } = await supabase
                  .from('worker_profiles')
                  .select('skills')
                  .eq('user_id', user.id)
                  .maybeSingle();

                if (workerErr) {
                  console.warn('Error leyendo skills en realtime core:', workerErr.message);
                  return;
                }

                const workerSkills = Array.isArray(workerProfile?.skills)
                  ? workerProfile.skills
                  : [];

                const assignedToMe = String(data.worker_id || '') === String(user.id);

// âœ… Pedido directo al trabajador: entra siempre.
// âœ… Pedido general: entra solo si matchea rubro.
if (!assignedToMe && !matchesWorkerService(data, workerSkills)) return;

                let client = null;

                if (data.client_id) {
                  const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('id', data.client_id)
                    .maybeSingle();

                  if (!profileErr) {
                    client = profile || null;
                  }
                }

                const enrichedJob = { ...data, client };

                setJobs((prev) => {
                  const exists = prev.some((j) => j.id === enrichedJob.id);
                  return exists ? prev : [enrichedJob, ...prev];
                });

                try {
                  soundRef.current?.pause?.();
                  if (soundRef.current) soundRef.current.currentTime = 0;
                  soundRef.current?.play?.();
                } catch (err) {
                  console.warn('Error reproduciendo sonido en realtime core:', err);
                }

                const details = parseJobRequestDetails(data.description);
                toast(
                  details.requestKind === 'booking'
                    ? 'ðŸ—“ï¸ Nueva agenda disponible para tu servicio'
                    : details.requestKind === 'quote'
                    ? 'ðŸ’¬ Nuevo presupuesto disponible para tu servicio'
                    : 'ðŸ†• Nuevo pedido disponible cerca tuyo'
                );
              })();
            }
            return;
          }

          if (String(data.worker_id || '') === String(user.id)) {
            setJobs((prev) =>
              prev.some((j) => j.id === data.id)
                ? prev.map((j) => (j.id === data.id ? { ...j, ...data } : j))
                : [data, ...prev]
            );

            if (selectedJob?.id === data.id) {
              setSelectedJob((prev) => (prev ? { ...prev, status: data.status } : prev));
            }

            if (data.status === 'cancelled') {
              toast.warning('ðŸš« El cliente cancelÃ³ el trabajo.');

              (async () => {
                const { data: wp } = await supabase
                  .from('worker_profiles')
                  .select('status')
                  .eq('user_id', user.id)
                  .maybeSingle();

                const nextStatus = wp?.status === 'paused' ? 'paused' : 'available';

                await supabase
                  .from('worker_profiles')
                  .update({
                    status: nextStatus,
                    is_active: nextStatus === 'available',
                    busy_until: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', user.id);

                setStatus(nextStatus);
              })();
            } else if (data.status === 'completed') {
              toast.success('ðŸŽ‰ Trabajo finalizado por el cliente.');

              (async () => {
                const { data: wp } = await supabase
                  .from('worker_profiles')
                  .select('status')
                  .eq('user_id', user.id)
                  .maybeSingle();

                const nextStatus = wp?.status === 'paused' ? 'paused' : 'available';

                await supabase
                  .from('worker_profiles')
                  .update({
                    status: nextStatus,
                    is_active: nextStatus === 'available',
                    busy_until: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', user.id);

                setStatus(nextStatus);
              })();

              setIsChatOpen(false);
            } else if (data.status === 'accepted' || data.status === 'assigned' || data.status === 'scheduled') {
              setStatus((prev) => (prev === 'paused' ? 'paused' : 'available'));
            }
          }

          if (data.__source === 'delete') {
            setJobs((prev) => prev.filter((j) => j.id !== data.id));
          }
          break;
        }

        case 'message': {
          (async () => {
            const belongs = await messageBelongsToThisWorker(data);

            if (!belongs) return;
            if (data.sender_id === user.id) return;

            if (selectedJob?.chat_id === data.chat_id && isChatOpen) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.id)) return prev;
                return [...prev, data];
              });

              setHasUnread(false);
              setUnreadCount(0);
            } else {
              setHasUnread(true);
              setUnreadCount((prev) => prev + 1);
            }

            try {
              soundRef.current?.pause?.();
              if (soundRef.current) soundRef.current.currentTime = 0;
              soundRef.current?.play?.();
            } catch (err) {
              console.warn('Error reproduciendo sonido mensaje:', err);
            }
          })();
          break;
        }

        case 'profile': {
          if (data.user_id === user.id && data.status) {
            setStatus(data.status);
          }
          break;
        }

        default:
          console.log('Evento realtime desconocido:', type, data);
      }
    } catch (err) {
      console.warn('âš ï¸ Error en RealtimeCore worker:', err);
    }
  });

  return () => {
    if (typeof stop === 'function') stop();
    else stopRealtimeCore();
  };
}, [user?.id, selectedJob?.chat_id, selectedJob?.id, status, isChatOpen]);

   useEffect(() => {
    if (isChatOpen) {
      setHasUnread(false);
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  /* === TOGGLE STATUS === */
async function toggleStatus() {
  try {
    const activeImmediateJob = jobs.find((job) => {
      const mine = String(job.worker_id || '') === String(user?.id || '');
      const active = ['accepted', 'assigned'].includes(String(job.status || '').toLowerCase());
      return mine && active && !shouldKeepWorkerAvailable(job);
    });

    if (status === 'busy' && activeImmediateJob) {
      toast.warning('TenÃ©s un trabajo inmediato en curso. Finalizalo antes de volver a disponible.');
      return;
    }

    let newStatus;
    let newIsActive;

    if (status === 'available') {
      newStatus = 'paused';
      newIsActive = false;
    } else if (status === 'paused') {
      newStatus = 'available';
      newIsActive = true;
    } else {
      newStatus = 'available';
      newIsActive = true;
    }

    setStatus(newStatus);

    const { error } = await supabase
      .from('worker_profiles')
      .update({
        status: newStatus,
        is_active: newIsActive,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;

    toast.success(
      newStatus === 'available'
        ? 'ðŸŸ¢ EstÃ¡s disponible'
        : newStatus === 'paused'
        ? 'â¸ï¸ EstÃ¡s en pausa'
        : 'ðŸ”µ EstÃ¡s trabajando'
    );
  } catch (err) {
    console.error('Error cambiando estado:', err.message);
    toast.error(userFriendlyError(err, 'No pudimos actualizar tu estado. Proba de nuevo.'));
  }
}

async function openWorkerJob(job) {
  try {
    if (!job?.id || !user?.id) {
      toast.error('Faltan datos para abrir el pedido');
      return;
    }

    await openChat(job);
  } catch (err) {
    console.error('âŒ Error abriendo pedido:', err);
    toast.error(userFriendlyError(err, 'No pudimos abrir este pedido ahora. Proba de nuevo.'));
  }
}

  /* === REJECT JOB === */
  async function rejectJob(job) {
    try {
      const { error } = await supabase.from('jobs').update({ status: 'rejected' }).eq('id', job.id);
      if (error) throw error;
      toast('ðŸš« Trabajo rechazado correctamente');
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      toast.error('Error al rechazar trabajo');
      console.error(err);
    }
  }

  /* === COMPLETE JOB === */
  async function completeJob(job) {
    try {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      const { data: wp, error: wpErr } = await supabase
        .from('worker_profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wpErr) throw wpErr;

      const nextStatus = wp?.status === 'paused' ? 'paused' : 'available';
      const nextIsActive = nextStatus === 'available';

      const { error: workerError } = await supabase
        .from('worker_profiles')
        .update({
          status: nextStatus,
          is_active: nextIsActive,
          busy_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (workerError) throw workerError;

      setStatus(nextStatus);

      toast.success('ðŸŽ‰ Trabajo finalizado correctamente');

      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'completed' } : j)));

      setSelectedJob(null);
      setIsChatOpen(false);

      await loadJobs();
    } catch (err) {
      toast.error('Error al finalizar el trabajo');
      console.error(err);
    }
  }

  /* === OPEN CHAT === */
async function openChat(job) {
  try {
    if (!job?.id || !job?.client_id || !user?.id) {
      toast.error('Faltan datos para abrir el chat');
      return;
    }

    let cid = job?.chat_id ? String(job.chat_id) : null;

    if (!cid) {
      const { data: chatByJob, error: chatByJobError } = await supabase
        .from('chats')
        .select('id')
        .eq('job_id', job.id)
        .eq('client_id', job.client_id)
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (chatByJobError) throw chatByJobError;

      if (chatByJob?.id) {
        cid = chatByJob.id;
      } else {
        const { data: chatByPair, error: chatByPairError } = await supabase
          .from('chats')
          .select('id, job_id')
          .eq('client_id', job.client_id)
          .eq('worker_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (chatByPairError) throw chatByPairError;

        if (chatByPair?.id && !chatByPair?.job_id) {
          cid = chatByPair.id;

          const { error: linkChatError } = await supabase
            .from('chats')
            .update({ job_id: job.id })
            .eq('id', cid);

          if (linkChatError) throw linkChatError;
        } else {
          const { data: newChat, error: newChatError } = await supabase
            .from('chats')
            .insert([
              {
                job_id: job.id,
                client_id: job.client_id,
                worker_id: user.id,
              },
            ])
            .select('id')
            .single();

          if (newChatError) {
            if (newChatError.code === '23505') {
              const { data: racedChat, error: racedChatError } = await supabase
                .from('chats')
                .select('id')
                .eq('job_id', job.id)
                .maybeSingle();

              if (racedChatError) throw racedChatError;
              if (racedChat?.id) {
                cid = racedChat.id;
              } else {
                throw newChatError;
              }
            } else {
              throw newChatError;
            }
          } else {
          cid = newChat.id;
          }
        }
      }
    }

    workerChatIdsRef.current.add(String(cid));

    const { data: msgs, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', cid)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;

    setMessages(msgs || []);
setSelectedJob({ ...job, chat_id: cid });
setIsChatOpen(true);

try {
  const seenRaw = localStorage.getItem('manosya_worker_chat_seen_map');
  const seenMap = seenRaw ? JSON.parse(seenRaw) : {};
  seenMap[String(cid)] = Date.now();
  localStorage.setItem('manosya_worker_chat_seen_map', JSON.stringify(seenMap));
} catch {}

setWorkerUnreadByJob((prev) => {
  const next = { ...prev };
  delete next[String(job.id)];

  const total = Object.values(next).reduce((sum, n) => sum + Number(n || 0), 0);
  setUnreadCount(total);
  setHasUnread(total > 0);

  return next;
});

    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
    }

    const ch = supabase
      .channel(`chat-${cid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${String(cid)}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });

          if (payload.new.sender_id !== user.id) {
            setClientTyping(false);

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }

            try {
              soundRef.current?.pause?.();
              if (soundRef.current) soundRef.current.currentTime = 0;
              soundRef.current?.play?.();
            } catch (err) {
              console.warn('Error reproduciendo sonido mensaje:', err);
            }
          }

          setTimeout(() => {
            scrollWorkerChatToBottom();
          }, 80);
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload?.sender_id !== user.id) {
          setClientTyping(true);

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          typingTimeoutRef.current = setTimeout(() => {
            setClientTyping(false);
            typingTimeoutRef.current = null;
          }, 2000);
        }
      })
      .subscribe();

    chatChannelRef.current = ch;
  } catch (err) {
    console.error('âŒ Error abriendo chat:', err);
    toast.error(userFriendlyError(err, 'No pudimos abrir el chat ahora. Proba de nuevo.'));
  }
}

useEffect(() => {
  if (!user?.id || !deepLinkChatId) return;
  if (openedChatParamRef.current === deepLinkChatId) return;

  let alive = true;

  async function openDeepLinkedChat() {
    try {
      openedChatParamRef.current = deepLinkChatId;

      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, job_id, client_id, worker_id')
        .eq('id', deepLinkChatId)
        .eq('worker_id', user.id)
        .maybeSingle();

      if (chatError) throw chatError;
      if (!chat?.client_id) {
        toast.error('No encontramos este chat en tus pedidos');
        return;
      }

      let job = chat.job_id
        ? jobs.find((item) => String(item.id) === String(chat.job_id))
        : null;

      if (!job && chat.job_id) {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', chat.job_id)
          .maybeSingle();

        if (jobError) throw jobError;
        job = jobData;
      }

      if (!job) {
        const { data: newJob, error: createJobError } = await supabase
          .from('jobs')
          .insert([
            {
              client_id: chat.client_id,
              worker_id: user.id,
              status: 'open',
              description: 'Consulta desde chat cliente',
            },
          ])
          .select('*')
          .single();

        if (createJobError) throw createJobError;
        job = newJob;

        const { error: linkChatError } = await supabase
          .from('chats')
          .update({ job_id: job.id })
          .eq('id', chat.id);

        if (linkChatError) throw linkChatError;
      }

      if (!alive || !job) return;

      setWorkerTab('jobs');
      await openChat({ ...job, client_id: chat.client_id, worker_id: chat.worker_id, chat_id: chat.id });
      router.replace('/worker', { scroll: false });
    } catch (error) {
      console.error('open worker chat deeplink error:', error);
      toast.error(userFriendlyError(error, 'No pudimos abrir este chat ahora. Proba actualizar.'));
    }
  }

  openDeepLinkedChat();

  return () => {
    alive = false;
  };
}, [deepLinkChatId, user?.id, jobs.length]);

/* === SEND MESSAGE === */
async function sendMessage() {
  const safety = inspectTextSafety(inputRef.current?.value || '');
  if (!safety.ok) {
    toast.error(safety.error);
    return;
  }

  if (!selectedJob?.chat_id) {
    toast.error('No hay chat activo');
    return;
  }

  if (selectedJob?.status === 'completed') {
    toast.info('âœ… Este trabajo ya fue finalizado. No se pueden enviar mÃ¡s mensajes.');
    return;
  }

  try {
    const attempt = canAttemptAction(`worker-panel-chat:${selectedJob.chat_id}:${user.id}`, { limit: 8, windowMs: 60_000 });
    if (!attempt.allowed) {
      toast.warning('EstÃ¡s enviando muy rÃ¡pido. EsperÃ¡ unos segundos.');
      return;
    }

    setSending(true);

    const { data, error } = await supabase.rpc('post_chat_message', {
      p_chat_id: selectedJob.chat_id,
      p_text: safety.text,
    });

    if (error) throw error;

    setMessages((prev) => {
      const nextMessage = Array.isArray(data) ? data[0] : data;
      if (!nextMessage || prev.some((m) => m.id === nextMessage.id)) return prev;
      return [...prev, nextMessage];
    });

    inputRef.current.value = '';
    setTimeout(() => scrollWorkerChatToBottom(), 80);
  } catch (err) {
    console.error('âŒ Error enviando mensaje:', err);
    toast.error(userFriendlyError(err, 'No pudimos enviar el mensaje. Proba de nuevo.'));
  } finally {
    setSending(false);
  }
}

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(98,191,185,0.16),transparent_34%),linear-gradient(180deg,#f7fffd_0%,#ffffff_42%,#f8fafc_100%)] flex flex-col items-center justify-center text-emerald-600">
        <Loader2 className="animate-spin w-6 h-6 mb-2" />
        <p className="font-semibold">Cargando trabajos...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(98,191,185,0.16),transparent_34%),linear-gradient(180deg,#f7fffd_0%,#ffffff_42%,#f8fafc_100%)] text-gray-900 pb-28"
    >
      <div className="max-w-screen-md mx-auto px-4 pt-5">
        {/* HEADER SOCIAL SIMPLE */}
<header className="mb-4 flex items-center justify-between">
 <button
  type="button"
  onClick={() => {
    router.replace('/role-selector');
  }}
  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm active:scale-95"
  aria-label="Cambiar modo"
  title="Cambiar modo"
>
  <ChevronLeft size={21} />
</button>

  <div className="text-center">
    <div className="text-[20px] font-black text-slate-950">
      Manos<span className="text-[#18b8aa]">YA</span>
    </div>
    <div className="text-[11px] font-bold text-slate-400">
      Mi espacio de trabajo
    </div>
  </div>

  <button
    type="button"
    onClick={toggleStatus}
    className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm active:scale-95 ${
      status === 'available' ? 'bg-[#18b8aa]' : 'bg-slate-900'
    }`}
  >
    <Power size={19} />
  </button>
</header>

{/* CARD SOCIAL DEL TRABAJADOR */}
<section className="mb-4 rounded-[32px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
  <div className="flex items-center gap-4">
    <div className="relative">
      <img
  src={workerSelfProfile?.avatar_url || '/avatar-fallback.png'}
  onError={(e) => {
    e.currentTarget.src = '/avatar-fallback.png';
  }}
  alt={workerSelfProfile?.full_name || 'Trabajador'}
  className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-sm"
/>

      <span
        className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
          status === 'available'
            ? 'bg-[#18b8aa]'
            : status === 'paused'
            ? 'bg-slate-400'
            : 'bg-cyan-500'
        }`}
      />
    </div>

    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[22px] font-black text-slate-950">
        {meta.title}
      </h1>

      <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">
        {status === 'available'
          ? 'EstÃ¡s visible para recibir pedidos.'
          : status === 'paused'
          ? 'EstÃ¡s en pausa. Nadie te verÃ¡ disponible.'
          : 'TenÃ©s un servicio en curso.'}
      </p>
    </div>
  </div>

  <div className="mt-5 grid grid-cols-3 gap-2">
    <div className="rounded-2xl bg-[#63c0ba]/10 p-3 text-center">
      <div className="text-[20px] font-black text-slate-950">{stats.available}</div>
      <div className="text-[10px] font-black uppercase text-slate-400">Nuevos</div>
    </div>

    <div className="rounded-2xl bg-[#63c0ba]/10 p-3 text-center">
      <div className="text-[20px] font-black text-slate-950">{stats.inProgress}</div>
      <div className="text-[10px] font-black uppercase text-slate-400">Activos</div>
    </div>

    <div className="rounded-2xl bg-[#63c0ba]/10 p-3 text-center">
      <div className="text-[20px] font-black text-slate-950">{stats.completed}</div>
      <div className="text-[10px] font-black uppercase text-slate-400">Hechos</div>
    </div>
  </div>

  <button
    type="button"
    onClick={toggleStatus}
    className={`mt-5 w-full rounded-full px-5 py-4 text-[15px] font-black text-white shadow-[0_14px_30px_rgba(98,191,185,0.22)] active:scale-[0.98] ${
      status === 'available' ? 'bg-[#18b8aa]' : 'bg-slate-900'
    }`}
  >
    {status === 'available'
      ? 'Estoy disponible'
      : status === 'paused'
      ? 'Volver a estar disponible'
      : 'Estoy disponible'}
  </button>
</section>

{/* TABS SOCIAL LIMPIO */}
<div className="sticky top-2 z-30 mb-4 rounded-full bg-white p-1.5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
  <div className="grid grid-cols-2 gap-1.5">
    <WorkerTabButton
      active={workerTab === 'jobs'}
      icon={<Briefcase size={15} />}
      label="Pedidos"
      onClick={() => setWorkerTab('jobs')}
    />

    <WorkerTabButton
      active={false}
      icon={<User2 size={15} />}
      label="Perfil"
      onClick={() => router.push('/worker/onboard')}
    />
  </div>
</div>
{/* CTA PRINCIPAL FEED */}
<button
  type="button"
  onClick={() => router.push('/worker/feed')}
  className="
    fixed bottom-[84px] left-1/2 z-[60]
    flex -translate-x-1/2 items-center gap-2
    rounded-full bg-[#18b8aa]
    px-6 py-4
    text-[14px]font-black text-white
    shadow-[0_18px_45px_rgba(24,184,170,0.34)]
    active:scale-[0.97]
  "
>
  <Sparkles size={17} />
  Mostrar mi trabajo
</button>
        {/* CONTENIDO SIMPLE */}
        {workerTab === 'jobs' && (
          jobs.length === 0 ? (
            <div className="mt-6 rounded-[30px] border border-dashed border-[#62bfb9]/35 bg-white/82 p-8 text-center shadow-[0_18px_50px_rgba(98,191,185,0.10)] backdrop-blur">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#62bfb9]/12 text-[#18b8aa]"><Briefcase size={28} /></div>
              <h3 className="mt-4 text-[21px] font-black text-slate-950">TodavÃ­a no hay pedidos</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] font-semibold leading-6 text-slate-500">Cuando entre una solicitud compatible con tus rubros, aparece acÃ¡ al instante.</p>
            </div>
          ) : (
            <section className="grid gap-3">
  {jobs.map((job, index) => {
    const details = parseJobRequestDetails(job.description);

    const isOpen = job.status === 'open';

    const isActiveJob =
      job.status === 'accepted' ||
      job.status === 'assigned' ||
      job.status === 'scheduled';

    const clientName =
  job?.client?.full_name?.trim() ||
  'Cliente ManosYA';

const lastMessage =
  jobLastMessages?.[job.id];

const clientMessage =
  lastMessage?.text?.trim() ||
  details.notes ||
  details.summary.join(' Â· ') ||
  job.title ||
  'Consulta desde feed cliente';

const isThisJobSelected =
  selectedJob?.id && String(selectedJob.id) === String(job.id);

const unreadMessages =
  Number(workerUnreadByJob?.[String(job.id)] || 0);

    return (
     <motion.article
  key={job.id}
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.02 }}
  onClick={() => openWorkerJob(job)}
  className="
    group relative overflow-hidden
    rounded-[18px]
    border border-[#63c0ba]/10
    bg-white/96
    px-3 py-2.5
    shadow-[0_4px_14px_rgba(15,23,42,0.04)]
    active:scale-[0.99]
  "
>
 <div className="flex items-center gap-3">
    <div className="relative shrink-0">
      <img
        src={job?.client?.avatar_url || '/avatar-fallback.png'}
        alt={clientName}
        className="
          h-10 w-10 rounded-xl
          border border-[#63c0ba]/15
          object-cover
        "
      />

      <span className="
        absolute -bottom-1 -right-1
        flex h-5 w-5 items-center justify-center
        rounded-full bg-[#18b8aa]
        text-white shadow-sm
      ">
        <MessageCircle size={11} />
      </span>
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[15px] font-black text-slate-950">
          {clientName}
        </h3>

        <span
          className={`
            shrink-0 rounded-full px-2.5 py-1
            text-[10px] font-black
            ${jobStatusPill(job.status)}
          `}
        >
          {prettyStatus(job.status)}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="
          rounded-full bg-[#63c0ba]/10
          px-2 py-1 text-[10px]
          font-black text-[#128f86]
        ">
          {details.serviceLabel || job.service_type || 'Servicio'}
        </span>

        <span className="truncate text-[11px] font-bold text-slate-400">
          Cliente conectado
        </span>
      </div>

     <p className="
        mt-1 line-clamp-1
        text-[12px] font-semibold
        leading-4 text-slate-500
      ">
        {clientMessage}
      </p>
    </div>
  </div>

<div className="ml-[52px] mt-2 flex items-center justify-between">
  <div className="flex items-center gap-1">
    <span className="h-2 w-2 rounded-full bg-[#18b8aa]" />

    <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#18b8aa]">
      Chat activo
    </span>
  </div>

  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openGoogleMaps(job.client_lat, job.client_lng);
      }}
      className="
        relative flex h-9 w-9 items-center justify-center
        rounded-full bg-red-50 text-red-500
        shadow-sm
        active:scale-95
      "
    >
      <MapPin size={16} />
    </button>

    <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    openWorkerJob(job);
  }}
  className="
    relative flex h-9 w-9 items-center justify-center
    rounded-full bg-[#18b8aa]/10
    text-[#18b8aa]
    transition-all duration-200
    hover:bg-[#18b8aa]/18
    active:scale-95
  "
>
  <MessageCircle size={16} />

      {unreadMessages > 0 && (
        <span
          key={unreadMessages}
          className="
            absolute -right-1.5 -top-1.5
            flex h-5 min-w-[20px] items-center justify-center
            rounded-full bg-red-500 px-1
            text-[10px] font-black leading-none text-white
            shadow-[0_10px_24px_rgba(239,68,68,0.42)]
            ring-2 ring-white
            animate-pulse
          "
        >
          {unreadMessages > 9 ? '9+' : unreadMessages}
        </span>
      )}
    </button>
  </div>
</div>
</motion.article>
    );
  })}
</section>
          )
        )}

       {workerTab === 'feed' && (
  <WorkerFeedPlaceholder onOpenProfile={() => setWorkerTab('profile')} />
)}

        {workerTab === 'profile' && (
  <section className="rounded-[30px] border border-[#62bfb9]/20 bg-white/86 p-5 shadow-[0_18px_52px_rgba(98,191,185,0.12)] backdrop-blur">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#62bfb9]/12 text-[#18b8aa]">
        <User2 size={22} />
      </div>

      <div>
        <h2 className="text-[19px] font-black text-slate-950">Mi oficio profesional</h2>
        <p className="text-[13px] font-semibold text-slate-500">
          EditÃ¡ foto, rubros, radio de cobertura y presentaciÃ³n laboral.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={() => router.push('/worker/onboard')}
      className="mt-5 w-full rounded-full bg-[#18b8aa] px-5 py-4 text-[15px] font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.26)] active:scale-[0.98]"
    >
      Editar mi oficio
    </button>
  </section>
)}

        {/* CHAT MODAL - MISMO ESTILO CLIENTE */}
<AnimatePresence>
  {isChatOpen && selectedJob && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] overflow-hidden bg-[#63c0ba] text-[#123437]"
    >
      <div
        className="mx-auto flex max-w-3xl flex-col bg-[#63c0ba]"
        style={{ height: chatViewportHeight }}
      >
        <header className="z-20 border-b border-white/35 bg-[#63c0ba]/95 px-3 py-2 shadow-[0_10px_28px_rgba(18,52,55,0.10)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white active:bg-white/28"
            >
              <ChevronLeft size={24} />
            </button>

            <img
              src={selectedJob?.client?.avatar_url || clientProfile?.avatar_url || '/avatar-fallback.png'}
              onError={(e) => {
                e.currentTarget.src = '/avatar-fallback.png';
              }}
              alt={selectedJob?.client?.full_name || 'Cliente'}
              className="h-11 w-11 rounded-full border-2 border-white object-cover"
            />

           <div className="flex items-center gap-3">
 <div className="min-w-0 flex-1">
  <div className="truncate text-[17px] font-black text-white">
    {clientProfile?.full_name ||
      selectedJob?.client?.full_name ||
      'Cliente'}
  </div>

  <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] font-bold text-white/82">
    <span className="truncate">
      {parseJobRequestDetails(selectedJob?.description).serviceLabel ||
        selectedJob?.service_type ||
        'Servicio'}
    </span>
  </div>
</div>
</div>

<button
  type="button"
  onClick={() => openGoogleMaps(selectedJob.client_lat, selectedJob.client_lng)}
  className="
    flex h-10 w-10 shrink-0 items-center justify-center
    rounded-full bg-white/18 text-white
    shadow-sm active:scale-95
  "
>
  <MapPin size={20} />
</button>

    
          </div>

          {clientTyping && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-white/90 animate-pulse">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span>{selectedJob?.client?.full_name || 'El cliente'} estÃ¡ escribiendoâ€¦</span>
            </div>
          )}
        </header>

        <main ref={chatMessagesRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <ChatServicePattern />

          <div className="relative z-10">
            <div className="mx-auto mb-4 w-fit rounded-lg bg-white/28 px-3 py-1 text-[12px] font-black text-[#1e4e53] backdrop-blur-md">
              Hoy
            </div>

            {messages.length > 0 && (
              <div className="mx-auto mb-5 max-w-[330px] rounded-xl bg-white/72 px-4 py-3 text-center text-[12px] font-bold leading-5 text-[#1e4e53] shadow-sm backdrop-blur-md">
                <ShieldCheck size={14} className="mb-1 inline text-[#1e4e53]" /> Los mensajes estÃ¡n protegidos dentro de ManosYA.
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex h-[60vh] flex-col items-center justify-center text-center text-white/90">
                <div className="rounded-full bg-white/22 p-4">
                  <MessageCircle size={28} />
                </div>
                <div className="mt-4 text-lg font-black text-white">
                  ConversaciÃ³n iniciada
                </div>
                <div className="mt-2 max-w-[280px] text-sm font-semibold text-white/80">
                  RespondÃ© disponibilidad, precio o tiempo de llegada.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`relative max-w-[82%] rounded-[18px] px-3 py-2 text-[14px] leading-5 shadow-sm ${
                          mine
                            ? 'rounded-tr-[4px] bg-white text-[#123437]'
                            : 'rounded-tl-[4px] bg-[#dff7f5] text-[#123437]'
                        }`}
                      >
                        {String(m.text || '').includes('ðŸ“ Te compartÃ­ mi ubicaciÃ³n.') ? (
  <button
    type="button"
    onClick={() => {
      if (
        selectedJob?.client_lat != null &&
        selectedJob?.client_lng != null
      ) {
        openGoogleMaps(
          selectedJob.client_lat,
          selectedJob.client_lng
        );
      } else {
        toast.error('UbicaciÃ³n no disponible todavÃ­a');
      }
    }}
    className="
      w-[260px] overflow-hidden
      rounded-[22px]
      bg-white
      text-left
      shadow-[0_10px_28px_rgba(15,23,42,0.10)]
      transition-all
      active:scale-[0.98]
    "
  >
    <div className="relative h-[118px] overflow-hidden bg-[#dff7f5]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(24,184,170,.18) 1px, transparent 1px),
            linear-gradient(rgba(24,184,170,.18) 1px, transparent 1px)
          `,
          backgroundSize: '26px 26px',
        }}
      />

      <div className="absolute left-[-18px] top-8 h-7 w-[130%] rotate-[-10deg] rounded-full bg-white/70" />
      <div className="absolute left-[-22px] top-14 h-6 w-[130%] rotate-[16deg] rounded-full bg-white/80" />

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative">
          <img
            src={selectedJob?.client?.avatar_url || clientProfile?.avatar_url || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={selectedJob?.client?.full_name || clientProfile?.full_name || 'Cliente'}
            className="h-16 w-16 rounded-full border-[4px] border-white object-cover shadow-[0_12px_30px_rgba(15,23,42,0.25)]"
          />

          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-[#18b8aa] text-white shadow-md">
            <MapPin size={14} />
          </span>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-[#123437] shadow-sm">
        Mapa del cliente
      </div>
    </div>

    <div className="p-3">
      <div className="text-[14px] font-black text-[#123437]">
        UbicaciÃ³n compartida
      </div>

      <div className="mt-1 text-[12px] font-semibold text-[#123437]/60">
        TocÃ¡ la tarjeta para abrir el mapa
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#18b8aa] px-3 py-2.5 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(24,184,170,0.24)]">
        <MapPin size={14} />
        Ir a ubicaciÃ³n
      </div>
    </div>
  </button>
) : (
  <div className="whitespace-pre-wrap break-words font-semibold">
    {m.text || ''}
  </div>
)}

                        <div className="mt-1 text-right text-[10px] font-bold text-[#1e4e53]/55">
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="border-t border-white/30 bg-[#63c0ba] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2"
        >
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {['Hola, sÃ­ estoy disponible', 'Â¿Para quÃ© hora necesitÃ¡s?', 'Te paso el precio ahora'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = chip;
                }}
                className="whitespace-nowrap rounded-full bg-white/28 px-3 py-2 text-[11px] font-black text-[#1e4e53] backdrop-blur-md active:bg-white/45"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
  <button
    type="button"
    onClick={() =>
      openGoogleMaps(
        selectedJob?.client_lat,
        selectedJob?.client_lng
      )
    }
    className="
      flex h-12 w-12 shrink-0 items-center justify-center
      rounded-full bg-white/38 text-[#1e4e53]
      shadow-[0_10px_26px_rgba(18,52,55,0.14)]
      backdrop-blur-md active:scale-95
    "
  >
    <MapPin size={20} strokeWidth={2.7} />
  </button>

  <div className="flex min-h-[48px] flex-1 items-center rounded-[24px] bg-white/38 px-4 shadow-[0_10px_28px_rgba(18,52,55,0.10)] backdrop-blur-md">
    <input
      ref={inputRef}
      onFocus={() => setTimeout(() => scrollWorkerChatToBottom('auto'), 120)}
      placeholder="EscribÃ­ un mensaje"
      className="h-12 flex-1 bg-transparent text-[15px] font-bold text-[#123437] outline-none placeholder:text-[#1e4e53]/55"
    />
  </div>

  <button
    type="submit"
    disabled={sending}
    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1e4e53] shadow-[0_10px_26px_rgba(18,52,55,0.16)] disabled:opacity-45"
  >
    <SendHorizontal size={19} strokeWidth={2.7} />
  </button>
</div>
        </form>
      </div>
    </motion.div>
  )}
</AnimatePresence>
      </div>
            {/* PREVIEW MAP MODAL PRO */}
      <AnimatePresence>
        {previewMapOpen && previewTarget && (
                   <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/70"
          >
            <motion.div
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="relative h-[100dvh] w-full overflow-hidden bg-black"
            >
              {/* MAPA FULL */}
              <div className="absolute inset-0 z-0">
                <ManosYaMap
                  center={[previewTarget.lat, previewTarget.lng]}
                  zoom={16}
                  previewTarget={previewTarget}
                  previewTargetName={selectedJob?.client?.full_name || clientProfile?.full_name || 'Cliente'}
                  previewTargetColor="#ef4444"
                  route={previewRoute}
                  routeColor="#059669"
                  routeWeight={5}
                  workerLocation={workerLocation}
                  workerSelfProfile={workerSelfProfile}
                  selectedJob={selectedJob}
                  clientProfile={clientProfile}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>

                           {/* TOP ACTIONS */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200]">
  <div className="flex items-start justify-between gap-3 p-4">
    <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.20)] backdrop-blur">
      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
      <span className="text-[13px] font-bold text-gray-800">
        UbicaciÃ³n del cliente
      </span>
    </div>

    <div className="pointer-events-auto flex items-center gap-2">
      <button
        type="button"
        onClick={() => openExternalNavigation(previewTarget.lat, previewTarget.lng)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#18b8aa] px-4 text-[13px] font-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.20)] active:scale-95"
      >
        <MapPin size={17} />
        Abrir GPS
      </button>

      <button
        type="button"
        onClick={() => {
          setPreviewMapOpen(false);
          setPreviewTarget(null);
          setPreviewRoute(null);
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-[0_10px_30px_rgba(0,0,0,0.20)] backdrop-blur hover:bg-white"
      >
        <XCircle size={22} />
      </button>
    </div>
  </div>
</div>

                           {/* GRADIENTE INFERIOR */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/55 via-black/20 to-transparent z-[1150]" />

             {/* BOTTOM SHEET PRO */}
<div className="absolute inset-x-0 bottom-0 z-[1300] px-3 pb-3">
  <motion.div
    initial={{ y: 360, opacity: 0 }}
    animate={{ y: sheetSnapMeta.y, opacity: 1, height: sheetSnapMeta.height }}
    exit={{ y: 320, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    drag="y"
    dragConstraints={{ top: 0, bottom: 0 }}
    dragElastic={0.08}
    onDragEnd={(e, info) => {
      const y = info.offset.y;

      if (y > 120) {
        setSheetSnap('mini');
        return;
      }

      if (y < -120) {
        setSheetSnap('full');
        return;
      }

      setSheetSnap('mid');
    }}
    className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/72 shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl"
    style={{
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.74) 100%)',
    }}
  >
    <div className="relative shrink-0 px-4 pt-3 pb-2">
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-gray-300/90" />

      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md" />
          <img
  src={
    clientProfile?.avatar_url ||
    selectedJob?.client?.avatar_url ||
    '/avatar-fallback.png'
  }
            alt={selectedJob?.client?.full_name || 'Cliente'}
            className="relative h-14 w-14 rounded-full border-2 border-emerald-200 object-cover shadow-[0_10px_24px_rgba(16,185,129,0.18)]"
          />
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-extrabold tracking-tight text-gray-900">
            {selectedJob?.client?.full_name || 'Cliente'}
          </div>
          <div className="mt-0.5 text-[12px] font-medium text-gray-500">
            {selectedJob?.service_type || 'Servicio general'}
          </div>

          <div className="mt-2 flex items-center gap-2">
            {selectedJob?.status === 'scheduled' ? (
  <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
    Agendamiento activo
  </span>
) : (
  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
    Servicio activo
  </span>
)}

            <span className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-gray-600 backdrop-blur">
              Vista interna
            </span>
          </div>
        </div>

        <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/90 px-3 py-2 text-right shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
            Tarifa
          </div>
          <div className="text-[15px] font-extrabold text-gray-900">
            {selectedJob?.price
              ? `â‚²${Number(selectedJob.price).toLocaleString('es-PY')}/h`
              : 'A definir'}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setSheetSnap('mini')}
          className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
            sheetSnap === 'mini'
              ? 'bg-gray-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)]'
              : 'border border-gray-200 bg-white/75 text-gray-600'
          }`}
        >
          Mini
        </button>

        <button
          onClick={() => setSheetSnap('mid')}
          className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
            sheetSnap === 'mid'
              ? 'bg-emerald-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.24)]'
              : 'border border-gray-200 bg-white/75 text-gray-600'
          }`}
        >
          Medio
        </button>

        <button
          onClick={() => setSheetSnap('full')}
          className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
            sheetSnap === 'full'
              ? 'bg-cyan-600 text-white shadow-[0_10px_24px_rgba(6,182,212,0.24)]'
              : 'border border-gray-200 bg-white/75 text-gray-600'
          }`}
        >
          Full
        </button>
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-white/60 bg-white/62 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Estado
          </div>
          <div className="mt-1 text-sm font-extrabold text-gray-800">
  {selectedJob?.status === 'scheduled' ? 'Consulta agendada' : 'Conversación activa'}
</div>
        </div>

        <div className="rounded-[22px] border border-white/60 bg-white/62 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Vista
          </div>
          <div className="mt-1 text-sm font-extrabold text-gray-800">
            Interna de ManosYA
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[24px] border border-white/60 bg-white/60 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Cliente
            </div>
            <div className="mt-1 text-sm font-extrabold text-gray-800">
              {clientProfile?.full_name ||
  selectedJob?.client?.full_name ||
  'Cliente'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Tipo
            </div>
            <div className="mt-1 text-sm font-extrabold text-gray-800">
              {selectedJob?.service_type || 'General'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          onClick={() => setSheetSnap(sheetSnap === 'full' ? 'mid' : 'full')}
          className="w-full rounded-[22px] bg-gradient-to-r from-slate-900 via-emerald-700 to-cyan-500 py-3.5 text-white font-extrabold shadow-[0_18px_40px_rgba(16,185,129,0.22)] transition hover:scale-[1.01] active:scale-[0.99]"
        >
          {sheetSnap === 'full' ? 'Vista compacta' : 'Ver detalles'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setPreviewMapOpen(false);
              if (selectedJob) openChat(selectedJob);
            }}
            className="group relative w-full rounded-[22px] border border-white/60 bg-white/78 py-3 text-gray-800 font-bold shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="relative">
                <MessageCircle
                  size={18}
                  className="text-gray-700 transition-colors group-hover:text-emerald-700"
                />

                {hasUnread && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-[0_8px_18px_rgba(239,68,68,0.35)] ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <span>Chat</span>
            </div>
          </button>

         <button
  onClick={() => {
    setPreviewMapOpen(false);
    setPreviewTarget(null);
    setPreviewRoute(null);
  }}
  className="w-full rounded-[22px] border border-white/60 bg-white/78 py-3 text-gray-700 font-bold shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
>
  Cerrar
</button>
        </div>
      </div>

      {sheetSnap === 'full' && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          className="mt-4 space-y-3"
        >
          <div className="rounded-[24px] border border-white/60 bg-white/62 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Resumen del servicio
            </div>
            <div className="mt-2 text-[15px] font-bold text-gray-900">
              {selectedJob?.description || 'Solicitud generada desde ManosYA.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-white/60 bg-white/62 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Modalidad
              </div>
              <div className="mt-1 text-sm font-extrabold text-gray-800">
  {selectedJob?.status === 'scheduled' ? 'Consulta agendada' : 'Chat directo'}
</div>
            </div>

            <div className="rounded-[22px] border border-white/60 bg-white/62 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Sistema
              </div>
              <div className="mt-1 text-sm font-extrabold text-gray-800">
                ManosYA Live
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  </motion.div>
</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* NAVBAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-screen-md mx-auto px-4 pb-3">
          <div className="rounded-[28px] border border-gray-200 bg-white/95 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.10)] px-3 py-2 flex justify-around">
            <button className="flex flex-col items-center text-emerald-600 min-w-[70px] py-2">
              <Home size={18} />
              <span className="text-[11px] font-bold mt-1">Trabajos</span>
            </button>

                        <button
              onClick={async () => {
                setHasUnread(false);
                setUnreadCount(0);

                if (!selectedJob) {
                  const activeJob =
  jobs.find((j) => j.status === 'accepted' || j.status === 'assigned') ||
  jobs.find((j) => j.status === 'scheduled') ||
  jobs[0];
                  if (activeJob) {
                    await openChat(activeJob);
                  } else {
                    toast.info('No tenÃ©s chats activos actualmente');
                  }
                } else {
                  setIsChatOpen(true);
                }
              }}
              className="relative flex flex-col items-center text-gray-500 min-w-[70px] py-2"
            >
              <MessageCircle size={18} />

              {unreadCount > 0 && (
                <span className="absolute -top-0.5 right-3 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              <span className="text-[11px] font-bold mt-1">Chats</span>
            </button>

            <button
  onClick={() => router.push('/worker/onboard')}
  className="flex flex-col items-center text-gray-500 min-w-[70px] py-2"
>
  <User2 size={18} />
  <span className="text-[11px] font-bold mt-1">Perfil</span>
</button>
          </div>
        </div>
      </div>

            {/* ZONAS ACTIVAS LIVIANAS */}
      <AnimatePresence>
        {mapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 18 }}
              className="w-full max-w-md overflow-hidden rounded-t-[32px] bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.20)]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <h3 className="font-extrabold text-gray-800">Zonas activas</h3>
                  <p className="text-xs font-semibold text-gray-500">
                    Vista liviana sin cargar mapa
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMapOpen(false)}
                  className="text-gray-600 hover:text-red-500"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4">
                <div className="grid gap-2">
                  {HOTSPOTS.slice(0, 16).map((zone) => (
                    <button
                      key={zone.name}
                      type="button"
                      onClick={() => {
                        const mapUrl = safeExternalUrl(
                          `https://www.google.com/maps/search/?api=1&query=${zone.lat},${zone.lng}`,
                          { allowedHosts: ['google.com', 'www.google.com'] }
                        );

                        if (mapUrl) {
                          window.open(mapUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="flex items-center justify-between rounded-[22px] border border-[#d6f4f1] bg-[#effffb] px-4 py-3 text-left active:scale-[0.98]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-black text-slate-900">
                          {zone.name}
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#0c6b70]">
                          Intensidad {zone.intensity}/10
                        </div>
                      </div>

                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18b8aa] text-white">
                        <MapPin size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    
    </motion.div>
  );
}

/* =========================
   UI MINI COMPONENTS
========================= */

function StatCard({ label, value, tone = 'gray' }) {
  const toneMap = {
    emerald: 'border-emerald-100 bg-white text-emerald-700',
    cyan: 'border-cyan-100 bg-white text-cyan-700',
    gray: 'border-gray-200 bg-white text-gray-700',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-700">{value}</div>
    </div>
  );
}

/* =========================
   BOT 360
========================= */

function Bot360({ stats = {}, workerStatus = 'available' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [mode, setMode] = useState('motivador');
  const [showParty, setShowParty] = useState(false);

  const memoryRef = useRef({
    greeted: false,
    lastTopic: null,
    motivationCount: 0,
    lastSummary: null,
  });

  const COLORS = {
    motivador: 'from-emerald-500 to-cyan-400',
    analitico: 'from-sky-500 to-blue-600',
    zen: 'from-lime-400 to-emerald-500',
    humoristico: 'from-pink-400 to-rose-600',
  };

  const MESSAGES = {
    motivador: [
      'ðŸ’ª Che raâ€™a, cada dÃ­a que salÃ­s a laburar, estÃ¡s construyendo tu propio futuro.',
      'ðŸ”¥ Ã‘andejÃ¡ra bendice al que trabaja con el corazÃ³n. Â¡Vos estÃ¡s dejando huella!',
      'ðŸŒž Aunque no te digan, tu esfuerzo se nota. Rodolfo te ve, y te aplaude desde su teclado ðŸ¾.',
      'ðŸ¾ No aflojÃ©s, que la suerte llega a los que no se rinden.',
      'ðŸ’š No hay trabajo chico cuando se hace con ganas. Vos sos grande.',
    ],
    humoristico: [
      'ðŸ˜¹ Si trabajar fuera delito, ya tendrÃ­as cadena perpetua con tererÃ© libre.',
      'ðŸ™€ Con ese ritmo te contrata ItaipÃº directo.',
      'ðŸ˜¼ â€œModo leyendaâ€ activado: Â¡rendimiento nivel guaranÃ­ power! ðŸ’¥',
      'ðŸ¾ Rodolfo vio tus nÃºmeros y dijo: â€œha upÃ©icha mismo, mi hÃ©roe del esfuerzoâ€.',
    ],
    consejos: [
      'ðŸ§  Consejo del dÃ­a: saludÃ¡ siempre con una sonrisa, eso vale mÃ¡s que mil currÃ­culums.',
      'ðŸŒ± No corras, che amigo, lo importante es avanzar constante.',
      'ðŸ’¬ EscuchÃ¡ bien al cliente, y tratale como te gustarÃ­a que te traten.',
      'ðŸš€ Mantenete visible, respondÃ© rÃ¡pido, y los pedidos van a venir solitos.',
      'ðŸ’¡ RecordÃ¡: el descanso tambiÃ©n es parte del trabajo.',
    ],
  };

  useEffect(() => {
    let newMode = 'motivador';
    const hour = new Date().getHours();

    if (workerStatus === 'busy') newMode = 'analitico';
    else if (workerStatus === 'paused') newMode = 'zen';
    else if (hour >= 19) newMode = 'zen';
    else if (stats?.jobsCompleted > 20) newMode = 'humoristico';
    else if (stats?.jobsCompleted > 10) newMode = 'analitico';

    setMode(newMode);
  }, [workerStatus, stats]);

  useEffect(() => {
    if (stats?.jobsCompleted && stats.jobsCompleted % 10 === 0 && stats.jobsCompleted > 0) {
      setShowParty(true);
      simulateBotTyping(
        `ðŸŽ‰ Â¡Epa che! Ya hiciste ${stats.jobsCompleted} trabajos. Rodolfo estÃ¡ bailando polka en tu honor ðŸ’ƒðŸ¾`
      );
      const timer = setTimeout(() => setShowParty(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [stats.jobsCompleted]);

  function simulateBotTyping(text, delay = 1000) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'bot', text }]);
    }, delay);
  }

  const hasWelcomedRef = useRef(false);
  useEffect(() => {
    if (hasWelcomedRef.current) return;
    hasWelcomedRef.current = true;

    const hour = new Date().getHours();
    let saludo = '';
    let cierre = '';
    let extra = '';

    if (hour < 12) {
      saludo = 'â˜€ï¸ Buen dÃ­a, compa. A empezar con el mate y buena energÃ­a.';
      cierre = 'Hoy es un buen dÃ­a para avanzar ðŸ’ª';
    } else if (hour < 18) {
      saludo = 'ðŸ§‰ Buenas tardes, che. Con tererÃ© en mano seguimos firmes.';
      cierre = 'Cada trabajo te acerca mÃ¡s a tus metas ðŸ’š';
    } else {
      saludo = 'ðŸŒ™ Buenas noches, trabajador/a del alma.';
      cierre = 'DescansÃ¡ bien, maÃ±ana seguimos con todo ðŸŒ¿';
    }

    if (workerStatus === 'available') saludo += ' EstÃ¡s disponible, listo/a para ayudar y ganar.';
    else if (workerStatus === 'busy') saludo += ' EstÃ¡s ocupado, pero Rodolfo te acompaÃ±a.';
    else if (workerStatus === 'paused') saludo += ' EstÃ¡s en pausa, tomÃ¡ un respiro y recargÃ¡ energÃ­a.';

    const jobs = stats?.jobsCompleted || 0;
    if (jobs === 0) extra = 'ðŸŒ± TodavÃ­a no arrancaste, pero cada conexiÃ³n ya es un paso adelante.';
    else if (jobs < 5) extra = `ðŸ’ª Ya completaste ${jobs} trabajo${jobs > 1 ? 's' : ''}. Buen comienzo.`;
    else if (jobs < 15) extra = `ðŸ”¥ LlevÃ¡s ${jobs} trabajos hechos, se nota el compromiso.`;
    else if (jobs < 30) extra = `ðŸš€ ${jobs} trabajos completados. EstÃ¡s dejando huella, che.`;
    else extra = `ðŸ† ${jobs} trabajosâ€¦ Â¡una mÃ¡quina total!`;

    simulateBotTyping(saludo, 600);
    setTimeout(() => simulateBotTyping(extra, 1400), 1000);
    setTimeout(() => simulateBotTyping(cierre, 2000), 1600);

    setTimeout(() => {
      simulateBotTyping(`ðŸ“‹ PodÃ©s decirme:
â€¢ "Â¿CuÃ¡ntos trabajos hice?"
â€¢ "Â¿CÃ³mo voy?"
â€¢ "Mi Ãºltimo trabajo"
â€¢ "CuÃ¡nto ganÃ©"
â€¢ "Necesito motivaciÃ³n"
â€¢ "Dame un consejo"`);
    }, 3200);
  }, [workerStatus, stats]);

  function handleInput() {
    if (!input.trim()) return;
    const q = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    setMessages((m) => [...m, { from: 'user', text: input }]);
    setInput('');
    memoryRef.current.lastTopic = q;

    if (q.includes('hola') || q.includes('buenas') || q.includes('rodolfo')) {
      simulateBotTyping('ðŸ˜¸ Â¡Hola che! Rodolfo al servicio. Listo para darte empuje y Ã¡nimo ðŸ’ª.');
      return;
    }

    if (q.includes('trabajo') && (q.includes('cuanto') || q.includes('hice') || q.includes('complet'))) {
      const total = stats?.jobsCompleted || 0;
      const msg =
        total === 0
          ? 'ðŸ˜º TodavÃ­a sin trabajos completados, pero tranquilo, que el primero llega.'
          : `ðŸ“‹ LlevÃ¡s ${total} trabajo${total !== 1 ? 's' : ''} completado${total !== 1 ? 's' : ''}.`;
      simulateBotTyping(msg);
      return;
    }

    if (q.includes('como voy') || q.includes('rendimiento') || q.includes('eficiencia')) {
      const eff = ((stats?.efficiency || 0) * 100).toFixed(1);
      let msg = `ðŸ“Š Tu eficiencia actual es del ${eff}%. `;
      if (eff > 85) msg += 'ðŸ”¥ Excelente nivel.';
      else if (eff > 50) msg += 'ðŸ’ª Buen ritmo.';
      else msg += 'ðŸŒ± Vamos de a poco.';
      simulateBotTyping(msg);
      return;
    }

    if (q.includes('gane') || q.includes('ganancia') || q.includes('plata') || q.includes('dinero')) {
      const earn = stats?.earnings || 0;
      simulateBotTyping(`ðŸ’° Hasta ahora juntaste â‚²${earn.toLocaleString('es-PY')}.`);
      return;
    }

    if (q.includes('motivacion') || q.includes('frase') || q.includes('animo')) {
      const frases = [...MESSAGES.motivador, ...MESSAGES.humoristico];
      const frase = frases[Math.floor(Math.random() * frases.length)];
      simulateBotTyping(frase);
      return;
    }

    if (q.includes('consejo') || q.includes('mejorar')) {
      const consejo = MESSAGES.consejos[Math.floor(Math.random() * MESSAGES.consejos.length)];
      simulateBotTyping(consejo);
      return;
    }

    const fallback = [
      'ðŸ¾ No entendÃ­ del todo, pero sÃ© que sos un luchador nato.',
      'ðŸ’š A veces no hay que hablar mucho, solo seguir metiÃ©ndole ganas.',
      'ðŸ˜¸ Si querÃ©s ver tu resumen, escribÃ­ "mi rendimiento" o "progreso".',
    ];

    simulateBotTyping(fallback[Math.floor(Math.random() * fallback.length)]);
  }

  useEffect(() => {
    try {
      if (!open) return;
      if (!stats || typeof stats !== 'object') return;
      if (!memoryRef.current) return;

      const alreadyShown = memoryRef.current.lastSummary;
      if ((stats.jobsCompleted || 0) > 0 && !alreadyShown) {
        const eff = (((stats.efficiency || 0) * 100) || 0).toFixed(1);
        const earn = stats.earnings || 0;

        simulateBotTyping(
          `ðŸ“Š Resumen rÃ¡pido:
â€¢ Completados: ${stats.jobsCompleted || 0}
â€¢ Eficiencia: ${eff}%
â€¢ Ganancias: â‚²${Number(earn).toLocaleString('es-PY')}
ðŸ¾ Seguimos metiendo garra, compa ðŸ’ª`
        );

        memoryRef.current.lastSummary = new Date().toISOString();
      }
    } catch (err) {
      console.warn('Error en mini analizador:', err);
    }
  }, [open, stats]);

 
}

