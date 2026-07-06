import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  name: string;
  type: 'attraction' | 'resort' | 'enterprise';
  description?: string;
  image?: string;
}

interface MansalayMapProps {
  markers?: MapMarker[];
  height?: string;
  zoom?: number;
  center?: [number, number];
}

const MANSALAY_CENTER: [number, number] = [12.5167, 121.4333];
const MANSALAY_BOUNDS: [[number, number], [number, number]] = [
  [12.45, 121.38],
  [12.60, 121.50],
];

const TYPE_COLORS: Record<string, string> = {
  attraction: '#FF69B4',
  resort: '#4CAF50',
  enterprise: '#2196F3',
};

const TYPE_ICONS: Record<string, string> = {
  attraction: '🏖️',
  resort: '🏨',
  enterprise: '🛍️',
};

export function MansalayMap({
  markers = [],
  height = '500px',
  zoom = 13,
  center = MANSALAY_CENTER,
}: MansalayMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        maxBoundsViscosity: 0.9,
        minZoom: 11,
        maxZoom: 18,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Mansalay boundary outline
      L.rectangle(MANSALAY_BOUNDS, {
        color: '#FF69B4',
        weight: 2,
        fillOpacity: 0.02,
        dashArray: '8 4',
      }).addTo(map);

      markers.forEach((marker) => {
        const color = TYPE_COLORS[marker.type] || '#FF69B4';
        const emoji = TYPE_ICONS[marker.type] || '📍';

        const icon = L.divIcon({
          html: `
            <div style="
              background:${color};border:3px solid white;
              border-radius:50% 50% 50% 0;transform:rotate(-45deg);
              width:36px;height:36px;display:flex;align-items:center;
              justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);
            ">
              <span style="transform:rotate(45deg);font-size:16px;">${emoji}</span>
            </div>
          `,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });

        const popupContent = `
          <div style="min-width:180px;font-family:sans-serif;">
            ${marker.image ? `<img src="${marker.image}" alt="${marker.name}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px;" onerror="this.style.display='none'"/>` : ''}
            <div style="font-weight:700;font-size:14px;color:#333;margin-bottom:4px;">${marker.name}</div>
            <div style="display:inline-block;background:${color};color:white;font-size:10px;padding:2px 8px;border-radius:999px;margin-bottom:6px;text-transform:capitalize;">${marker.type}</div>
            ${marker.description ? `<div style="font-size:12px;color:#666;line-height:1.4;">${marker.description}</div>` : ''}
          </div>
        `;

        L.marker([marker.lat, marker.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 220 });
      });

      if (markers.length === 0) {
        const defaultIcon = L.divIcon({
          html: `<div style="background:#FF69B4;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        L.marker(MANSALAY_CENTER, { icon: defaultIcon })
          .addTo(map)
          .bindPopup('<b>Mansalay, Oriental Mindoro</b>')
          .openPopup();
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}
    />
  );
}
