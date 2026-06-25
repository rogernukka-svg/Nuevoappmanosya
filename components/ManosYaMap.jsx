'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for all Leaflet components (SSR safe)
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

/* ─── Helpers ─── */

function isOnlineRecent(worker) {
  const stamp =
    worker?.last_seen ||
    worker?.location_updated_at ||
    worker?.loc_updated_at ||
    worker?.updated_at;
  if (!stamp) return false;
  const mins = (Date.now() - new Date(stamp).getTime()) / 60000;
  return mins >= 0 && mins <= 30;
}

function mapAccentColor(worker) {
  if (worker?.is_active === false) return '#9ca3af';
  if (!worker) return '#94a3b8';
  return isOnlineRecent(worker) ? '#16a3a8' : '#94a3b8';
}

function avatarIcon(url, worker) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const size = 56;
  const color = mapAccentColor(worker);
  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:999px;position:relative;background:#fff;box-shadow:0 14px 28px rgba(0,0,0,.18);overflow:visible;">
      <div style="position:absolute;inset:-4px;border-radius:999px;border:3px solid ${color};"></div>
      <img src="${url || '/avatar-fallback.png'}" onerror="this.src='/avatar-fallback.png'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:999px;" />
      ${isOnlineRecent(worker) ? '<div style="position:absolute;right:-2px;bottom:-2px;width:14px;height:14px;border-radius:999px;background:#10b981;border:2px solid #fff;"></div>' : ''}
    </div>
  `;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function clientLocationIcon() {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const size = 24;
  const html = `
    <div style="width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(180deg,#16a3a8 0%, #0c6b70 100%);border:3px solid #fff;box-shadow:0 10px 22px rgba(37,99,235,.35);"></div>
  `;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function makeAvatarMarkerIcon({ avatarUrl, name, borderColor = '#18b8aa' }) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const safeAvatar = avatarUrl || '/avatar-fallback.png';
  const safeName = String(name || 'Usuario').replace(/"/g, '');
  return L.divIcon({
    className: '',
    html: `
      <div style="width:56px;height:56px;border-radius:999px;border:4px solid white;background:${borderColor};box-shadow:0 12px 30px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;position:relative;">
        <img src="${safeAvatar}" alt="${safeName}" style="width:44px;height:44px;border-radius:999px;object-fit:cover;border:2px solid ${borderColor};background:white;" />
        <span style="position:absolute;bottom:-4px;right:-2px;width:16px;height:16px;border-radius:999px;background:${borderColor};border:3px solid white;"></span>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -26],
  });
}

/* ─── FitBounds helper ─── */
function FitBoundsInner({ points }) {
  const { useMap } = require('react-leaflet');
  const map = useMap();

  useEffect(() => {
    if (!map || !Array.isArray(points) || points.length < 2) return;
    const L = require('leaflet');
    const bounds = L.latLngBounds(points);
    setTimeout(() => {
      map.fitBounds(bounds, {
        paddingTopLeft: [36, 90],
        paddingBottomRight: [36, 190],
        maxZoom: 14,
        animate: true,
      });
    }, 250);
  }, [map, points]);

  return null;
}

/* ─── Main Component ─── */

