"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Loader2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";

const ASUNCION = { lat: -25.2867, lng: -57.3333 };
let mapsPromise;

const audienceCopy = {
  client: {
    kicker: "Resolver cerca",
    title: "Mapa ManosYA",
    subtitle: "Trabajadores y comercios listos para ayudarte.",
    placeholder: "Electricista, plomero, cables...",
    saveAction: "",
    saved: "",
    sheetLabel: "Elegido cerca",
    emptyTitle: "Busca por oficio o insumo",
    emptyText: "ManosYA ordena lo mas util primero.",
  },
  worker: {
    kicker: "Zona activa",
    title: "Mapa ManosYA",
    subtitle: "Clientes, comercios y colegas cerca de tu zona.",
    placeholder: "Materiales, obras, fletes...",
    saveAction: "Marcar mi zona",
    saved: "Listo. Tu zona quedo actualizada.",
    sheetLabel: "Conexion cerca",
    emptyTitle: "Explora tu zona",
    emptyText: "Marca donde estas para aparecer mejor.",
  },
  supplier: {
    kicker: "Local digital",
    title: "Mapa ManosYA",
    subtitle: "Tu tienda aparece donde la gente busca soluciones.",
    placeholder: "Cables, pintura, herramientas...",
    saveAction: "Fijar mi local",
    saved: "Listo. Tu local quedo visible en el mapa.",
    sheetLabel: "Oportunidad cerca",
    emptyTitle: "Muestra tu local",
    emptyText: "Fija tu direccion para vender mejor.",
  },
};

const filterOptions = [
  { id: "all", label: "Todo" },
  { id: "worker", label: "Trabajadores" },
  { id: "supplier", label: "Comercios" },
];

