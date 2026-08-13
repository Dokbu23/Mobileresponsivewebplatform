import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polyline as LeafletPolyline } from 'leaflet';

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  name: string;
  type: 'attraction' | 'resort' | 'enterprise';
  description?: string;
  image?: string;
  location?: string;
}

export interface UserGpsData {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
  altitude?: number | null;
}

interface MansalayMapProps {
  markers?: MapMarker[];
  height?: string;
  zoom?: number;
  center?: [number, number];
  userLocation?: [number, number] | null;
  userGps?: UserGpsData | null;
  routeCoords?: [number, number][] | null;
  selectedMarker?: MapMarker | null;
  onSelectMarker?: (marker: MapMarker) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

const MANSALAY_CENTER: [number, number] = [12.5311, 121.4394];
const MANSALAY_BOUNDS: [[number, number], [number, number]] = [
  [12.4200, 121.3200],
  [12.6200, 121.5500],
];

const MANSALAY_POLYGON: [number, number][] = [
  [12.6150, 121.3250],
  [12.6180, 121.4100],
  [12.5950, 121.4850],
  [12.5650, 121.5250],
  [12.5100, 121.5450],
  [12.4450, 121.5200],
  [12.4250, 121.4650],
  [12.4220, 121.3900],
  [12.4500, 121.3300],
  [12.5300, 121.3180],
  [12.6150, 121.3250],
];

const TYPE_COLORS: Record<string, string> = {
  attraction: '#EC4899', // Pink
  resort: '#10B981',     // Emerald
  enterprise: '#3B82F6', // Blue
};

export function MansalayMap({
  markers = [],
  height = '500px',
  zoom = 13,
  center = MANSALAY_CENTER,
  userLocation = null,
  userGps = null,
  routeCoords = null,
  selectedMarker = null,
  onSelectMarker,
  onMapClick,
}: MansalayMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const routeLineRef = useRef<LeafletPolyline | null>(null);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);
  const polygonOverlayRef = useRef<any>(null);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        maxBounds: MANSALAY_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 12,
        maxZoom: 18,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | Mansalay Tourism GPS',
        maxZoom: 19,
      }).addTo(map);

      // Render official 2D Mansalay Municipality Boundary Polygon Overlay
      polygonOverlayRef.current = L.polygon(MANSALAY_POLYGON, {
        color: '#EC4899',
        weight: 3,
        fillColor: '#EC4899',
        fillOpacity: 0.04,
        dashArray: '8, 8',
      }).addTo(map);

      // Handle map click
      map.on('click', (e: any) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      // Render destination markers
      markers.forEach((marker) => {
        const color = TYPE_COLORS[marker.type] || '#EC4899';
        const icon = L.divIcon({
          html: `
            <div style="background-color:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">
              📍
            </div>
          `,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const popupContent = `
          <div style="padding:4px;">
            <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;margin-bottom:2px;">${marker.type}</div>
            <div style="font-size:15px;font-weight:800;color:#111827;margin-bottom:4px;">${marker.name}</div>
            ${marker.location ? `<div style="font-size:12px;color:#6B7280;margin-bottom:6px;">📍 ${marker.location}</div>` : ''}
            ${marker.description ? `<div style="font-size:12px;color:#4B5563;line-height:1.4;margin-bottom:10px;">${marker.description}</div>` : ''}
            <button id="btn-route-${marker.id}" style="width:100%;background:linear-gradient(to right, #EC4899, #F43F5E);color:white;border:none;padding:7px 12px;border-radius:999px;font-weight:700;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(236,72,153,0.3);">
              🧭 Show Directions & Live Route
            </button>
          </div>
        `;

        const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 260 });

        leafletMarker.on('popupopen', () => {
          const btn = document.getElementById(`btn-route-${marker.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectMarker) onSelectMarker(marker);
            };
          }
        });
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle User Location pin, Dynamic Accuracy Circle & OSRM Road Route Line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      // 1. Remove existing user marker & accuracy circle & route line
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        map.removeLayer(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }

      const activeUserCoords: [number, number] | null = userGps
        ? [userGps.lat, userGps.lng]
        : userLocation;

      // 2. Render User Live GPS Location Marker & Real Accuracy Circle
      if (activeUserCoords) {
        const accuracyRadius = userGps?.accuracy ?? 15;
        const headingDeg = (userGps?.speed && userGps.speed > 0.5 && typeof userGps.heading === 'number')
          ? userGps.heading
          : null;

        // Render Dynamic GPS Accuracy Circle (Radius driven directly by position.coords.accuracy)
        userAccuracyCircleRef.current = L.circle(activeUserCoords, {
          radius: accuracyRadius,
          color: '#3B82F6',
          weight: 1.5,
          fillColor: '#3B82F6',
          fillOpacity: 0.12,
        }).addTo(map);

        // Render Navigation Arrow Marker
        const arrowRotationCss = headingDeg !== null ? `transform: rotate(${headingDeg}deg);` : '';

        const userIcon = L.divIcon({
          html: `
            <div style="position:relative;width:34px;height:34px;transition:all 0.4s ease-out;">
              <div style="position:absolute;inset:0;background:#2563EB;border-radius:50%;opacity:0.3;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="position:absolute;inset:4px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;transition:transform 0.3s ease-out;${arrowRotationCss}">
                ${headingDeg !== null ? '▲' : '📍'}
              </div>
            </div>
          `,
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        userMarkerRef.current = L.marker(activeUserCoords, { icon: userIcon })
          .addTo(map)
          .bindPopup(`
            <div style="padding:2px;">
              <b style="color:#1E40AF;">📍 Device GPS Location</b><br/>
              <span style="font-size:11px;color:#4B5563;">Accuracy: ±${Math.round(accuracyRadius)}m</span><br/>
              <span style="font-size:10px;font-family:monospace;color:#6B7280;">${activeUserCoords[0].toFixed(6)}°, ${activeUserCoords[1].toFixed(6)}°</span>
            </div>
          `);
      }

      // 3. Render Real Road Route Polyline (from OSRM GeoJSON road geometry)
      if (routeCoords && routeCoords.length > 0) {
        routeLineRef.current = L.polyline(routeCoords, {
          color: '#EC4899',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        const bounds = L.latLngBounds(routeCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (selectedMarker && activeUserCoords) {
        // Fallback straight-line preview when route is loading
        const endCoords: [number, number] = [selectedMarker.lat, selectedMarker.lng];
        routeLineRef.current = L.polyline([activeUserCoords, endCoords], {
          color: '#EC4899',
          weight: 4,
          opacity: 0.5,
          dashArray: '6, 10',
        }).addTo(map);
      }
    });
  }, [userLocation, userGps, routeCoords, selectedMarker]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '24px', overflow: 'hidden', zIndex: 0 }}
    />
  );
}
