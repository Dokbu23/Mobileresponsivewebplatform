import { useEffect, useRef, useState } from 'react';
import { MapPin, Check } from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';

// Mansalay, Oriental Mindoro exact bounds
const MANSALAY_CENTER: [number, number] = [12.5167, 121.4333];

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

export function LocationPicker({
  initialLat,
  initialLng,
  onLocationSelect,
  height = '300px',
}: LocationPickerProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);
  const [selected, setSelected] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current, {
        center: selected ?? MANSALAY_CENTER,
        zoom: 14,
        minZoom: 6,
        maxZoom: 19,
      });

      mapRef.current = map;

      const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      });

      const googleHybridUrl = GOOGLE_MAPS_KEY
        ? `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`
        : 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      const googleHybridLayer = L.tileLayer(googleHybridUrl, {
        attribution: '© Google Maps Satellite',
        maxZoom: 20,
      });

      // Default to Google Satellite Hybrid for precise location picking
      googleHybridLayer.addTo(map);

      L.control.layers(
        {
          '🛰️ Google Satellite': googleHybridLayer,
          '🗺️ Standard Map': osmLayer,
        },
        undefined,
        { position: 'topright' }
      ).addTo(map);

      // Authentic Google Maps Red Teardrop Pin
      const pinIcon = L.divIcon({
        html: `
          <div style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));cursor:pointer;">
            <svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="#EA4335"/>
              <path d="M17 1C8.16 1 1 8.16 1 17C1 28.5 15.5 43.5 17 45C18.5 43.5 33 28.5 33 17C33 8.16 25.84 1 17 1Z" stroke="#B31412" stroke-width="1"/>
              <circle cx="17" cy="17" r="7.5" fill="#FFFFFF"/>
              <circle cx="17" cy="17" r="4.5" fill="#B31412"/>
            </svg>
          </div>
        `,
        className: '',
        iconSize: [34, 46],
        iconAnchor: [17, 46],
      });

      // If initial location, place marker
      if (selected) {
        markerRef.current = L.marker(selected, { icon: pinIcon }).addTo(map);
      }

      // Click to place/move marker
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        }

        setSelected([lat, lng]);
        onLocationSelect(lat, lng);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Click on the map to set your exact location in Mansalay</span>
      </div>
      <div
        ref={containerRef}
        style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,105,180,0.3)' }}
      />
      {selected && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <Check className="h-3.5 w-3.5" />
          Location set: {selected[0].toFixed(5)}, {selected[1].toFixed(5)}
        </div>
      )}
      {!selected && (
        <p className="text-xs text-muted-foreground text-center">No location set yet — click the map to pin your location</p>
      )}
    </div>
  );
}
