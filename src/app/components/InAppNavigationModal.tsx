import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Navigation,
  Volume2,
  VolumeX,
  Compass,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  CornerUpRight,
  CornerUpLeft,
  CheckCircle2,
  Car,
  Bike,
  Play,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Bus,
  ShieldCheck,
  DollarSign,
  Phone,
  Users,
  Info,
  ChevronRight,
} from 'lucide-react';
import type { MapMarker } from './MansalayMap';
import type { Map as LeafletMap, Polyline as LeafletPolyline } from 'leaflet';
import { getRouteWithFallback } from '../lib/api';
import { getAICommuteGuide, type AICommuteResult } from '../lib/geminiCommute';

// Essential companion phrases for commuters & foreign tourists
const COMMUTE_COMPANION_PHRASES = [
  {
    id: 'fare',
    icon: '🪙',
    tagalog: 'Magkano po hanggang doon?',
    english: 'How much is the fare to get there?',
    pronunciation: 'Mahg-KAH-noh poh hahng-gahng DOH-on?',
  },
  {
    id: 'drop',
    icon: '🛑',
    tagalog: 'Pakibaba po ako sa tabi.',
    english: 'Please drop me off by the side of the road.',
    pronunciation: 'Pah-kee-BAH-bah poh ah-KOH sah TAH-bee.',
  },
  {
    id: 'change',
    icon: '💵',
    tagalog: 'May barya po ba kayo sa limang daan (500)?',
    english: 'Do you have change for a 500 peso bill?',
    pronunciation: 'Mye bar-YAH poh bah kah-YOH sah lee-MAHNG dah-AHN?',
  },
  {
    id: 'stop',
    icon: '✋',
    tagalog: 'Para po! Dito na lang po.',
    english: 'Stop please! Right here.',
    pronunciation: 'PAH-rah poh! DEE-toh nah lahng poh.',
  },
];

interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  icon: 'straight' | 'right' | 'left' | 'uturn' | 'destination';
  roadName?: string;
  location?: [number, number];
}

interface InAppNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  startCoords: [number, number];
  destination: MapMarker;
  distanceKm: number;
  initialMode?: 'car' | 'bike' | 'transit';
}

// Smart distance formatter: shows metres under 1 km, kilometres above
function formatDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

// Distance helper between two lat/lng points in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Minimum distance from point to line segment in meters
function distanceToSegmentMeters(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (l2 === 0) return getDistanceMeters(px, py, ax, ay);
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * (bx - ax);
  const projY = ay + t * (by - ay);
  return getDistanceMeters(px, py, projX, projY);
}

// Generate authentic vehicle icons based on active navigation travel mode
function getVehicleIconHtml(mode: 'car' | 'bike' | 'transit', headingDeg?: number | null): string {
  const rot = typeof headingDeg === 'number' ? headingDeg : 0;

  if (mode === 'bike') {
    // Authentic Shopee / GrabExpress Delivery Motorcycle Rider (Top-Down View)
    return `
      <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:4px;background:#F43F5E;border-radius:50%;opacity:0.25;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.55));transform:rotate(${rot}deg);transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);">
          <!-- Headlight beam glow -->
          <path d="M20 7L13 0H35L28 7Z" fill="#FEF08A" fill-opacity="0.45"/>
          <!-- Front Wheel & Mudguard -->
          <rect x="22" y="2" width="4" height="9" rx="2" fill="#1F2937" stroke="#0F172A" stroke-width="0.8"/>
          <!-- Handlebars -->
          <path d="M14 12C18 10.5 30 10.5 34 12" stroke="#374151" stroke-width="3" stroke-linecap="round"/>
          <circle cx="13" cy="12" r="1.8" fill="#111827"/>
          <circle cx="35" cy="12" r="1.8" fill="#111827"/>
          <!-- Front Headlight bulb -->
          <ellipse cx="24" cy="8.5" rx="3.2" ry="1.8" fill="#FEF08A"/>
          <!-- Motorcycle Body Frame (Shopee Brand Coral/Rose) -->
          <rect x="21" y="11" width="6" height="26" rx="3" fill="#E11D48"/>
          <!-- Rider Arms -->
          <path d="M15 14L19 21" stroke="#BE123C" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M33 14L29 21" stroke="#BE123C" stroke-width="3.2" stroke-linecap="round"/>
          <!-- Rider Shoulders / Jacket -->
          <ellipse cx="24" cy="22" rx="7.8" ry="5.2" fill="#E11D48" stroke="#9F1239" stroke-width="1"/>
          <!-- Rider Helmet (Shopee Express Orange-Rose) -->
          <circle cx="24" cy="20" r="5.2" fill="#FB7185" stroke="#FFFFFF" stroke-width="1.6"/>
          <!-- Tinted Visor facing forward -->
          <path d="M21 17.5C22 16.5 26 16.5 27 17.5" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Shopee-style Insulated Delivery Box on back -->
          <rect x="17.5" y="28" width="13" height="13" rx="3" fill="#E11D48" stroke="#FFFFFF" stroke-width="1.3"/>
          <rect x="22" y="28" width="4" height="13" fill="#FFFFFF" fill-opacity="0.8"/>
          <circle cx="24" cy="34.5" r="1.8" fill="#9F1239"/>
          <!-- Rear Tail Light -->
          <rect x="22" y="42" width="4" height="2" rx="1" fill="#EF4444"/>
        </svg>
      </div>
    `;
  }

  if (mode === 'car') {
    // Top-down sleek Car / Sedan with headlights and roof
    return `
      <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:4px;background:#F43F5E;border-radius:50%;opacity:0.25;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.55));transform:rotate(${rot}deg);transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);">
          <!-- Headlight glow cones -->
          <path d="M15 6L8 0H40L33 6Z" fill="#FEF08A" fill-opacity="0.4"/>
          <!-- Wheels / Tires -->
          <rect x="9" y="8" width="3.5" height="8" rx="1.5" fill="#111827"/>
          <rect x="35.5" y="8" width="3.5" height="8" rx="1.5" fill="#111827"/>
          <rect x="9" y="32" width="3.5" height="8" rx="1.5" fill="#111827"/>
          <rect x="35.5" y="32" width="3.5" height="8" rx="1.5" fill="#111827"/>
          <!-- Car Body Outer (Brand Rose Red) -->
          <rect x="11" y="5" width="26" height="38" rx="6.5" fill="#E11D48" stroke="#FFFFFF" stroke-width="1.5"/>
          <!-- Front Windshield (Tinted glass) -->
          <path d="M14 16C14 13 34 13 34 16L32 21H16L14 16Z" fill="#1E293B" stroke="#0F172A" stroke-width="0.6"/>
          <!-- Car Roof -->
          <rect x="15" y="20" width="18" height="13" rx="2.5" fill="#BE123C"/>
          <!-- Rear Windshield -->
          <path d="M16 33H32L34 37C34 38 14 38 14 37L16 33Z" fill="#1E293B"/>
          <!-- Side Mirrors -->
          <rect x="7.5" y="16" width="3.5" height="2" rx="1" fill="#E11D48"/>
          <rect x="37" y="16" width="3.5" height="2" rx="1" fill="#E11D48"/>
          <!-- Headlights -->
          <rect x="13" y="5.2" width="4" height="2.5" rx="1" fill="#FEF08A"/>
          <rect x="31" y="5.2" width="4" height="2.5" rx="1" fill="#FEF08A"/>
          <!-- Rear Tail Lights -->
          <rect x="13" y="41.5" width="4" height="1.5" rx="0.5" fill="#EF4444"/>
          <rect x="31" y="41.5" width="4" height="1.5" rx="0.5" fill="#EF4444"/>
        </svg>
      </div>
    `;
  }

  // Default / transit: Authentic 3D Navigation Arrow with brand colors
  return `
    <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;background:#E11D48;border-radius:50%;opacity:0.25;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.45));transform:rotate(${rot}deg);transition:transform 0.25s ease;">
        <path d="M18 3L31 31L18 24L5 31L18 3Z" fill="#BE123C" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M18 7L27 27L18 22L9 27L18 7Z" fill="#E11D48"/>
        <circle cx="18" cy="18" r="2.5" fill="#FFFFFF"/>
      </svg>
    </div>
  `;
}

