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
  virtual_tour_scenes?: any[];
  userId?: string | number;
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
  onOpenVirtualTour?: (marker: MapMarker) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

const MANSALAY_CENTER: [number, number] = [12.5311, 121.4394];

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
  onOpenVirtualTour,
  onMapClick,
}: MansalayMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersLayerRef = useRef<any>(null);
  const routeLineRef = useRef<LeafletPolyline | null>(null);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);
  const onMapClickRef = useRef(onMapClick);
  const hasCenteredUserRef = useRef(false);

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
        minZoom: 6,
        maxZoom: 19,
      });

      mapRef.current = map;

      const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

      // 1. OpenStreetMap (Standard Street Layer)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      });

      // 2. Google Maps Satellite Hybrid (Real Aerial Photo + Road/Labels Overlay)
      const googleHybridUrl = GOOGLE_MAPS_KEY
        ? `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`
        : 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      const googleHybridLayer = L.tileLayer(googleHybridUrl, {
        attribution: '© Google Maps Satellite | Mansalay Tourism GPS',
        maxZoom: 20,
      });

      // 3. Google Maps Standard Roads
      const googleRoadUrl = GOOGLE_MAPS_KEY
        ? `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      const googleRoadLayer = L.tileLayer(googleRoadUrl, {
        attribution: '© Google Maps Roads',
        maxZoom: 20,
      });

      // Default to Google Hybrid if available, otherwise OSM
      googleHybridLayer.addTo(map);

      // Layer Control (Interactive Switcher)
      const baseMaps: Record<string, any> = {
        '🛰️ Google Satellite': googleHybridLayer,
        '🗺️ Standard Map (OSM)': osmLayer,
        '🚗 Google Roads': googleRoadLayer,
      };

      L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

      // Handle map click
      map.on('click', (e: any) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle Dynamic Destination & Landmark Markers rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      if (markersLayerRef.current) {
        map.removeLayer(markersLayerRef.current);
        markersLayerRef.current = null;
      }

      const layerGroup = L.featureGroup();

      markers.forEach((marker) => {
        const color = TYPE_COLORS[marker.type] || '#EC4899';
        const emoji = marker.type === 'resort' ? '🏨' : marker.type === 'enterprise' ? '🛍️' : '📍';
        const icon = L.divIcon({
          html: `
            <div style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));cursor:pointer;position:relative;width:34px;height:46px;">
              <svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="${color}"/>
                <path d="M17 1C8.16 1 1 8.16 1 17C1 28.5 15.5 43.5 17 45C18.5 43.5 33 28.5 33 17C33 8.16 25.84 1 17 1Z" stroke="rgba(0,0,0,0.25)" stroke-width="1.2"/>
                <circle cx="17" cy="17" r="10" fill="#FFFFFF"/>
              </svg>
              <div style="position:absolute;top:5px;left:0;width:34px;height:24px;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;pointer-events:none;">
                ${emoji}
              </div>
            </div>
          `,
          className: '',
          iconSize: [34, 46],
          iconAnchor: [17, 46],
          popupAnchor: [0, -44],
        });

        const popupContent = `
          <div style="padding:6px;font-family:sans-serif;">
            <div style="font-size:10px;font-weight:800;color:${color};text-transform:uppercase;margin-bottom:2px;letter-spacing:0.5px;">${marker.type === 'enterprise' ? 'Enterprise Shop' : marker.type === 'resort' ? 'Resort / Stay' : 'Attraction'}</div>
            <div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:4px;line-height:1.2;">${marker.name}</div>
            ${marker.location ? `<div style="font-size:11px;color:#6B7280;margin-bottom:6px;">📍 ${marker.location}</div>` : ''}
            ${marker.description ? `<div style="font-size:11px;color:#4B5563;line-height:1.4;margin-bottom:10px;max-height:60px;overflow:hidden;">${marker.description}</div>` : ''}
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button id="btn-tour-${marker.id}" style="width:100%;background:linear-gradient(to right, #10B981, #0D9488);color:white;border:none;padding:8px 12px;border-radius:999px;font-weight:800;font-size:11px;cursor:pointer;box-shadow:0 2px 8px rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;gap:5px;">
                🌐 View 360° Walkthrough
              </button>
              <button id="btn-route-${marker.id}" style="width:100%;background:linear-gradient(to right, #EC4899, #F43F5E);color:white;border:none;padding:7px 12px;border-radius:999px;font-weight:700;font-size:11px;cursor:pointer;box-shadow:0 2px 8px rgba(236,72,153,0.3);display:flex;align-items:center;justify-content:center;gap:5px;">
                🧭 Show Directions & Live Route
              </button>
            </div>
          </div>
        `;

        const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
          .bindPopup(popupContent, { maxWidth: 270 });

        leafletMarker.on('popupopen', () => {
          const btnTour = document.getElementById(`btn-tour-${marker.id}`);
          if (btnTour) {
            btnTour.onclick = () => {
              if (onOpenVirtualTour) onOpenVirtualTour(marker);
            };
          }
          const btn = document.getElementById(`btn-route-${marker.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectMarker) onSelectMarker(marker);
            };
          }
        });

        layerGroup.addLayer(leafletMarker);
      });

      layerGroup.addTo(map);
      markersLayerRef.current = layerGroup;
    });
  }, [markers, onSelectMarker, onOpenVirtualTour]);

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

        // Render Google Maps Style Navigation Arrow Marker
        const arrowRotationCss = headingDeg !== null ? `transform: rotate(${headingDeg}deg);` : '';

        const userIcon = L.divIcon({
          html: `
            <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;inset:0;background:#4285F4;border-radius:50%;opacity:0.25;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style="${arrowRotationCss}filter:drop-shadow(0 3px 6px rgba(0,0,0,0.45));transition:transform 0.3s ease;">
                <path d="M18 3L31 31L18 24L5 31L18 3Z" fill="#1A73E8" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
                <path d="M18 7L27 27L18 22L9 27L18 7Z" fill="#4285F4"/>
                <circle cx="18" cy="18" r="2.5" fill="#FFFFFF"/>
              </svg>
            </div>
          `,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
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

        // Automatically center map on user's live position when first acquired (especially outside Mansalay)
        if (!hasCenteredUserRef.current && !routeCoords) {
          map.panTo(activeUserCoords, { animate: true });
          hasCenteredUserRef.current = true;
        }
      }

      // 3. Render Real Road Route Polyline
      if (routeCoords && routeCoords.length > 0) {
        routeLineRef.current = L.polyline(routeCoords, {
          color: '#EC4899',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        if (activeUserCoords) {
          // Focus directly on the tourist's current location with close view
          map.setView(activeUserCoords, 16, { animate: true });
        } else {
          const bounds = L.latLngBounds(routeCoords);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } else if (selectedMarker && activeUserCoords) {
        // Focus on tourist location and draw preview line
        map.setView(activeUserCoords, 16, { animate: true });
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