export default function ClientMapScreen({ audience = "client" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapApiRef = useRef(null);
  const overlaysRef = useRef([]);
  const routeLineRef = useRef(null);
  const liveMarkerRef = useRef(null);
  const routePathRef = useRef([]);
  const [places, setPlaces] = useState([]);
  const [center, setCenter] = useState(ASUNCION);
  const [selected, setSelected] = useState(null);
  const [trackingPlace, setTrackingPlace] = useState(null);
  const [routeProgress, setRouteProgress] = useState(0.08);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const copy = audienceCopy[audience] || audienceCopy.client;
  const canSaveLocation = audience === "worker" || audience === "supplier";
  const trackingCopy = trackingPlace ? liveRouteCopy(audience, trackingPlace) : null;
  const canTrackSelected = selected ? canTrackPlace(audience, selected) : false;

  const visiblePlaces = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const filtered = places.filter((place) => {
      const matchesType = filter === "all" || place.type === filter;
      const matchesSearch = !normalizedQuery || normalizeText(searchableText(place)).includes(normalizedQuery);
      return matchesType && matchesSearch;
    });

    return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filter, places, query]);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      setLoading(true);
      const position = await getBrowserPosition();
      const nextCenter = position || ASUNCION;
      if (!alive) return;
      setCenter(nextCenter);

      try {
        const params = new URLSearchParams({
          lat: String(nextCenter.lat),
          lng: String(nextCenter.lng),
          audience,
        });
        const response = await fetch(`/api/map/places?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!alive) return;
        const nextPlaces = Array.isArray(payload.places) ? payload.places : [];
        setPlaces(nextPlaces);
        setSelected(nextPlaces[0] || null);
      } catch {
        if (alive) setError("No se pudo cargar el ecosistema.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      alive = false;
    };
  }, [audience]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let alive = true;
    loadGoogleMaps(apiKey)
      .then((mapsApi) => {
        if (!alive || !mapRef.current) return;
        mapApiRef.current = mapsApi;
        mapInstanceRef.current = new mapsApi.Map(mapRef.current, {
          center: ASUNCION,
          zoom: 13,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: mapStyle,
        });
        setMapReady(true);
      })
      .catch((loadError) => setError(loadError.message || "Google Maps no pudo cargar."));

    return () => {
      alive = false;
    };
  }, [apiKey]);

  useEffect(() => {
    setSelected((current) => {
      if (!visiblePlaces.length) return null;
      if (current && visiblePlaces.some((place) => place.id === current.id)) return current;
      return visiblePlaces[0];
    });
  }, [visiblePlaces]);

  useEffect(() => {
    const mapsApi = mapApiRef.current;
    const map = mapInstanceRef.current;
    if (!mapsApi || !map || !mapReady) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const bounds = new mapsApi.LatLngBounds();
    bounds.extend(center);

    const userMarker = createAvatarOverlay(mapsApi, {
      map,
      position: center,
      place: { type: "client", name: "Vos", avatarUrl: "" },
      active: false,
      onClick: () => setSelected(null),
    });
    overlaysRef.current.push(userMarker);

    visiblePlaces.forEach((place) => {
      const overlay = createAvatarOverlay(mapsApi, {
        map,
        position: { lat: place.lat, lng: place.lng },
        place,
        active: selected?.id === place.id,
        onClick: () => selectPlace(place),
      });
      overlaysRef.current.push(overlay);
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    if (trackingPlace) return;
    if (visiblePlaces.length) map.fitBounds(bounds, 76);
    else map.setCenter(center);
  }, [center, mapReady, selected?.id, trackingPlace, visiblePlaces]);

  useEffect(() => {
    if (!trackingPlace) return undefined;
    const timer = window.setInterval(() => {
      setRouteProgress((current) => (current >= 0.96 ? 0.08 : Math.min(0.96, current + 0.025)));
    }, 900);

    return () => window.clearInterval(timer);
  }, [trackingPlace]);

  useEffect(() => {
    const mapsApi = mapApiRef.current;
    const map = mapInstanceRef.current;
    if (!mapsApi || !map || !mapReady) return undefined;

    routeLineRef.current?.setMap(null);
    liveMarkerRef.current?.setMap(null);
    routeLineRef.current = null;
    liveMarkerRef.current = null;
    routePathRef.current = [];

    if (!trackingPlace) return undefined;

    const routePath = routePathForAudience(audience, center, trackingPlace);
    routePathRef.current = routePath;

    const line = mapsApi.Polyline
      ? new mapsApi.Polyline({
          path: routePath,
          geodesic: true,
          clickable: false,
          strokeColor: "#050505",
          strokeOpacity: 0.7,
          strokeWeight: 5,
          zIndex: 4,
        })
      : null;

    if (line) {
      line.setMap(map);
      routeLineRef.current = line;
    }

    const startPosition = pointAlongPath(routePath, 0.08);
    const liveMarker = createAvatarOverlay(mapsApi, {
      map,
      position: startPosition,
      place: {
        ...trackingPlace,
        routeLive: true,
        name: liveMarkerName(audience, trackingPlace),
      },
      active: true,
      onClick: () => setSelected(trackingPlace),
    });

    liveMarkerRef.current = liveMarker;
    focusRouteCamera(map, mapsApi, routePath);

    return () => {
      line?.setMap(null);
      liveMarker?.setMap(null);
      if (routeLineRef.current === line) routeLineRef.current = null;
      if (liveMarkerRef.current === liveMarker) liveMarkerRef.current = null;
    };
  }, [audience, center, mapReady, trackingPlace]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!trackingPlace || !map || !mapReady) return;
    const routePath = routePathRef.current.length ? routePathRef.current : routePathForAudience(audience, center, trackingPlace);
    const position = pointAlongPath(routePath, routeProgress);
    liveMarkerRef.current?.updatePosition?.(position);
    if (routeProgress > 0.12 && routeProgress < 0.92) {
      map.panTo(position);
    }
  }, [audience, center, mapReady, routeProgress, trackingPlace]);

  function selectPlace(place) {
    setSelected(place);
    mapInstanceRef.current?.panTo({ lat: place.lat, lng: place.lng });
  }

  function startTracking(place) {
    if (!place) return;
    setSelected(place);
    setTrackingPlace(place);
    setRouteProgress(0.08);
  }

  function stopTracking() {
    setTrackingPlace(null);
    setRouteProgress(0.08);
  }

  function recenter() {
    getBrowserPosition().then((position) => {
      if (!position) return;
      setCenter(position);
      mapInstanceRef.current?.panTo(position);
    });
  }

  async function saveMyLocation() {
    setSavingLocation(true);
    setLocationNotice("Tomando ubicacion...");
    const position = await getBrowserPosition();
    if (!position) {
      setLocationNotice("No pudimos tomar tu ubicacion.");
      setSavingLocation(false);
      return;
    }

    try {
      const response = await fetch("/api/map/my-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: audience, lat: position.lat, lng: position.lng }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
      setCenter(position);
      mapInstanceRef.current?.panTo(position);
      setLocationNotice(copy.saved);
    } catch (saveError) {
      setLocationNotice(saveError.message || "No se pudo guardar.");
    } finally {
      setSavingLocation(false);
    }
  }

  const mapBlocked = Boolean(error && (error.includes("Google") || error.includes("Autoriza") || error.includes("bloqueado")));

  return (
    <section className={`client-map-screen map-audience-${audience} ${mapBlocked ? "has-map-error" : ""}`}>
      <div ref={mapRef} className="client-google-map" />

      {!apiKey || mapBlocked ? (
        <div className="client-map-empty">
          <MapPin size={24} />
          <strong>{!apiKey ? "Falta activar Google Maps" : "Mapa bloqueado en Google Cloud"}</strong>
          <span>{!apiKey ? "Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local." : error}</span>
        </div>
      ) : null}

      <header className="client-map-header">
        <form className="client-map-search" onSubmit={(event) => event.preventDefault()}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            aria-label="Buscar en el mapa"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpiar busqueda">
              <X size={17} />
            </button>
          ) : null}
        </form>
        <button type="button" onClick={recenter} aria-label="Mi ubicacion">
          <LocateFixed size={20} />
        </button>
      </header>

      <div className="client-map-controls" aria-label="Filtros del mapa">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={filter === option.id ? "active" : ""}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {canSaveLocation ? (
        <button type="button" className="client-map-save-location" onClick={saveMyLocation} disabled={savingLocation}>
          <Compass size={17} />
          {savingLocation ? "Guardando..." : copy.saveAction}
        </button>
      ) : null}

      {locationNotice ? <p className="client-map-status" aria-live="polite">{locationNotice}</p> : null}

      {loading ? (
        <div className="client-map-loading">
          <Loader2 size={22} />
          Buscando cerca...
        </div>
      ) : null}

      {error && !mapBlocked ? <p className="client-map-error">{error}</p> : null}

      {!loading && !visiblePlaces.length ? (
        <div className="client-map-no-results">
          <Search size={18} />
          <strong>{copy.emptyTitle}</strong>
          <span>{copy.emptyText}</span>
        </div>
      ) : null}

      {selected ? (
        <article className="client-map-card" aria-label="Ficha del lugar seleccionado">
          <button type="button" className="client-map-card-close" onClick={() => setSelected(null)} aria-label="Cerrar ficha">
            <X size={15} />
          </button>
          <PlaceAvatar place={selected} />
          <div className="client-map-card-copy">
            <small>{copy.sheetLabel}</small>
            <strong>{selected.name}</strong>
            <span>{selected.title}</span>
            <p>
              <MapPin size={14} />
              {selected.distanceKm} km
              {selected.rating ? (
                <>
                  <CheckCircle2 size={14} />
                  {selected.rating}
                </>
              ) : null}
              {selected.type === "supplier" ? (
                <>
                  <Truck size={14} />
                  {selected.hasDelivery ? "Delivery" : "Consultar envio"}
                </>
              ) : (
                <>
                  <Navigation size={14} />
                  {selected.subtitle}
                </>
              )}
            </p>
          </div>
          {trackingPlace?.id === selected.id && trackingCopy ? (
            <div className="client-map-route-chip" aria-live="polite">
              <span className="client-map-route-dot" aria-hidden="true" />
              <div>
                <small>{trackingCopy.kicker}</small>
                <strong>{trackingCopy.title}</strong>
              </div>
              <button type="button" onClick={stopTracking}>
                Listo
              </button>
            </div>
          ) : null}
          <div className="client-map-card-actions">
            {selected.phone ? (
              <a className="call" href={`tel:${cleanPhone(selected.phone)}`} aria-label={`Llamar a ${selected.name}`}>
                <Phone size={17} />
                Llamar
              </a>
            ) : null}
            <Link href={selected.href} aria-label={`Enviar mensaje a ${selected.name}`}>
              <MessageCircle size={17} />
              Mensaje
            </Link>
            <a href={directionsUrl(selected)} target="_blank" rel="noreferrer" aria-label="Abrir ruta en Google Maps">
              <ArrowUpRight size={17} />
              Ruta
            </a>
            {canTrackSelected ? (
              <button type="button" className="live" onClick={() => startTracking(selected)}>
                <Navigation size={17} />
                {routeActionLabel(audience, selected)}
              </button>
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function PlaceAvatar({ place }) {
  const Icon = place.type === "supplier" ? Store : UserRound;
  return (
    <span className={`client-place-avatar ${place.type}`}>
      {place.avatarUrl ? <img src={place.avatarUrl} alt="" /> : <Icon size={18} />}
    </span>
  );
}

function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.__manosyaGoogleMapsApi) return Promise.resolve(window.__manosyaGoogleMapsApi);
  if (window.google?.maps) return prepareGoogleMapsApi(window.google);
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      if (typeof previousAuthFailure === "function") previousAuthFailure();
      reject(new Error("Autoriza http://localhost:3010/* y el dominio de produccion en las restricciones HTTP."));
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => {
      prepareGoogleMapsApi(window.google).then(resolve).catch(reject);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return mapsPromise;
}

async function prepareGoogleMapsApi(google) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (google?.maps?.importLibrary) {
      const [mapsLibrary, coreLibrary] = await Promise.all([
        google.maps.importLibrary("maps"),
        google.maps.importLibrary("core"),
      ]);
      const api = normalizeGoogleMapsApi(google, mapsLibrary, coreLibrary);
      if (api) return api;
    }

    const api = normalizeGoogleMapsApi(google);
    if (api) return api;
    await wait(100);
  }

  throw new Error("Google Maps no termino de cargar.");
}

function normalizeGoogleMapsApi(google, mapsLibrary = {}, coreLibrary = {}) {
  const api = {
    google,
    Map: mapsLibrary.Map || google?.maps?.Map,
    OverlayView: mapsLibrary.OverlayView || google?.maps?.OverlayView,
    Polyline: mapsLibrary.Polyline || google?.maps?.Polyline,
    LatLngBounds: coreLibrary.LatLngBounds || google?.maps?.LatLngBounds,
    LatLng: coreLibrary.LatLng || google?.maps?.LatLng,
  };

  const isReady =
    typeof api.Map === "function" &&
    typeof api.OverlayView === "function" &&
    typeof api.LatLngBounds === "function" &&
    typeof api.LatLng === "function";

  if (!isReady) return null;

  window.__manosyaGoogleMapsApi = api;
  return api;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getBrowserPosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  });
}

function createAvatarOverlay(mapsApi, { map, position, place, active, onClick }) {
  class AvatarOverlay extends mapsApi.OverlayView {
    constructor() {
      super();
      this.currentPosition = position;
    }

    onAdd() {
      this.div = document.createElement("button");
      this.div.type = "button";
      this.div.className = `client-map-marker ${place.type}${place.type === "client" ? " current-location" : ""}${place.routeLive ? " route-live" : ""}${active ? " active" : ""}`;
      this.div.setAttribute("aria-label", place.type === "client" ? "Tu ubicacion" : place.name || "Marcador");
      if (place.type === "client") {
        const pulse = document.createElement("span");
        pulse.className = "client-location-pulse";
        const core = document.createElement("span");
        core.className = "client-location-core";
        const dot = document.createElement("span");
        dot.className = "client-location-dot";
        core.appendChild(dot);
        this.div.appendChild(pulse);
        this.div.appendChild(core);
      } else if (place.avatarUrl) {
        const image = document.createElement("img");
        image.src = place.avatarUrl;
        image.alt = "";
        this.div.appendChild(image);
      } else {
        const label = document.createElement("span");
        label.textContent = initials(place.name);
        this.div.appendChild(label);
      }
      this.div.addEventListener("click", onClick);
      this.getPanes().overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      const projection = this.getProjection();
      const point = projection.fromLatLngToDivPixel(new mapsApi.LatLng(this.currentPosition.lat, this.currentPosition.lng));
      if (!point || !this.div) return;
      this.div.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    }

    updatePosition(nextPosition) {
      this.currentPosition = nextPosition;
      this.draw();
    }

    onRemove() {
      this.div?.removeEventListener("click", onClick);
      this.div?.remove();
      this.div = null;
    }
  }

  const overlay = new AvatarOverlay();
  overlay.setMap(map);
  return overlay;
}

function searchableText(place) {
  return [
    place.name,
    place.title,
    place.subtitle,
    place.city,
    place.address,
    place.category,
    ...(Array.isArray(place.skills) ? place.skills : []),
  ].filter(Boolean).join(" ");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function initials(value) {
  return String(value || "M")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function cleanPhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function directionsUrl(place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
}

function canTrackPlace(audience, place) {
  if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lng))) return false;
  if (audience === "client") return place.type === "worker" || (place.type === "supplier" && place.hasDelivery);
  if (audience === "supplier") return place.type === "worker";
  return true;
}

function routeActionLabel(audience, place) {
  if (audience === "client" && place?.type === "supplier") return "Delivery";
  if (audience === "client") return "Seguir";
  if (audience === "worker") return "Guiarme";
  return "Ruta viva";
}

function liveRouteCopy(audience, place) {
  if (audience === "client" && place?.type === "supplier") {
    return {
      kicker: "Delivery activo",
      title: `${firstName(place.name)} se acerca`,
    };
  }

  if (audience === "client") {
    return {
      kicker: "En camino",
      title: `${firstName(place.name)} va hacia vos`,
    };
  }

  if (audience === "worker") {
    return {
      kicker: "Ruta lista",
      title: "El cliente ve tu avance",
    };
  }

  return {
    kicker: "Entrega lista",
    title: "Comparte el recorrido",
  };
}

function liveMarkerName(audience, place) {
  if (audience === "client") return place.name;
  if (audience === "worker") return "Tu ruta";
  return place.type === "supplier" ? "Delivery" : "Ruta";
}

function firstName(value) {
  return String(value || "ManosYA").trim().split(/\s+/)[0] || "ManosYA";
}

function routePathForAudience(audience, center, place) {
  const target = { lat: Number(place.lat), lng: Number(place.lng) };
  const origin = audience === "client" ? target : center;
  const destination = audience === "client" ? center : target;
  const bend = {
    lat: (origin.lat + destination.lat) / 2 + 0.0011,
    lng: (origin.lng + destination.lng) / 2 - 0.001,
  };

  return [origin, bend, destination].filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function pointAlongPath(path, progress) {
  const points = Array.isArray(path) ? path : [];
  if (!points.length) return ASUNCION;
  if (points.length === 1) return points[0];

  const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const localProgress = scaled - index;
  return interpolatePoint(points[index], points[index + 1], localProgress);
}

function interpolatePoint(a, b, progress) {
  return {
    lat: a.lat + (b.lat - a.lat) * progress,
    lng: a.lng + (b.lng - a.lng) * progress,
  };
}

function focusRouteCamera(map, mapsApi, path) {
  if (!map || !mapsApi?.LatLngBounds || !Array.isArray(path) || path.length < 2) return;
  const bounds = new mapsApi.LatLngBounds();
  path.forEach((point) => bounds.extend(point));

  try {
    map.fitBounds(bounds, { top: 116, right: 46, bottom: 230, left: 46 });
  } catch {
    map.fitBounds(bounds, 92);
  }

  window.setTimeout(() => {
    const zoom = Number(map.getZoom?.());
    if (Number.isFinite(zoom) && zoom > 15) map.setZoom(15);
  }, 180);
}

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#eef8f6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#233633" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7fbfa" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#d8efec" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bde6e1" }] },
];