export function InAppNavigationModal({
  isOpen,
  onClose,
  startCoords,
  destination,
  distanceKm,
  initialMode,
}: InAppNavigationModalProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [travelMode, setTravelMode] = useState<'car' | 'bike' | 'transit'>(initialMode || 'car');
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [commuteLang, setCommuteLang] = useState<'tl' | 'en'>('tl');
  const [transitTab, setTransitTab] = useState<'itinerary' | 'card' | 'fares'>('itinerary');
  const [isCopiedDriverPhrase, setIsCopiedDriverPhrase] = useState(false);
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [isCharteredSpecial, setIsCharteredSpecial] = useState<boolean>(false);
  const [isFullscreenFlashcard, setIsFullscreenFlashcard] = useState<boolean>(false);
  const [activeDriverPhrase, setActiveDriverPhrase] = useState<string>('');
  const [isSpeakingPhrase, setIsSpeakingPhrase] = useState<boolean>(false);
  const [aiCommutePlan, setAiCommutePlan] = useState<AICommuteResult | null>(null);
  const [isLoadingAiCommute, setIsLoadingAiCommute] = useState(false);
  const [isNavigating, setIsNavigating] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [totalMins, setTotalMins] = useState(Math.max(1, Math.round(distanceKm * 2.5)));
  const [totalDistanceKm, setTotalDistanceKm] = useState(distanceKm);
  const [userPos, setUserPos] = useState<[number, number]>(startCoords);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(true);

  const handleSpeakPhrase = (text: string) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fil-PH';
      utterance.rate = 0.88;
      utterance.onstart = () => setIsSpeakingPhrase(true);
      utterance.onend = () => setIsSpeakingPhrase(false);
      utterance.onerror = () => setIsSpeakingPhrase(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopyPhrase = (text: string) => {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setIsCopiedDriverPhrase(true);
    setTimeout(() => setIsCopiedDriverPhrase(false), 2200);
  };

  const getDynamicFareDisplay = () => {
    if (!aiCommutePlan) return '₱0';
    if (isCharteredSpecial && aiCommutePlan.specialFare) {
      return aiCommutePlan.specialFare;
    }
    const sourceStr = aiCommutePlan.regularFare || aiCommutePlan.estimatedFare || '';
    const match = sourceStr.match(/₱?\s*(\d+)/);
    const baseNumber = match ? parseInt(match[1], 10) : 0;
    if (baseNumber > 0) {
      const total = baseNumber * passengerCount;
      return `₱${total} (${passengerCount} pax)`;
    }
    return aiCommutePlan.estimatedFare;
  };

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [routeSource, setRouteSource] = useState<'google' | 'mapbox' | 'osrm' | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const userMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<LeafletPolyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isFetchingRouteRef = useRef(false);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen && initialMode) {
      setTravelMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Fetch AI Commute Guide when transit mode is selected or language changes
  useEffect(() => {
    if (isOpen && travelMode === 'transit' && destination) {
      setIsLoadingAiCommute(true);
      getAICommuteGuide(
        userPos[0],
        userPos[1],
        destination.name,
        destination.location,
        destination.lat,
        destination.lng,
        commuteLang
      )
        .then((plan) => {
          if (plan) {
            setAiCommutePlan(plan);
            setActiveDriverPhrase(plan.driverPhrase);
          }
        })
        .finally(() => {
          setIsLoadingAiCommute(false);
        });
    }
  }, [isOpen, travelMode, destination, userPos, commuteLang]);

  // Map travel mode UI → Google Maps / Mapbox / OSRM profile string
  const getTravelModeStr = (mode: 'car' | 'bike' | 'transit'): 'DRIVING' | 'BICYCLING' => {
    if (mode === 'bike') return 'BICYCLING';
    return 'DRIVING';
  };

  // PH road speed correction: OSRM uses European speed profiles (~50-80 km/h).
  // Mansalay rural roads average 30-40 km/h — apply 1.35x multiplier for OSRM only.
  // Google Maps & Mapbox already incorporate local road geometry and speed calibration.
  const applySpeedCorrection = (durationSecs: number, source: 'google' | 'mapbox' | 'osrm') =>
    source === 'osrm' ? Math.round(durationSecs * 1.35) : durationSecs;

  // Fetch accurate road route — Google Maps first, OSRM fallback
  const fetchRoute = async (currentLat: number, currentLng: number, mode?: 'car' | 'bike' | 'transit') => {
    if (isFetchingRouteRef.current) return;
    isFetchingRouteRef.current = true;
    setIsRecalculating(true);
    try {
      const activeMode = mode ?? travelMode;
      const result = await getRouteWithFallback(
        currentLat,
        currentLng,
        destination.lat,
        destination.lng,
        getTravelModeStr(activeMode)
      );

      if (result) {
        setRouteGeometry(result.routeCoords);
        setTotalDistanceKm(Math.round((result.totalDistanceMeters / 1000) * 10) / 10);
        // Apply PH road correction for OSRM; Google Maps is already accurate
        const correctedSecs = applySpeedCorrection(result.totalDurationSeconds, result.source);
        setTotalMins(Math.max(1, Math.round(correctedSecs / 60)));
        setRouteSource(result.source);

        // Map unified steps into NavigationStep[] directly from routing engine
        const parsedSteps: NavigationStep[] = result.steps.map((s, idx) => {
          const isLast = idx === result.steps.length - 1;
          const instructionText = (isLast && destination?.name)
            ? `Arrive at ${destination.name}`
            : s.instruction;

          return {
            instruction: instructionText,
            distanceMeters: s.distanceMeters,
            icon: s.icon,
            roadName: s.roadName,
            location: s.location,
          };
        });

        setSteps(parsedSteps);
        setCurrentStepIdx(0);
        setIsOffRoute(false);
      }
    } catch (err) {
      console.error('Route fetch error:', err);
    } finally {
      isFetchingRouteRef.current = false;
      setIsRecalculating(false);
    }
  };

  // Initial Route Request (Google Maps → OSRM fallback)
  useEffect(() => {
    if (isOpen) {
      fetchRoute(startCoords[0], startCoords[1], travelMode);
    }
  }, [isOpen, startCoords, destination]);

  // Re-fetch when travel mode changes
  useEffect(() => {
    if (isOpen && startCoords) {
      fetchRoute(userPos[0], userPos[1], travelMode);
    }
  }, [travelMode]);

  // Continuous watchPosition during Navigation
  useEffect(() => {
    if (!isOpen || !isNavigating) return;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPos([lat, lng]);

          // Update heading if device GPS provides valid speed and bearing
          if (pos.coords.speed && pos.coords.speed > 0.4 && typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading)) {
            setUserHeading(Math.round(pos.coords.heading));
          }

          // Dynamically update currentStepIdx based on user's real GPS distance to step maneuvers
          if (steps && steps.length > 0) {
            for (let i = currentStepIdx; i < steps.length; i++) {
              const stp = steps[i];
              if (stp.location && stp.location[0] !== 0) {
                const distToStep = getDistanceMeters(lat, lng, stp.location[0], stp.location[1]);
                if (distToStep < 35 && i > currentStepIdx) {
                  setCurrentStepIdx(i);
                  speakInstruction(steps[i].instruction);
                  break;
                }
              }
            }
          }

          // Off-Route Check (Threshold: 40 meters)
          if (routeGeometry.length > 1) {
            let minDistance = Infinity;
            for (let i = 0; i < routeGeometry.length - 1; i++) {
              const segDist = distanceToSegmentMeters(
                lat, lng,
                routeGeometry[i][0], routeGeometry[i][1],
                routeGeometry[i + 1][0], routeGeometry[i + 1][1]
              );
              if (segDist < minDistance) minDistance = segDist;
            }

            if (minDistance > 40) {
              setIsOffRoute(true);
              // Auto-recalculate route from new position
              fetchRoute(lat, lng);
            }
          }
        },
        (err) => {
          // err.code === 3 is TIMEOUT - normal on laptops/indoors without dedicated GPS satellite hardware
          if (err.code !== 3) {
            console.warn('Navigation GPS watch error:', err.message);
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOpen, isNavigating, routeGeometry]);

  // Voice Speech Synthesis for turn-by-turn guidance
  const speakInstruction = (text: string) => {
    if (isVoiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore audio synthesis errors
    }
  };

  const openGoogleMapsApp = () => {
    const origin = `${userPos[0]},${userPos[1]}`;
    const dest = `${destination.lat},${destination.lng}`;
    const mode = travelMode === 'bike' ? 'two_wheeler' : 'driving';
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=${mode}`, '_blank');
  };

  const openWazeApp = () => {
    window.open(`https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`, '_blank');
  };

  // Announce step change
  useEffect(() => {
    if (isOpen && isNavigating && steps[currentStepIdx]) {
      speakInstruction(steps[currentStepIdx].instruction);
    }
  }, [isOpen, currentStepIdx, isNavigating, isVoiceMuted]);

  // Mount real Leaflet Map inside Modal
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: startCoords,
        zoom: 14,
        zoomControl: false,
        scrollWheelZoom: true,
      });

      mapRef.current = map;

      const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      });

      const googleHybridUrl = GOOGLE_MAPS_KEY
        ? `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`
        : 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      const googleHybridLayer = L.tileLayer(googleHybridUrl, {
        attribution: '© Google Maps Satellite',
        maxZoom: 20,
      });

      // Default to Google Satellite Hybrid for navigation realism
      googleHybridLayer.addTo(map);

      L.control.layers(
        {
          '🛰️ Satellite (Google)': googleHybridLayer,
          '🗺️ Standard Map': osmLayer,
        },
        undefined,
        { position: 'topright' }
      ).addTo(map);

      // Destination Marker — Authentic Google Maps Red Teardrop Pin
      const destIcon = L.divIcon({
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

      L.marker([destination.lat, destination.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>${destination.name}</b><br/>${destination.location || 'Destination'}`);

      // Dynamic heading calculation (from device GPS heading, or step target direction)
      const initialHeading = userHeading !== null ? userHeading : (() => {
        if (steps && steps[0] && steps[0].location && steps[0].location[0] !== 0) {
          const target = steps[0].location;
          const dLng = (target[1] - startCoords[1]) * (Math.PI / 180);
          const lat1 = startCoords[0] * (Math.PI / 180);
          const lat2 = target[0] * (Math.PI / 180);
          const y = Math.sin(dLng) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
          return Math.round((Math.atan2(y, x) * (180 / Math.PI) + 360) % 360);
        }
        return 0;
      })();

      // User Live Position Marker — Dynamic Vehicle Icon (Car or Shopee Motorcycle)
      const userIcon = L.divIcon({
        html: getVehicleIconHtml(travelMode, initialHeading),
        className: '',
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });

      userMarkerRef.current = L.marker(startCoords, { icon: userIcon }).addTo(map);

      // Focus directly on the tourist's live position at street-level navigation view
      map.setView(startCoords, 17, { animate: true });

      // If user drags the map, temporarily disable auto-follow so they can inspect the route freely
      map.on('dragstart', () => {
        setIsFollowingUser(false);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen]);

  // Update map polyline and user position marker dynamically when userPos or routeGeometry updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      // Dynamic heading calculation (from device GPS heading, or next step direction)
      const currentHeading = userHeading !== null ? userHeading : (() => {
        if (steps && steps[currentStepIdx] && steps[currentStepIdx].location && steps[currentStepIdx].location[0] !== 0) {
          const target = steps[currentStepIdx].location;
          const dLng = (target[1] - userPos[1]) * (Math.PI / 180);
          const lat1 = userPos[0] * (Math.PI / 180);
          const lat2 = target[0] * (Math.PI / 180);
          const y = Math.sin(dLng) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
          return Math.round((Math.atan2(y, x) * (180 / Math.PI) + 360) % 360);
        }
        return 0;
      })();

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userPos);
        const userIcon = L.divIcon({
          html: getVehicleIconHtml(travelMode, currentHeading),
          className: '',
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        });
        userMarkerRef.current.setIcon(userIcon);
      }

      // Smooth camera follow to keep tourist focused
      if (isFollowingUser) {
        map.panTo(userPos, { animate: true });
      }

      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }

      if (routeGeometry.length > 0) {
        routeLineRef.current = L.polyline(routeGeometry, {
          color: '#F43F5E',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }
    });
  }, [userPos, routeGeometry, isFollowingUser, travelMode, userHeading, currentStepIdx, steps]);

  // Calculate remaining road distance from remaining steps (decreases as user advances)
  const remainingSteps = steps.slice(currentStepIdx);
  const remainingDistMeters = remainingSteps.reduce((sum, s) => sum + s.distanceMeters, 0);
  const totalRouteMeters = Math.max(1, totalDistanceKm * 1000);
  // Remaining time = proportion of remaining road distance × total trip time
  const remainingMins = remainingDistMeters > 0
    ? Math.max(1, Math.round((remainingDistMeters / totalRouteMeters) * totalMins))
    : totalMins;

  // ETA = now + remaining minutes (updates live as steps advance)
  const now = new Date();
  const etaTime = new Date(now.getTime() + remainingMins * 60000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Straight-line distance to destination (used for progress bar only)
  const remainingDistanceMeters = getDistanceMeters(userPos[0], userPos[1], destination.lat, destination.lng);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalRouteMeters - remainingDistMeters) / totalRouteMeters) * 100))
  );

  const defaultStep: NavigationStep = {
    instruction: `Head towards ${destination?.name || 'Mansalay Destination'}`,
    distanceMeters: Math.round((distanceKm * 1000) * 0.2),
    icon: 'straight',
  };

  const currentStep = (steps && steps.length > 0 && steps[currentStepIdx]) ? steps[currentStepIdx] : (steps && steps[0] ? steps[0] : defaultStep);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col w-full max-w-5xl h-[92vh] relative">
        
        {/* Top Live Navigation HUD Banner */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white p-4 sm:p-5 flex items-center justify-between shadow-xl z-20">
          <div className="flex items-center gap-3.5">
            {/* Maneuver Arrow Icon */}
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
              {currentStep.icon === 'right' && <CornerUpRight className="h-7 w-7 stroke-[2.5]" />}
              {currentStep.icon === 'left' && <CornerUpLeft className="h-7 w-7 stroke-[2.5]" />}
              {currentStep.icon === 'uturn' && <RotateCcw className="h-7 w-7 stroke-[2.5]" />}
              {currentStep.icon === 'straight' && <ArrowRight className="h-7 w-7 -rotate-90 stroke-[2.5]" />}
              {currentStep.icon === 'destination' && <CheckCircle2 className="h-7 w-7 text-pink-200" />}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-pink-100 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-pink-200 animate-ping"></span>
                <span>Live GPS Navigation Mode</span>
                {routeSource && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                    routeSource === 'google'
                      ? 'bg-blue-500/30 text-blue-200 border-blue-400/30'
                      : routeSource === 'mapbox'
                      ? 'bg-purple-500/30 text-purple-200 border-purple-400/30'
                      : 'bg-white/10 text-pink-100 border-white/20'
                  }`}>
                    {routeSource === 'google' ? '🗺 Google Maps' : routeSource === 'mapbox' ? '🗺 Mapbox Navigation' : 'OSRM'}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight line-clamp-1">
                {currentStep.instruction}
              </h2>
              {/* Dynamic countdown to next turn maneuver */}
              {(() => {
                const liveMeters = (currentStep.location && currentStep.location[0] !== 0)
                  ? Math.round(getDistanceMeters(userPos[0], userPos[1], currentStep.location[0], currentStep.location[1]))
                  : currentStep.distanceMeters;
                return (
                  <p className="text-xs text-pink-100/90 font-medium">
                    In {formatDist(liveMeters > 0 ? liveMeters : currentStep.distanceMeters)}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVoiceMuted(!isVoiceMuted)}
              className="w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              title={isVoiceMuted ? 'Unmute Voice Guidance' : 'Mute Voice Guidance'}
            >
              {isVoiceMuted ? <VolumeX className="h-5 w-5 text-red-300" /> : <Volume2 className="h-5 w-5 text-pink-100" />}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
              title="Exit Navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 h-1.5 z-20">
          <div
            className="bg-gradient-to-r from-pink-500 to-rose-500 h-1.5 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Navigation Body: Real Map Canvas & Turn-by-Turn Panel */}
        <div className="relative flex-1 bg-gray-900 overflow-hidden flex flex-col md:flex-row">
          
          {/* Real Leaflet Map Canvas Column */}
          <div className="flex-1 relative w-full h-full min-h-[300px]">
            {/* Live Leaflet Map Render Div */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Destination Floating Pill Badge */}
            <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md border border-white/15 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl z-10 pointer-events-none">
              <MapPin className="h-4 w-4 text-pink-400" />
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Destination</p>
                <p className="text-xs font-bold text-white">{destination.name}</p>
              </div>
            </div>

            {/* Travel Mode Selector Floating Pills */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-xl z-10 flex-wrap">
              <button
                onClick={() => setTravelMode('car')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  travelMode === 'car' ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                <span>Car/Trike</span>
              </button>
              <button
                onClick={() => setTravelMode('bike')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  travelMode === 'bike' ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bike className="h-3.5 w-3.5" />
                <span>Motorcycle</span>
              </button>
              <button
                onClick={() => setTravelMode('transit')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  travelMode === 'transit'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25 ring-1 ring-white/30'
                    : 'text-pink-300 hover:text-white bg-pink-950/40 border border-pink-500/30'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-pink-200 animate-pulse" />
                <span>AI Commute</span>
              </button>
            </div>

            {/* Floating GPS Camera Focus & Overview Controls */}
            <div className="absolute top-4 right-14 z-10 flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsFollowingUser(true);
                  if (mapRef.current) {
                    mapRef.current.setView(userPos, 17, { animate: true });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md border transition-all flex items-center gap-1.5 text-xs font-bold ${
                  isFollowingUser
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-pink-900/50 ring-2 ring-pink-300/40'
                    : 'bg-black/80 text-gray-200 border-white/20 hover:bg-black'
                }`}
                title="Focus map on tourist's live position"
              >
                <Navigation className="h-3.5 w-3.5 text-white" />
                <span>{isFollowingUser ? 'Following' : 'Focus Me'}</span>
              </button>

              <button
                onClick={() => {
                  setIsFollowingUser(false);
                  if (mapRef.current && routeGeometry.length > 0) {
                    import('leaflet').then((L) => {
                      if (mapRef.current) {
                        mapRef.current.fitBounds(L.latLngBounds(routeGeometry), { padding: [40, 40] });
                      }
                    });
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-black/80 hover:bg-black text-gray-200 border border-white/20 shadow-lg backdrop-blur-md transition-all flex items-center justify-center gap-1 text-xs font-semibold"
                title="Show Entire Route Overview"
              >
                <Compass className="h-3.5 w-3.5 text-pink-400" />
                <span>Overview</span>
              </button>
            </div>
          </div>

          {/* Right Column: Step-by-Step Directions List OR AI Commute Guide */}
          <div className="w-full md:w-[420px] lg:w-[460px] bg-gray-950/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/10 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto transition-all duration-300">
            <div>
              {travelMode === 'transit' ? (
                <div className="space-y-3.5">
                  {/* Executive Header with Bilingual Toggle & Live Refresh */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            {commuteLang === 'en' ? 'Smart Transit AI' : 'AI Commute Engine'}
                          </h4>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">
                            Mindoro LGU
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400">
                          {commuteLang === 'en' ? 'Official Transit & Tariff Guide' : 'Opisyal na Gabay sa Byahe at Pamasahe'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Language Switcher Toggle */}
                      <div className="flex items-center bg-black/80 p-0.5 rounded-xl border border-white/10 text-[10px]">
                        <button
                          onClick={() => setCommuteLang('tl')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            commuteLang === 'tl'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="Tagalog version"
                        >
                          🇵🇭 TL
                        </button>
                        <button
                          onClick={() => setCommuteLang('en')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            commuteLang === 'en'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title="English version for foreign tourists"
                        >
                          🌐 EN
                        </button>
                      </div>

                      {/* Re-analyze Button */}
                      <button
                        onClick={() => {
                          setIsLoadingAiCommute(true);
                          getAICommuteGuide(
                            userPos[0],
                            userPos[1],
                            destination.name,
                            destination.location,
                            destination.lat,
                            destination.lng,
                            commuteLang
                          ).then((plan) => {
                            if (plan) {
                              setAiCommutePlan(plan);
                              setActiveDriverPhrase(plan.driverPhrase);
                            }
                          }).finally(() => {
                            setIsLoadingAiCommute(false);
                          });
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all"
                        title={commuteLang === 'en' ? 'Recalculate Route' : 'Suriing muli'}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAiCommute ? 'animate-spin text-pink-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isLoadingAiCommute ? (
                    <div className="py-12 px-4 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-3 animate-bounce shadow-lg shadow-pink-500/30">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-white mb-1">
                        {commuteLang === 'en' ? 'Calculating Inter-Town Transit...' : 'Sinusuri ang Network ng Sasakyan...'}
                      </p>
                      <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs mx-auto">
                        {commuteLang === 'en'
                          ? `Resolving GPS coordinates, highway vans, TODA tricycles, and LGU fare tariffs to ${destination.name}.`
                          : `Kinakalkula ang tamang sakayan, sasakyan, pamasahe, at oras patungong ${destination.name}.`}
                      </p>
                    </div>
                  ) : aiCommutePlan ? (
                    <div className="space-y-3.5 text-left">
                      {/* Executive Digital Boarding Pass Ticket */}
                      <div className="relative overflow-hidden p-3.5 bg-gradient-to-br from-gray-900/95 via-purple-950/40 to-gray-900/95 border border-purple-500/30 rounded-2xl shadow-2xl space-y-3">
                        {/* Ticket Perforations Aesthetic */}
                        <div className="flex items-center justify-between text-[9px] font-mono text-purple-300 uppercase tracking-widest border-b border-white/10 pb-2">
                          <span className="flex items-center gap-1 font-bold">
                            <Compass className="h-3 w-3 text-pink-400" />
                            <span>{commuteLang === 'en' ? 'TRANSIT BOARDING PASS' : 'TIKETA SA PAGBIYAHE'}</span>
                          </span>
                          <span className="text-gray-400">
                            {aiCommutePlan.isNightTrip ? '🌙 NIGHT TRIP' : '☀️ DAY TRIP'}
                          </span>
                        </div>

                        {/* Origin -> Destination Visual Flow */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0 ring-4 ring-emerald-500/20" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] text-gray-400 uppercase font-semibold">
                                {commuteLang === 'en' ? 'Origin (Current Location)' : 'Pinanggalingan (Nasaang Lugar)'}
                              </p>
                              <p className="text-xs font-bold text-white truncate">{aiCommutePlan.currentBarangay}</p>
                            </div>
                          </div>

                          <div className="pl-1 border-l-2 border-dashed border-white/20 ml-1 py-0.5 text-[9px] text-pink-300 font-bold flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <ArrowRight className="h-2.5 w-2.5" />
                              <span>
                                {aiCommutePlan.distanceKm !== undefined ? `${aiCommutePlan.distanceKm.toFixed(1)} km` : ''}{' '}
                                {aiCommutePlan.isLongDistance 
                                  ? (commuteLang === 'en' ? '• Nautical Highway Corridor' : '• Nautical Highway Corridor') 
                                  : (commuteLang === 'en' ? '• Local Feeder Route' : '• Lokal na Byahe')}
                              </span>
                            </div>
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-normal">
                              {aiCommutePlan.vehicleType}
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0 ring-4 ring-rose-500/20" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] text-gray-400 uppercase font-semibold">
                                {commuteLang === 'en' ? 'Destination' : 'Destinasyon'}
                              </p>
                              <p className="text-xs font-bold text-white truncate">{destination.name}</p>
                            </div>
                          </div>
                        </div>

                        {/* Departure -> Arrival ETA Schedule Bar */}
                        <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-dashed border-white/15 text-center">
                          <div className="p-1.5 bg-black/50 rounded-xl border border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">
                              {commuteLang === 'en' ? 'Departure' : 'Alis'}
                            </p>
                            <p className="text-[11px] font-black text-gray-200 mt-0.5">
                              {aiCommutePlan.departureTime}
                            </p>
                          </div>
                          <div className="p-1.5 bg-black/50 rounded-xl border border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">
                              {commuteLang === 'en' ? 'Est. Duration' : 'Tagal ng Byahe'}
                            </p>
                            <p className="text-[11px] font-black text-white mt-0.5">
                              {aiCommutePlan.estimatedTime}
                            </p>
                          </div>
                          <div className="p-1.5 bg-black/50 rounded-xl border border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-cyan-400 font-bold">
                              {commuteLang === 'en' ? 'Arrival ETA' : 'Oras Dating'}
                            </p>
                            <p className="text-[11px] font-black text-cyan-300 mt-0.5">
                              {aiCommutePlan.estimatedArrivalClockTime || 'Calculated'}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Passenger & Fare Sub-bar */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                          {/* Passenger Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400 font-semibold uppercase flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5 text-pink-400" />
                              <span>{commuteLang === 'en' ? 'Pax:' : 'Tao:'}</span>
                            </span>
                            <div className="flex items-center bg-black/60 border border-white/10 rounded-lg text-[10px]">
                              <button
                                onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                                className="px-2 py-0.5 text-gray-300 hover:text-white transition-colors"
                              >
                                -
                              </button>
                              <span className="px-1.5 font-black text-white">{passengerCount}</span>
                              <button
                                onClick={() => setPassengerCount(Math.min(6, passengerCount + 1))}
                                className="px-2 py-0.5 text-gray-300 hover:text-white transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Fare Output */}
                          <div className="text-right">
                            <p className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold">
                              {commuteLang === 'en' ? 'Estimated Total Fare' : 'Tinatayang Pamasahe'}
                            </p>
                            <p className="text-xs font-black text-emerald-300">
                              {getDynamicFareDisplay()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Sub-Tabs Segmented Control */}
                      <div className="grid grid-cols-3 gap-1 bg-gray-900/90 p-1 rounded-xl border border-white/10 text-[10px] font-bold">
                        <button
                          onClick={() => setTransitTab('itinerary')}
                          className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                            transitTab === 'itinerary'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Navigation className="h-3 w-3" />
                          <span>{commuteLang === 'en' ? 'Itinerary' : 'Ruta'}</span>
                        </button>
                        <button
                          onClick={() => setTransitTab('card')}
                          className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                            transitTab === 'card'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{commuteLang === 'en' ? 'Driver Card' : 'Ipakita'}</span>
                        </button>
                        <button
                          onClick={() => setTransitTab('fares')}
                          className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                            transitTab === 'fares'
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          <span>{commuteLang === 'en' ? 'Fares & Info' : 'Pamasahe'}</span>
                        </button>
                      </div>

                      {/* TAB 1: ITINERARY (METRO-STYLE CONNECTED TRANSIT LINE) */}
                      {transitTab === 'itinerary' && (
                        <div className="space-y-3 animate-fadeIn">
                          {/* Recommended Vehicle Banner */}
                          {aiCommutePlan.recommendedVehicle && (
                            <div className="p-2.5 bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/30 rounded-xl flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-pink-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[8px] uppercase tracking-wider font-bold text-pink-300">
                                  {commuteLang === 'en' ? 'Optimal Vehicle Recommendation' : 'Pinaka-Rekomendadong Sakyan'}
                                </p>
                                <p className="text-xs font-bold text-white truncate">{aiCommutePlan.recommendedVehicle}</p>
                              </div>
                            </div>
                          )}

                          {/* Metro Connected Timeline */}
                          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 via-amber-400 to-rose-500">
                            
                            {/* Stop 1: Boarding */}
                            <div className="relative">
                              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-950 shadow-md ring-2 ring-emerald-400/30 flex items-center justify-center text-[7px] font-black text-white">
                                1
                              </div>
                              <div className="p-2.5 bg-gray-900/90 border border-white/10 rounded-xl">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                    {commuteLang === 'en' ? 'Boarding Stop' : 'Saan Sasakay'}
                                  </span>
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold">
                                    {aiCommutePlan.vehicleType}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-white">{aiCommutePlan.boardingPoint}</p>
                              </div>
                            </div>

                            {/* Stop 2: Transfer Junction (if applicable) */}
                            {aiCommutePlan.transferPoint && 
                             !aiCommutePlan.transferPoint.toLowerCase().includes('direct') && 
                             !aiCommutePlan.transferPoint.toLowerCase().includes('wala') && (
                              <div className="relative">
                                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-gray-950 shadow-md ring-2 ring-amber-400/30 flex items-center justify-center text-[7px] font-black text-white">
                                  2
                                </div>
                                <div className="p-2.5 bg-gray-900/90 border border-white/10 rounded-xl">
                                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                                    {commuteLang === 'en' ? 'Transfer Junction' : 'Lilipat / Kanto Junction'}
                                  </span>
                                  <p className="text-xs font-bold text-white">{aiCommutePlan.transferPoint}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {commuteLang === 'en' 
                                      ? 'Disembark here to switch to a connecting local ride.' 
                                      : 'Bumaba rito upang lumipat sa lokal na sasakyan.'}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Stop 3: Final Arrival */}
                            <div className="relative">
                              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-gray-950 shadow-md ring-2 ring-rose-400/30 flex items-center justify-center text-[7px] font-black text-white">
                                🏁
                              </div>
                              <div className="p-2.5 bg-gray-900/90 border border-white/10 rounded-xl">
                                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                                  {commuteLang === 'en' ? 'Final Drop-Off' : 'Huling Babaan'}
                                </span>
                                <p className="text-xs font-bold text-white">{aiCommutePlan.dropoffPoint}</p>
                              </div>
                            </div>
                          </div>

                          {/* Step-by-Step Breakdown Accordion */}
                          {aiCommutePlan.steps && aiCommutePlan.steps.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                {commuteLang === 'en' ? 'Step-by-Step Instructions' : 'Hakbang-hakbang na Gabay'}
                              </p>
                              {aiCommutePlan.steps.map((s, idx) => (
                                <div key={idx} className="p-2.5 bg-black/40 border border-white/10 rounded-xl space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-pink-300">
                                      {s.title}
                                    </span>
                                    {s.vehicle && (
                                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                                        {s.vehicle}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-200 leading-relaxed">{s.details}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Summary Note */}
                          <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl">
                            <p className="text-[11px] text-gray-300 leading-relaxed">
                              {aiCommutePlan.summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: SHOW TO DRIVER FLASHCARD */}
                      {transitTab === 'card' && (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="p-4 bg-gradient-to-br from-blue-950/90 via-indigo-950/80 to-gray-900 border-2 border-blue-500/40 rounded-2xl shadow-2xl space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-[9px] font-extrabold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                                <span>💬</span>
                                <span>{commuteLang === 'en' ? 'Passenger Flashcard' : 'Ipakita kay Manong Driver'}</span>
                              </span>
                              <button
                                onClick={() => setIsFullscreenFlashcard(true)}
                                className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 border border-blue-400/40 font-bold transition-colors flex items-center gap-1"
                                title="Enlarge for showing driver"
                              >
                                <span>⛶</span>
                                <span>{commuteLang === 'en' ? 'Fullscreen' : 'Palakihin'}</span>
                              </button>
                            </div>

                            {/* Huge Readable Destination Phrase */}
                            <div className="p-3.5 bg-black/70 rounded-xl border border-white/15 text-center">
                              <p className="text-base font-black text-white tracking-wide leading-relaxed">
                                "{activeDriverPhrase || aiCommutePlan.driverPhrase}"
                              </p>
                            </div>

                            {/* Pronunciation & Meaning for foreign tourists */}
                            {aiCommutePlan.driverPhrasePronunciation && (
                              <div className="p-2 bg-blue-950/50 rounded-lg border border-blue-500/20 text-[10px] space-y-1">
                                <p className="text-blue-200">
                                  <span className="font-bold">🗣️ {commuteLang === 'en' ? 'How to Pronounce:' : 'Bigkas:'}</span>{' '}
                                  <span className="italic">{aiCommutePlan.driverPhrasePronunciation}</span>
                                </p>
                                {aiCommutePlan.driverPhraseEnglish && (
                                  <p className="text-gray-300">
                                    <span className="font-bold">🇬🇧 Meaning:</span> "{aiCommutePlan.driverPhraseEnglish}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Interactive Actions: Play Voice Audio & Copy */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                onClick={() => handleSpeakPhrase(activeDriverPhrase || aiCommutePlan.driverPhrase)}
                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                                  isSpeakingPhrase 
                                    ? 'bg-emerald-600 text-white animate-pulse' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                              >
                                <Volume2 className={`h-3.5 w-3.5 ${isSpeakingPhrase ? 'animate-bounce' : ''}`} />
                                <span>{isSpeakingPhrase ? (commuteLang === 'en' ? 'Speaking...' : 'Nagsasalita...') : (commuteLang === 'en' ? 'Play Voice' : 'Pakinggan')}</span>
                              </button>
                              <button
                                onClick={() => handleCopyPhrase(activeDriverPhrase || aiCommutePlan.driverPhrase)}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all border border-white/15 active:scale-95"
                              >
                                {isCopiedDriverPhrase ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">{commuteLang === 'en' ? 'Copied!' : 'Nakopya!'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>{commuteLang === 'en' ? 'Copy Text' : 'Kopyahin'}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-[9px] text-gray-400 text-center italic">
                              {commuteLang === 'en'
                                ? 'Flash your smartphone screen to the driver in noisy terminals or roadside stops.'
                                : 'Ipakita ang screen na ito sa driver para mas mabilis kayong magkaintindihan.'}
                            </p>
                          </div>

                          {/* Quick Companion Phrases Carousel / Chips */}
                          <div className="p-3 bg-gray-900/90 border border-white/10 rounded-2xl space-y-2">
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                              <span>{commuteLang === 'en' ? 'Quick Passenger Phrases:' : 'Mabilisang Salita sa Byahe:'}</span>
                              <span className="text-[8px] text-pink-400 font-semibold">{commuteLang === 'en' ? 'Tap to Speak' : 'Pindutin para marinig'}</span>
                            </p>
                            <div className="grid grid-cols-1 gap-1.5">
                              {COMMUTE_COMPANION_PHRASES.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setActiveDriverPhrase(item.tagalog);
                                    handleSpeakPhrase(item.tagalog);
                                  }}
                                  className="text-left p-2 rounded-xl bg-black/40 hover:bg-blue-950/60 border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-white group-hover:text-blue-200 truncate">
                                      {item.icon} "{item.tagalog}"
                                    </p>
                                    <p className="text-[9px] text-gray-400 truncate">
                                      {commuteLang === 'en' ? item.english : item.pronunciation}
                                    </p>
                                  </div>
                                  <Volume2 className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-400 flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: FARES & TRANSPORT MATRIX */}
                      {transitTab === 'fares' && (
                        <div className="space-y-3 animate-fadeIn">
                          {/* Night Commute Notice Banner (If Night) */}
                          {aiCommutePlan.isNightTrip && aiCommutePlan.nightCommuteAdvisory && (
                            <div className="p-2.5 bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-blue-950/90 border border-indigo-500/40 rounded-xl space-y-1 shadow-md shadow-indigo-950/50">
                              <div className="flex items-center gap-1.5 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider">
                                <span>🌙</span>
                                <span>{commuteLang === 'en' ? 'Night Transit Advisory' : 'Paalala sa Panggabing Byahe'}</span>
                              </div>
                              <p className="text-[10px] text-indigo-100 leading-relaxed font-medium">
                                {aiCommutePlan.nightCommuteAdvisory}
                              </p>
                            </div>
                          )}

                          {/* Oriental Mindoro Fare Matrix Card */}
                          <div className="p-3 bg-gray-900/90 border border-white/10 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="text-[10px] font-extrabold text-pink-300 uppercase tracking-wider flex items-center gap-1">
                                <span>🪙</span>
                                <span>{commuteLang === 'en' ? 'Official Mindoro Fare Standards' : 'Singilan Dine sa Oriental Mindoro'}</span>
                              </span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-500/30">
                                LTFRB & MTFRB
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {aiCommutePlan.regularFare && (
                                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                                  <p className="text-[8px] text-gray-400 uppercase font-semibold">
                                    {commuteLang === 'en' ? 'Regular Passenger Fare' : 'Regular na Pasahe'}
                                  </p>
                                  <p className="text-xs font-black text-pink-400 mt-0.5">{aiCommutePlan.regularFare}</p>
                                </div>
                              )}
                              {aiCommutePlan.specialFare && (
                                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                                  <p className="text-[8px] text-gray-400 uppercase font-semibold">
                                    {commuteLang === 'en' ? 'Special / Chartered Trip' : 'Special / Pakyaw na Byahe'}
                                  </p>
                                  <p className="text-xs font-black text-amber-300 mt-0.5">{aiCommutePlan.specialFare}</p>
                                </div>
                              )}
                            </div>

                            {/* Statutory 20% Discount Notice */}
                            <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] text-gray-300 flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                              <span>
                                {commuteLang === 'en'
                                  ? '20% Statutory Discount applies to Senior Citizens, PWDs, and Students with valid IDs (RA 9994 / RA 10905).'
                                  : 'May 20% Diskwento ang Senior Citizens, PWDs, at Estudyante alinsunod sa batas (RA 9994 / RA 10905).'}
                              </span>
                            </div>

                            {aiCommutePlan.fareNotes && (
                              <p className="text-[10px] text-gray-300 bg-black/30 p-2 rounded-lg border border-white/5">
                                📌 <span className="italic">{aiCommutePlan.fareNotes}</span>
                              </p>
                            )}
                          </div>

                          {/* Available Vehicles in Area */}
                          {aiCommutePlan.availableVehiclesInArea && aiCommutePlan.availableVehiclesInArea.length > 0 && (
                            <div className="p-3 bg-gray-900/90 border border-white/10 rounded-2xl space-y-2">
                              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                                <span>🛵</span>
                                <span>{commuteLang === 'en' ? 'Available Vehicles in Area:' : 'Mga Sasakyan sa Lugar:'}</span>
                              </p>
                              <div className="space-y-1.5">
                                {aiCommutePlan.availableVehiclesInArea.map((v, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded-xl border border-white/5 flex flex-col gap-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-pink-400">• {v.vehicle}</span>
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-500/30">
                                        {v.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-snug">{v.availabilityNotes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Emergency & Assistance Hotlines */}
                          <div className="p-3 bg-gray-900/90 border border-white/10 rounded-2xl space-y-2">
                            <p className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
                              <Phone className="h-3 w-3 text-rose-400" />
                              <span>{commuteLang === 'en' ? 'Mansalay Assistance & Safety:' : 'Tulong at Emergency Hotline:'}</span>
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <a
                                href="tel:09985986080"
                                className="p-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 rounded-xl text-rose-200 transition-colors flex flex-col"
                              >
                                <span className="font-bold">🚔 PNP Mansalay</span>
                                <span className="text-[9px] text-gray-400">0998-598-6080</span>
                              </a>
                              <a
                                href="tel:09178046282"
                                className="p-2 bg-orange-950/40 hover:bg-orange-900/50 border border-orange-500/30 rounded-xl text-orange-200 transition-colors flex flex-col"
                              >
                                <span className="font-bold">🚑 MDRRMO Rescue</span>
                                <span className="text-[9px] text-gray-400">0917-804-6282</span>
                              </a>
                            </div>
                          </div>

                          {/* Practical Traveler Tips */}
                          {aiCommutePlan.tips && aiCommutePlan.tips.length > 0 && (
                            <div className="p-2.5 bg-gray-900/60 rounded-xl border border-white/5 space-y-1">
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                {commuteLang === 'en' ? '💡 Practical Commuter Tips' : '💡 Mga Paalala sa Biyahe'}
                              </p>
                              {aiCommutePlan.tips.map((tip, i) => {
                                const tipText = typeof tip === 'object' && (tip as any).tipText ? `${(tip as any).tipTitle ? (tip as any).tipTitle + ': ' : ''}${(tip as any).tipText}` : String(tip);
                                return (
                                  <p key={i} className="text-[10px] text-gray-300 flex items-start gap-1">
                                    <span className="text-pink-400">•</span>
                                    <span>{tipText}</span>
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400 bg-white/[0.02] rounded-2xl border border-white/5">
                      <p>{commuteLang === 'en' ? 'No transit route retrieved. Click refresh.' : 'Walang nakuhang transit route. Pindutin ang refresh.'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="h-4 w-4 text-pink-400" />
                      <span>Live Turn-by-Turn Steps</span>
                    </h4>
                    <span className="text-xs font-semibold text-pink-400">
                      {currentStepIdx + 1} / {steps.length}
                    </span>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentStepIdx(idx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          idx === currentStepIdx
                            ? 'bg-pink-950/60 border-pink-500/60 text-white ring-1 ring-pink-500/30'
                            : idx < currentStepIdx
                            ? 'bg-gray-900/40 border-gray-800 text-gray-500'
                            : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-850'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            idx === currentStepIdx
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-sm'
                              : idx < currentStepIdx
                              ? 'bg-gray-800 text-gray-500'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold leading-snug">{step.instruction}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatDist(step.distanceMeters)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-gray-800 mt-4 space-y-2">
              <button
                onClick={() => {
                  setCurrentStepIdx(0);
                  setIsNavigating(true);
                }}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart Navigation</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={openGoogleMapsApp}
                  className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                  title="Open route in Google Maps app"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                  <span>Google Maps</span>
                </button>
                <button
                  onClick={openWazeApp}
                  className="py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                  title="Open destination in Waze app"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Waze App</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom ETA Dock Bar */}
        <div className="bg-gray-900 border-t border-white/10 p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">
                {travelMode === 'transit' && aiCommutePlan ? (commuteLang === 'en' ? 'Transit Duration' : 'Tagal ng Byahe') : 'Est. Travel Time'}
              </p>
              <p className="text-xl font-extrabold text-pink-400">
                {travelMode === 'transit' && aiCommutePlan
                  ? aiCommutePlan.estimatedTime
                  : `${remainingMins} min${remainingMins !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="h-8 w-px bg-gray-800" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Distance</p>
              <p className="text-sm font-bold text-white">
                {travelMode === 'transit' && aiCommutePlan && aiCommutePlan.distanceKm !== undefined
                  ? `${aiCommutePlan.distanceKm.toFixed(1)} km`
                  : `${totalDistanceKm} km`}
              </p>
            </div>
            <div className="h-8 w-px bg-gray-800" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">
                {travelMode === 'transit' && aiCommutePlan ? (commuteLang === 'en' ? 'Arrival ETA' : 'Oras Dating') : 'ETA Arrival'}
              </p>
              <p className="text-sm font-bold text-white">
                {travelMode === 'transit' && aiCommutePlan && aiCommutePlan.estimatedArrivalClockTime
                  ? aiCommutePlan.estimatedArrivalClockTime
                  : etaTime}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
          >
            End Navigation
          </button>
        </div>
      </div>

      {/* Fullscreen Driver Flashcard Modal for Terminal & Street Communication */}
      {isFullscreenFlashcard && aiCommutePlan && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-10 animate-fadeIn">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  {commuteLang === 'en' ? 'Passenger Card (Show to Driver)' : 'Ipakita sa Driver'}
                </h3>
                <p className="text-xs text-gray-400">
                  {commuteLang === 'en' ? 'Hold up your phone towards the driver' : 'Itapat ang screen sa tsuper o konduktor'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreenFlashcard(false)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Close Fullscreen"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Giant Center Display */}
          <div className="my-auto py-8 text-center space-y-6 max-w-2xl mx-auto w-full">
            <div className="p-6 sm:p-10 bg-gradient-to-br from-blue-950/70 to-black border-2 border-blue-500/50 rounded-3xl shadow-2xl space-y-4">
              <p className="text-xs font-mono uppercase tracking-widest text-blue-300 font-bold">
                🇵🇭 TAGALOG PHRASE:
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wide leading-relaxed">
                "{activeDriverPhrase || aiCommutePlan.driverPhrase}"
              </h2>

              {aiCommutePlan.driverPhrasePronunciation && (
                <div className="pt-2 border-t border-white/10 text-xs sm:text-sm text-blue-200">
                  <span className="font-bold">🗣️ Pronunciation: </span>
                  <span className="italic">{aiCommutePlan.driverPhrasePronunciation}</span>
                </div>
              )}

              {aiCommutePlan.driverPhraseEnglish && (
                <p className="text-xs sm:text-sm text-gray-300">
                  <span className="font-bold">🇬🇧 English: </span>
                  "{aiCommutePlan.driverPhraseEnglish}"
                </p>
              )}
            </div>

            {/* Giant Audio Playback */}
            <button
              onClick={() => handleSpeakPhrase(activeDriverPhrase || aiCommutePlan.driverPhrase)}
              className={`w-full py-4 px-6 rounded-2xl text-base font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                isSpeakingPhrase
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/30 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Volume2 className={`h-6 w-6 ${isSpeakingPhrase ? 'animate-bounce' : ''}`} />
              <span>
                {isSpeakingPhrase
                  ? (commuteLang === 'en' ? 'Speaking Tagalog Now...' : 'Nagsasalita sa Tagalog...')
                  : (commuteLang === 'en' ? 'Play Voice Audio to Driver' : 'Pakinggan ang Boses')}
              </span>
            </button>
          </div>

          {/* Bottom Quick Phrases Row */}
          <div className="border-t border-white/15 pt-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
              {commuteLang === 'en' ? 'Tap phrase to switch display:' : 'Pindutin para palitan ang sasabihin:'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COMMUTE_COMPANION_PHRASES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveDriverPhrase(item.tagalog);
                    handleSpeakPhrase(item.tagalog);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-left ${
                    activeDriverPhrase === item.tagalog
                      ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/30'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  <span>{item.tagalog}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
