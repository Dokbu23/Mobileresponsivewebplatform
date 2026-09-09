/**
 * Google Maps Directions API — Browser-side DirectionsService Utility
 * Dynamically loads the Google Maps JS SDK and provides accurate routing
 * for Mansalay, Oriental Mindoro (better coverage than OSRM for Philippines roads).
 *
 * API Key: Set VITE_GOOGLE_MAPS_API_KEY in your .env file.
 * Key Restriction: Restrict to your domain HTTP referrer in Google Cloud Console.
 */

const GOOGLE_MAPS_API_KEY: string =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

let googleMapsLoadPromise: Promise<void> | null = null;

/**
 * Dynamically injects the Google Maps JS API script into the page.
 * Safe to call multiple times — only loads once.
 */
export function loadGoogleMapsAPI(): Promise<void> {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('No VITE_GOOGLE_MAPS_API_KEY set in .env'));
  }

  // Already loaded
  if (typeof google !== 'undefined' && google.maps?.DirectionsService) {
    return Promise.resolve();
  }

  // Already loading
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleMapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps JS API'));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

/** Maneuver icon types matching InAppNavigationModal's NavigationStep */
export type ManeuverIcon = 'straight' | 'right' | 'left' | 'uturn' | 'destination';

export interface GoogleRouteStep {
  instruction: string;       // plain-text turn instruction
  distanceMeters: number;
  icon: ManeuverIcon;
  roadName?: string;
  location?: [number, number]; // [lat, lng]
}

export interface GoogleRouteResult {
  /** Route polyline as [lat, lng][] — ready for Leaflet */
  routeCoords: [number, number][];
  steps: GoogleRouteStep[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

/** Maps Google maneuver string → our icon type */
function parseManeuverIcon(maneuver: string): ManeuverIcon {
  if (!maneuver) return 'straight';
  const m = maneuver.toLowerCase();
  if (m.includes('uturn') || m.includes('u-turn')) return 'uturn';
  if (m.includes('right')) return 'right';
  if (m.includes('left')) return 'left';
  return 'straight';
}

/** Strip HTML tags from Google's html_instructions */
function stripHtml(html: string): string {
  try {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent || el.innerText || html;
  } catch {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Fetches an accurate road route using Google Maps DirectionsService.
 *
 * @param startLat  Origin latitude
 * @param startLng  Origin longitude
 * @param endLat    Destination latitude
 * @param endLng    Destination longitude
 * @param mode      Travel mode — defaults to DRIVING
 * @returns         Parsed route result, or null on failure
 */
let isGoogleBillingDisabled = false;

export async function getGoogleMapsRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'DRIVING' | 'WALKING' | 'BICYCLING' = 'DRIVING'
): Promise<GoogleRouteResult | null> {
  if (isGoogleBillingDisabled) {
    return null;
  }

  try {
    await loadGoogleMapsAPI();
  } catch (loadErr) {
    console.warn('[GoogleMaps] SDK load failed:', loadErr);
    return null;
  }

  return new Promise<GoogleRouteResult | null>((resolve) => {
    try {
      const service = new google.maps.DirectionsService();

      service.route(
        {
          origin: new google.maps.LatLng(startLat, startLng),
          destination: new google.maps.LatLng(endLat, endLng),
          travelMode: google.maps.TravelMode[mode],
          optimizeWaypoints: false,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
            isGoogleBillingDisabled = true;
            console.info('[GoogleMaps] Google Directions requires billing; seamlessly using Mapbox navigation engine.');
            resolve(null);
            return;
          }

          if (status !== google.maps.DirectionsStatus.OK || !result) {
            resolve(null);
            return;
          }

          const route = result.routes[0];
          const leg = route.legs[0];

          // Decode overview polyline → [lat, lng][] for Leaflet
          const decodedPath = google.maps.geometry.encoding.decodePath(
            route.overview_polyline
          );
          const routeCoords: [number, number][] = decodedPath.map((pt) => [
            pt.lat(),
            pt.lng(),
          ]);

          // Parse each step
          const steps: GoogleRouteStep[] = leg.steps.map((step, idx) => {
            const isLast = idx === leg.steps.length - 1;
            const maneuver = (step as any).maneuver || '';
            const icon: ManeuverIcon = isLast
              ? 'destination'
              : parseManeuverIcon(maneuver);

            const plainInstruction = stripHtml(step.instructions || '');

            // Best-effort road name extraction
            let roadName = '';
            if (step.instructions) {
              const onMatch = step.instructions.match(/on\s+<[^>]*>([^<]+)<\/[^>]*>/i);
              if (onMatch) roadName = onMatch[1];
              else {
                const plain = stripHtml(step.instructions);
                const parts = plain.split(' on ');
                if (parts.length > 1) roadName = parts[parts.length - 1].trim();
              }
            }

            return {
              instruction: plainInstruction,
              distanceMeters: step.distance?.value ?? 0,
              icon,
              roadName: roadName || undefined,
              location: [
                step.start_location.lat(),
                step.start_location.lng(),
              ],
            };
          });

          resolve({
            routeCoords,
            steps,
            totalDistanceMeters: leg.distance?.value ?? 0,
            totalDurationSeconds: leg.duration?.value ?? 0,
          });
        }
      );
    } catch (err) {
      console.error('[GoogleMaps] DirectionsService error:', err);
      resolve(null);
    }
  });
}

/** Returns true if a Google Maps API key is configured */
export function hasGoogleMapsKey(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

/**
 * Checks if Google Street View is available at a specific latitude & longitude within a radius.
 */
export async function checkStreetViewAvailability(
  lat: number,
  lng: number,
  radiusMeters: number = 800
): Promise<{ available: boolean; panoId?: string; lat?: number; lng?: number }> {
  try {
    await loadGoogleMapsAPI();
    if (typeof google === 'undefined' || !google.maps?.StreetViewService) {
      return { available: false };
    }
    return new Promise((resolve) => {
      const svService = new google.maps.StreetViewService();
      svService.getPanorama(
        {
          location: new google.maps.LatLng(lat, lng),
          radius: radiusMeters,
          source: google.maps.StreetViewSource.OUTDOOR,
        },
        (data, status) => {
          if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
            resolve({
              available: true,
              panoId: data.location.pano,
              lat: data.location.latLng.lat(),
              lng: data.location.latLng.lng(),
            });
          } else {
            resolve({ available: false });
          }
        }
      );
    });
  } catch (e) {
    console.warn('[GoogleMaps] StreetView check failed:', e);
    return { available: false };
  }
}
