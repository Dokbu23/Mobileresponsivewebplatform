/**
 * Mapbox Directions API v5 — High-Accuracy Navigation & Route Engine
 * Specially optimized for Philippine provincial highways & barangay road networks.
 * Provides 100,000 free requests/month with turn-by-turn guidance and road names.
 *
 * Token: Set VITE_MAPBOX_ACCESS_TOKEN in your .env file.
 */

const MAPBOX_ACCESS_TOKEN: string =
  (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN || '';

export function hasMapboxToken(): boolean {
  return typeof MAPBOX_ACCESS_TOKEN === 'string' && MAPBOX_ACCESS_TOKEN.startsWith('pk.');
}

export type ManeuverIcon = 'straight' | 'right' | 'left' | 'uturn' | 'destination';

export interface MapboxRouteStep {
  instruction: string;
  distanceMeters: number;
  icon: ManeuverIcon;
  roadName?: string;
  location?: [number, number]; // [lat, lng]
}

export interface MapboxRouteResult {
  routeCoords: [number, number][]; // [[lat, lng], ...] for Leaflet polyline
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  steps: MapboxRouteStep[];
  source: 'mapbox';
}

function parseManeuverIcon(type?: string, modifier?: string): ManeuverIcon {
  const t = (type || '').toLowerCase();
  const m = (modifier || '').toLowerCase();

  if (t === 'arrive') return 'destination';
  if (m.includes('uturn')) return 'uturn';
  if (m.includes('right')) return 'right';
  if (m.includes('left')) return 'left';
  return 'straight';
}

/**
 * Fetch an accurate road route from Mapbox Directions API v5.
 * Uses geojson geometry so coordinates map 1:1 to Leaflet polylines.
 */
export async function getMapboxRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'DRIVING' | 'WALKING' | 'BICYCLING' = 'DRIVING'
): Promise<MapboxRouteResult | null> {
  if (!hasMapboxToken()) {
    return null;
  }

  // Profile mapping for Mapbox
  let profile = 'mapbox/driving';
  if (mode === 'WALKING') profile = 'mapbox/walking';
  else if (mode === 'BICYCLING') profile = 'mapbox/cycling';

  // Mapbox expects longitude,latitude
  const coordsParam = `${startLng},${startLat};${endLng},${endLat}`;
  const url = `https://api.mapbox.com/directions/v5/${profile}/${coordsParam}?steps=true&geometries=geojson&overview=full&language=en&access_token=${MAPBOX_ACCESS_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Mapbox] API returned status ${res.status}:`, res.statusText);
      return null;
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('[Mapbox] No route found:', data.code);
      return null;
    }

    const route = data.routes[0];
    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    const routeCoords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    const leg = route.legs?.[0];
    const steps: MapboxRouteStep[] = (leg?.steps || []).map((step: any, idx: number) => {
      const isLast = idx === (leg.steps.length - 1);
      const icon = isLast ? 'destination' : parseManeuverIcon(step.maneuver?.type, step.maneuver?.modifier);
      const stepLocation: [number, number] | undefined = step.maneuver?.location
        ? [step.maneuver.location[1], step.maneuver.location[0]]
        : undefined;

      const instruction = step.maneuver?.instruction || (isLast ? 'Arrive at destination' : 'Continue straight');
      const roadName = step.name || (step.ref ? `Route ${step.ref}` : undefined);

      return {
        instruction,
        distanceMeters: Math.round(step.distance || 0),
        icon,
        roadName,
        location: stepLocation,
      };
    });

    return {
      routeCoords,
      totalDistanceMeters: Math.round(route.distance),
      totalDurationSeconds: Math.round(route.duration),
      steps,
      source: 'mapbox',
    };
  } catch (err) {
    console.error('[Mapbox] Routing request failed:', err);
    return null;
  }
}