export default function ManosYaMap({
  // View config
  center,
  zoom = 12,
  className = 'h-full w-full',
  style,

  // Client / user location
  me,
  hasMeCoords,
  showMeAsCircle = false,
  meCircleRadius = 120,
  meCircleColor = '#16a3a8',

  // Workers (array of { lat, lng, avatar_url, ... })
  workers,
  workerIconSize,
  onWorkerClick,

  // Route (array of [lat, lng] pairs)
  route,
  routeColor = '#0ea5a4',
  routeWeight = 5,

  // Preview target (single point like client location to navigate to)
  previewTarget,
  previewTargetColor = '#ef4444',
  previewTargetName = 'Cliente',

  // Worker's own location (for driver page)
  workerLocation,
  workerSelfProfile,

  // Selected job (for worker page context)
  selectedJob,
  clientProfile,

  // Hotspots (for worker map)
  hotspots,

  // Fit bounds
  fitPoints,
  fitBounds,

  // Callbacks
  onMapReady,
  mapRef,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">
        <div className="text-sm font-bold text-slate-500">Cargando mapa...</div>
      </div>
    );
  }

  const mapCenter = center || (hasMeCoords ? [Number(me.lat), Number(me.lon)] : [-25.5097, -54.6111]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className={className}
      style={style}
      ref={mapRef}
      whenReady={(e) => {
        setTimeout(() => e.target.invalidateSize(), 250);
        if (onMapReady) onMapReady(e);
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {/* Fit bounds */}
      {fitPoints && fitPoints.length >= 2 && <FitBoundsInner points={fitPoints} />}

      {/* Client / Me location */}
      {hasMeCoords && (
        <>
          <Marker
            position={[Number(me.lat), Number(me.lon)]}
            icon={clientLocationIcon() || undefined}
          />
          {showMeAsCircle && (
            <Circle
              center={[Number(me.lat), Number(me.lon)]}
              radius={meCircleRadius}
              pathOptions={{ color: meCircleColor, fillColor: meCircleColor, fillOpacity: 0.12 }}
            />
          )}
        </>
      )}

      {/* Workers markers */}
      {Array.isArray(workers) && workers.map((worker) => {
        const lat = Number(worker.lat);
        const lng = Number(worker.lng ?? worker.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return (
          <Marker
            key={String(worker.user_id || worker.worker_id || worker.id)}
            position={[lat, lng]}
            icon={avatarIcon(worker.avatar_url, worker) || undefined}
            eventHandlers={onWorkerClick ? { click: () => onWorkerClick(worker) } : undefined}
          />
        );
      })}

      {/* Route polyline */}
      {Array.isArray(route) && route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: routeColor, weight: routeWeight, opacity: 0.92 }}
        />
      )}

      {/* Preview target (client location for worker navigation) */}
      {previewTarget && Number.isFinite(Number(previewTarget.lat)) && Number.isFinite(Number(previewTarget.lng)) && (
        <Marker
          position={[Number(previewTarget.lat), Number(previewTarget.lng)]}
          icon={makeAvatarMarkerIcon({
            avatarUrl: selectedJob?.client?.avatar_url || clientProfile?.avatar_url || '/avatar-fallback.png',
            name: previewTargetName,
            borderColor: previewTargetColor,
          }) || undefined}
        >
          <Popup>
            <div className="min-w-[190px]">
              <div className="font-extrabold text-gray-800">{previewTargetName}</div>
              <div className="mt-1 text-sm text-gray-500">Ubicación compartida</div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Worker own location (for driver page) */}
      {workerLocation && Number.isFinite(Number(workerLocation.lat)) && Number.isFinite(Number(workerLocation.lng)) && (
        <>
          <Marker
            position={[Number(workerLocation.lat), Number(workerLocation.lng)]}
            icon={makeAvatarMarkerIcon({
              avatarUrl: workerSelfProfile?.avatar_url || '/avatar-fallback.png',
              name: workerSelfProfile?.full_name || 'Tu ubicación',
              borderColor: '#10b981',
            }) || undefined}
          >
            <Popup>
              <div className="min-w-[190px]">
                <div className="font-extrabold text-gray-800">{workerSelfProfile?.full_name || 'Tu ubicación'}</div>
                <div className="mt-1 text-sm text-gray-500">Posición actual</div>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[Number(workerLocation.lat), Number(workerLocation.lng)]}
            radius={55}
            pathOptions={{ color: '#10b981', weight: 1, fillColor: '#10b981', fillOpacity: 0.12 }}
          />
        </>
      )}

      {/* Hotspots (worker map) */}
      {Array.isArray(hotspots) && hotspots.map((spot, idx) => (
        <span key={spot.name || idx}>
          <Circle
            center={[spot.lat, spot.lng]}
            radius={200 + (spot.intensity || 5) * 25}
            pathOptions={{
              color: '#18b8aa',
              fillColor: '#18b8aa',
              fillOpacity: 0.08 + (spot.intensity || 5) * 0.015,
              weight: 1,
            }}
          />
          <CircleMarker
            center={[spot.lat, spot.lng]}
            radius={4 + (spot.intensity || 5) * 0.5}
            pathOptions={{
              color: '#18b8aa',
              fillColor: '#18b8aa',
              fillOpacity: 0.6,
              weight: 1,
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="font-bold text-gray-800">{spot.name}</div>
                <div className="mt-1 text-sm text-gray-500">Demanda: {spot.intensity}/10</div>
              </div>
            </Popup>
          </CircleMarker>
        </span>
      ))}
    </MapContainer>
  );
}