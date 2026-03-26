"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  PenTool,
  FileSignature,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Download,
  Smartphone,
  SlidersHorizontal,
  Lock,
  Sparkles,
  Maximize2,
  Minimize2,
  Zap,
  Cpu,
  Save,
  Share2,
} from "lucide-react";

function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );

  useEffect(() => {
    const onResize = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return dpr;
}

function dataURLToFile(dataUrl, filename = "firma-manosya.png") {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

function SignaturePad({ onExport }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [isSigning, setIsSigning] = useState(false);
  const [lineWidth, setLineWidth] = useState(2.2);
  const [smoothing, setSmoothing] = useState(0.72);
  const [ink, setInk] = useState("#13e7c7");
  const dpr = useDevicePixelRatio();

  const activeStroke = useRef([]);
  const lastMidPoint = useRef(null);
  const activePointerId = useRef(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));

    const previous = canvas.toDataURL("image/png");

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (history.length > 0 || previous !== "data:,") {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = previous;
    }
  }, [dpr, history.length]);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  };

  const getPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure && event.pressure > 0 ? event.pressure : 0.5,
    };
  };

  const midPoint = (a, b) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const drawSegment = (p1, p2, p3) => {
    const ctx = getCtx();
    if (!ctx) return;

    const velocityWeight = Math.max(0.2, Math.min(1, smoothing));
    const pressureWidth = lineWidth + (p2.pressure || 0.5) * lineWidth * 0.9;

    ctx.strokeStyle = ink;
    ctx.shadowColor = `${ink}55`;
    ctx.shadowBlur = 12;
    ctx.lineWidth =
      pressureWidth * velocityWeight + lineWidth * (1 - velocityWeight);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();
  };

  const commitSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshot = canvas.toDataURL("image/png");
    setHistory((prev) => [...prev, snapshot]);
    onExport?.(snapshot);
  };

  const handlePointerDown = (event) => {
    if (!canvasRef.current) return;
    if (!event.isPrimary) return;

    activePointerId.current = event.pointerId;

    const point = getPoint(event);
    activeStroke.current = [point];
    lastMidPoint.current = point;
    setIsSigning(true);
    canvasRef.current.setPointerCapture?.(event.pointerId);

    const ctx = getCtx();
    if (ctx) {
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.shadowColor = `${ink}55`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(1.2, lineWidth * 0.52), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (event) => {
    if (!isSigning || activePointerId.current !== event.pointerId) return;

    const points = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];

    for (const ev of points) {
      const point = getPoint(ev);
      activeStroke.current.push(point);
      const pts = activeStroke.current;

      if (pts.length === 2) {
        const m = midPoint(pts[0], pts[1]);
        drawSegment(pts[0], pts[0], m);
        lastMidPoint.current = m;
      } else if (pts.length > 2) {
        const prev = pts[pts.length - 2];
        const current = pts[pts.length - 1];
        const currentMid = midPoint(prev, current);
        drawSegment(lastMidPoint.current || prev, prev, currentMid);
        lastMidPoint.current = currentMid;
      }
    }
  };

  const finishStroke = (event) => {
    if (!isSigning || activePointerId.current !== event.pointerId) return;

    setIsSigning(false);
    activePointerId.current = null;
    lastMidPoint.current = null;

    if (activeStroke.current.length) {
      commitSnapshot();
    }

    activeStroke.current = [];
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!ctx || !canvas) return;

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    setHistory([]);
    onExport?.(null);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const next = history.slice(0, -1);
    setHistory(next);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    const previous = next[next.length - 1];
    if (previous) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = previous;
      onExport?.(previous);
    } else {
      onExport?.(null);
    }
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            <PenTool className="h-3.5 w-3.5" />
            Firma táctil inteligente
          </div>
          <h3 className="mt-3 text-xl font-black text-white">
            Área de firma ultra sensible
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
            Deshacer
          </button>

          <button
            type="button"
            onClick={clearPad}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative h-[280px] overflow-hidden rounded-[24px] border border-emerald-400/15 bg-[#07110d] md:h-[360px]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,255,210,0.08),transparent_22%),linear-gradient(180deg,rgba(8,20,15,0.88),rgba(6,12,10,0.98))]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:24px_24px]" />

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className="absolute inset-0 h-full w-full touch-none"
        />

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-medium text-white/50 backdrop-blur-md">
          Firmá con dedo o lápiz
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            <SlidersHorizontal className="h-4 w-4" />
            Grosor
          </div>
          <input
            type="range"
            min="1"
            max="6"
            step="0.1"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-2 text-sm text-white/75">{lineWidth.toFixed(1)} px</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            <Sparkles className="h-4 w-4" />
            Suavizado
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.01"
            value={smoothing}
            onChange={(e) => setSmoothing(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-2 text-sm text-white/75">
            {Math.round(smoothing * 100)}%
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            <Cpu className="h-4 w-4" />
            Tinta
          </div>
          <div className="flex gap-2">
            {["#13e7c7", "#ffffff", "#f0e86e", "#5fd26d"].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setInk(color)}
                className="h-10 w-10 rounded-full border border-white/10"
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FirmaElectronicaManosyaGestion360() {
  const [signature, setSignature] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [signer, setSigner] = useState({
    fullName: "",
    document: "",
    phone: "",
    role: "Cliente",
    documentTitle: "Acuerdo de servicio ManosYA · Gestión 360",
  });

  const score = useMemo(() => {
    let points = 0;
    if (signer.fullName.trim()) points += 25;
    if (signer.document.trim()) points += 25;
    if (signer.phone.trim()) points += 20;
    if (signature) points += 30;
    return points;
  }, [signer, signature]);

  const statCards = [
    { icon: FileSignature, label: "Estado", value: signature ? "Firmado" : "Pendiente" },
    { icon: Smartphone, label: "Modo", value: "Touch First" },
    { icon: ShieldCheck, label: "Seguridad", value: "Alta" },
    { icon: Zap, label: "Sensibilidad", value: "Premium" },
  ];

  const handleDownloadSignature = () => {
    if (!signature) {
      alert("Primero capturá una firma.");
      return;
    }

    const link = document.createElement("a");
    link.href = signature;
    link.download = `firma-${(signer.fullName || "sin-nombre")
      .toLowerCase()
      .replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSignature = () => {
    if (!signer.fullName.trim()) {
      alert("Completá el nombre del firmante.");
      return;
    }

    if (!signature) {
      alert("Primero capturá una firma.");
      return;
    }

    const payload = {
      id: Date.now(),
      fullName: signer.fullName,
      document: signer.document,
      phone: signer.phone,
      role: signer.role,
      documentTitle: signer.documentTitle,
      signature,
      createdAt: new Date().toISOString(),
    };

    const previous =
      JSON.parse(localStorage.getItem("manosya_firmas_guardadas") || "[]") || [];

    localStorage.setItem(
      "manosya_firmas_guardadas",
      JSON.stringify([payload, ...previous])
    );

    setSavedMessage("Firma guardada correctamente");
    setTimeout(() => setSavedMessage(""), 2500);
  };

  const handleShareWhatsApp = async () => {
    if (!signer.fullName.trim()) {
      alert("Completá el nombre del firmante.");
      return;
    }

    if (!signature) {
      alert("Primero capturá una firma.");
      return;
    }

    const text = `Firma ManosYA / Gestión 360
Firmante: ${signer.fullName}
Documento: ${signer.document || "-"}
Teléfono: ${signer.phone || "-"}
Rol: ${signer.role}
Documento: ${signer.documentTitle}`;

    try {
      const file = dataURLToFile(
        signature,
        `firma-${(signer.fullName || "firmante").replace(/\s+/g, "-")}.png`
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Firma ManosYA",
          text,
          files: [file],
        });
        return;
      }

      handleDownloadSignature();
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          text + "\n\nLa firma fue descargada en el dispositivo."
        )}`,
        "_blank"
      );
    } catch (error) {
      console.error(error);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#06110D] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,255,210,0.10),transparent_24%),radial-gradient(circle_at_right,rgba(86,255,140,0.08),transparent_24%),linear-gradient(180deg,#06110D_0%,#07150F_42%,#04100B_100%)]" />
        <div className="absolute left-[-8%] top-[-5%] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl md:h-96 md:w-96" />
        <div className="absolute right-[-12%] top-[10%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-3xl md:h-[32rem] md:w-[32rem]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-5 md:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl md:p-6"
        >
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  ManosYA Signature Engine
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                  <Lock className="h-3.5 w-3.5" />
                  Gestión 360 Secure Flow
                </div>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-white md:text-5xl xl:text-6xl">
                Firma electrónica táctil,
                <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
                  {" "}más fluida y clara
                </span>
                {" "}para ManosYA y Gestión 360
              </h1>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/12">
                        <Icon className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="text-sm text-white/50">{item.label}</div>
                      <div className="mt-1 text-lg font-black text-white">
                        {item.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    Checklist inteligente
                  </div>
                  <div className="mt-1 text-xl font-black text-white">
                    Preparación de firma
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-200">
                  {score}%
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { ok: !!signer.fullName.trim(), text: "Nombre del firmante" },
                  { ok: !!signer.document.trim(), text: "Documento de identidad" },
                  { ok: !!signer.phone.trim(), text: "Teléfono o contacto" },
                  { ok: !!signature, text: "Firma capturada" },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="text-sm text-white/85">{item.text}</div>
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        item.ok ? "text-emerald-300" : "text-white/30"
                      }`}
                    />
                  </div>
                ))}
              </div>

              {savedMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                  {savedMessage}
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                  Datos del firmante
                </div>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Panel inteligente
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">
                Touch-ready
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["Nombre completo", "fullName", "Ej. María González"],
                ["Documento", "document", "Ej. 1234567"],
                ["Teléfono", "phone", "Ej. +595 ..."],
                ["Título del documento", "documentTitle", "Acuerdo de servicio"],
              ].map(([label, key, placeholder]) => (
                <label key={key} className="block">
                  <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/42">
                    {label}
                  </div>
                  <input
                    value={signer[key]}
                    onChange={(e) =>
                      setSigner((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/35"
                  />
                </label>
              ))}

              <label className="block">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/42">
                  Rol
                </div>
                <select
                  value={signer.role}
                  onChange={(e) =>
                    setSigner((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/35"
                >
                  <option className="text-black">Cliente</option>
                  <option className="text-black">Trabajador</option>
                  <option className="text-black">Supervisor</option>
                  <option className="text-black">Gestión 360</option>
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                <ShieldCheck className="h-4 w-4" />
                Resumen
              </div>
              <p className="text-sm leading-6 text-white/62">
                Nombre, documento, teléfono, rol y firma se guardan en el navegador.
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                  Documento y firma
                </div>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Experiencia táctil premium
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Maximize2 className="h-4 w-4" />
                Pantalla completa
              </button>
            </div>

            <div className="mb-4 rounded-[26px] border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">
                    {signer.documentTitle}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Firmante: {signer.fullName || "Sin completar"} · Rol: {signer.role}
                  </div>
                </div>

                <div className="rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                  Preparado para firma
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 text-sm leading-7 text-white/70">
                <p>
                  Yo,{" "}
                  <span className="font-semibold text-white">
                    {signer.fullName || "[Nombre del firmante]"}
                  </span>
                  , con documento{" "}
                  <span className="font-semibold text-white">
                    {signer.document || "[Documento]"}
                  </span>
                  , acepto los términos operativos del servicio y autorizo el
                  registro de esta firma electrónica para el proceso correspondiente
                  de ManosYA / Gestión 360.
                </p>
              </div>
            </div>

            <SignaturePad onExport={setSignature} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-white/55">
                Estado actual:{" "}
                <span className="font-bold text-white">
                  {signature ? "Firma capturada" : "Pendiente de firma"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSignature}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  Exportar PNG
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15"
                >
                  <Share2 className="h-4 w-4" />
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleSaveSignature}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(20,184,166,0.24)] transition hover:brightness-110"
                >
                  <Save className="h-4 w-4" />
                  Finalizar firma
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#05100C]/95 p-3 backdrop-blur-xl md:p-5"
          >
            <div className="mx-auto flex h-full w-full max-w-7xl flex-col rounded-[32px] border border-white/10 bg-black/20 p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    Modo inmersivo
                  </div>
                  <div className="mt-1 text-2xl font-black text-white">
                    Firma en pantalla completa
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Minimize2 className="h-4 w-4" />
                  Cerrar
                </button>
              </div>

              <div className="grid flex-1 gap-5 xl:grid-cols-[0.7fr_1.3fr]">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 text-lg font-black text-white">Resumen</div>

                  <div className="space-y-3 text-sm text-white/70">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                        Firmante
                      </div>
                      <div className="mt-1 font-semibold text-white">
                        {signer.fullName || "Sin completar"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                        Documento
                      </div>
                      <div className="mt-1 font-semibold text-white">
                        {signer.document || "Sin completar"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                        Título
                      </div>
                      <div className="mt-1 font-semibold text-white">
                        {signer.documentTitle}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-white/75">
                      Listo para guardar, exportar o compartir.
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <SignaturePad onExport={setSignature} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}