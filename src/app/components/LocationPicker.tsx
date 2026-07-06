import { useEffect, useRef, useState } from 'react';
import { MapPin, Check } from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';

// Mansalay, Oriental Mindoro exact bounds
const MANSALAY_CENTER: [number, number] = [12.5167, 121.4333];
const MANSALAY_BOUNDS = {
  south: 12.45,
  north: 12.60,
  west: 121.38,
  east: 121.50,
};

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
        maxBounds: [
          [MANSALAY_BOUNDS.south, MANSALAY_BOUNDS.west],
          [MANSALAY_BOUNDS.north, MANSALAY_BOUNDS.east],
        ],
        maxBoundsViscosity: 1.0,
        minZoom: 12,
        maxZoom: 18,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Custom pink pin icon
      const pinIcon = L.divIcon({
        html: `
          <div style="
            background:#FF69B4;
            border:3px solid white;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 3px 10px rgba(0,0,0,0.3);
          ">
            <span style="transform:rotate(45deg);font-size:14px;">📍</span>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // If initial location, place marker
      if (selected) {
        markerRef.current = L.marker(selected, { icon: pinIcon }).addTo(map);
      }

      // Click to place/move marker
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;

        // Clamp to Mansalay bounds
        const clampedLat = Math.max(MANSALAY_BOUNDS.south, Math.min(MANSALAY_BOUNDS.north, lat));
        const clampedLng = Math.max(MANSALAY_BOUNDS.west, Math.min(MANSALAY_BOUNDS.east, lng));

        if (markerRef.current) {
          markerRef.current.setLatLng([clampedLat, clampedLng]);
        } else {
          markerRef.current = L.marker([clampedLat, clampedLng], { icon: pinIcon }).addTo(map);
        }

        setSelected([clampedLat, clampedLng]);
        onLocationSelect(clampedLat, clampedLng);
      });

      // Add Mansalay boundary rectangle
      L.rectangle(
        [
          [MANSALAY_BOUNDS.south, MANSALAY_BOUNDS.west],
          [MANSALAY_BOUNDS.north, MANSALAY_BOUNDS.east],
        ],
        {
          color: '#FF69B4',
          weight: 2,
          fillOpacity: 0.03,
          dashArray: '6 4',
        }
      ).addTo(map);
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
