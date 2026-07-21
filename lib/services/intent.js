"use client";

import { getServiceLabel, normalizeService } from "./catalog";

export const SERVICE_INTENT_KEY = "manosya_service_intent";

export function buildServiceIntent({ role = "client", serviceSlug = "", urgency = "normal", text = "", source = "auth" } = {}) {
  const normalizedService = normalizeService(serviceSlug);

  return {
    role,
    serviceSlug: normalizedService || "",
    serviceName: normalizedService ? getServiceLabel(normalizedService) : "",
    urgency: urgency || "normal",
    text: String(text || "").trim(),
    source,
    savedAt: new Date().toISOString(),
  };
}

export function saveServiceIntent(intent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SERVICE_INTENT_KEY, JSON.stringify(intent));
  } catch {}
}

export function readServiceIntent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SERVICE_INTENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearServiceIntent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SERVICE_INTENT_KEY);
  } catch {}
}

export function intentToQuery(intent) {
  const params = new URLSearchParams();
  if (intent?.serviceSlug) params.set("service", intent.serviceSlug);
  if (intent?.urgency) params.set("urgency", intent.urgency);
  if (intent?.text) params.set("intent", intent.text);
  return params.toString();
}

export function readIntentFromSearchParams(searchParams) {
  const getValue = (key) => {
    if (!searchParams) return "";
    if (typeof searchParams.get === "function") return searchParams.get(key) || "";
    return searchParams[key] || "";
  };

  const serviceSlug = normalizeService(getValue("service"));
  const text = getValue("intent");
  const urgency = getValue("urgency") || "normal";

  if (!serviceSlug && !text) return null;
  return buildServiceIntent({ serviceSlug, text, urgency, source: "url" });
}
