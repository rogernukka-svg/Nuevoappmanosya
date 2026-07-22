"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, MessageCircle, SlidersHorizontal, Store, UserRound } from "lucide-react";

const ASUNCION = { lat: -25.2867, lng: -57.3333 };
let mapsPromise;

const mapCopy = {
  client: {
    kicker: "Resolver cerca",
    title: "Mapa ManosYA",
    saveAction: "",
    saved: "",
  },
  worker: {
    kicker: "Estoy disponible",
    title: "Mapa ManosYA",
    saveAction: "Estoy aca",
    saved: "Ubicacion actualizada. Ahora pueden encontrarte mejor.",
  },
  supplier: {
    kicker: "Local digital",
    title: "Mapa ManosYA",
    saveAction: "Fijar local",
    saved: "Local fijado. Tus insumos ya tienen direccion.",
  },
};

export default function ClientMapScreen({ audience = "client" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapApiRef = useRef(null);
  const overlaysRef = useRef([]);
  const [places, setPlaces] = useState([]);
  const [center, setCenter] = useState(ASUNCION);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("near");
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const copy = mapCopy[audience] || mapCopy.client;
  const canSaveLocation = audience === "worker" || audience === "supplier";

  const visiblePlaces = useMemo(() => {
    const filtered = filter === "all" ? places : places.filter((place) => place.type === filter);
    return [...filtered].sort((a, b) => sort === "near" ? a.distanceKm - b.distanceKm : b.distanceKm - a.distanceKm);
  }, [filter, places, sort]);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      setLoading(true);
      const position = await getBrowserPosition();
      const nextCenter = position || ASUNCION;
      if (!alive) return;
      setCenter(nextCenter);

      try {
        const query = new URLSearchParams({
          lat: String(nextCenter.lat),
          lng: String(nextCenter.lng),
        });
        const response = await fetch(`/api/map/places?${query.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!alive) return;
        setPlaces(Array.isArray(payload.places) ? payload.places : []);
        setSelected(payload.places?.[0] || null);
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
  }, []);

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
      onClick: () => setSelected(null),
    });
    overlaysRef.current.push(userMarker);

    visiblePlaces.forEach((place) => {
      const overlay = createAvatarOverlay(mapsApi, {
        map,
        position: { lat: place.lat, lng: place.lng },
        place,
        onClick: () => setSelected(place),
      });
      overlaysRef.current.push(overlay);
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    if (visiblePlaces.length) map.fitBounds(bounds, 70);
    else map.setCenter(center);
  }, [center, mapReady, visiblePlaces]);

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

  const mapBlocked = Boolean(error && (error.includes("Google") || error.includes("Autoriza")));

  return (
    <section className={`client-map-screen ${mapBlocked ? "has-map-error" : ""}`}>
      <div ref={mapRef} className="client-google-map" />

      {!apiKey || mapBlocked ? (
        <div className="client-map-empty">
          <MapPin size={24} />
          <strong>{!apiKey ? "Falta activar Google Maps" : "Mapa bloqueado en Google Cloud"}</strong>
          <span>{!apiKey ? "Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local." : error}</span>
        </div>
      ) : null}

      <header className="client-map-header">
        <div>
          <small>{copy.kicker}</small>
          <strong>{copy.title}</strong>
        </div>
        <button type="button" onClick={recenter} aria-label="Mi ubicacion">
          <LocateFixed size={20} />
        </button>
      </header>

      <div className="client-map-controls" aria-label="Filtros del mapa">
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todo</button>
        <button type="button" className={filter === "worker" ? "active" : ""} onClick={() => setFilter("worker")}>Trabajadores</button>
        <button type="button" className={filter === "supplier" ? "active" : ""} onClick={() => setFilter("supplier")}>Insumos</button>
        <button type="button" className={sort === "near" ? "active icon" : "icon"} onClick={() => setSort(sort === "near" ? "far" : "near")} aria-label="Ordenar">
          <SlidersHorizontal size={17} />
          {sort === "near" ? "Cerca" : "Lejos"}
        </button>
      </div>

      {canSaveLocation ? (
        <button type="button" className="client-map-save-location" onClick={saveMyLocation} disabled={savingLocation}>
          <MapPin size={17} />
          {savingLocation ? "Guardando..." : copy.saveAction}
        </button>
      ) : null}

      {locationNotice ? <p className="client-map-status">{locationNotice}</p> : null}

      {loading ? (
        <div className="client-map-loading">
          <Loader2 size={22} />
          Buscando cerca...
        </div>
      ) : null}

      {error && !mapBlocked ? <p className="client-map-error">{error}</p> : null}

      <div className="client-map-list">
        {visiblePlaces.slice(0, 4).map((place) => (
          <button key={place.id} type="button" className={selected?.id === place.id ? "active" : ""} onClick={() => setSelected(place)}>
            <PlaceAvatar place={place} />
            <span>
              <b>{place.title}</b>
              <small>{place.distanceKm} km - {place.name}</small>
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <article className="client-map-card">
          <PlaceAvatar place={selected} />
          <div>
            <small>{selected.type === "supplier" ? "Proveedor cerca" : "Trabajador cerca"}</small>
            <strong>{selected.title}</strong>
            <span>{selected.distanceKm} km - {selected.subtitle}</span>
          </div>
          <Link href={selected.href} aria-label="Contactar">
            <MessageCircle size={19} />
            Contactar
          </Link>
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
      reject(new Error("Autoriza http://localhost:3010/* en las restricciones HTTP de tu clave."));
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
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

function createAvatarOverlay(mapsApi, { map, position, place, onClick }) {
  class AvatarOverlay extends mapsApi.OverlayView {
    onAdd() {
      this.div = document.createElement("button");
      this.div.type = "button";
      this.div.className = `client-map-marker ${place.type}`;
      this.div.setAttribute("aria-label", place.name || "Marcador");
      if (place.avatarUrl) {
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
      const point = projection.fromLatLngToDivPixel(new mapsApi.LatLng(position.lat, position.lng));
      if (!point || !this.div) return;
      this.div.style.transform = `translate(${point.x - 24}px, ${point.y - 24}px)`;
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

function initials(value) {
  return String(value || "M")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#eef8f6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#233633" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7fbfa" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#d8efec" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bde6e1" }] },
];
