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
  Footprints,
  Play,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import type { MapMarker } from './MansalayMap';
import type { Map as LeafletMap, Polyline as LeafletPolyline } from 'leaflet';
import { getOSRMRoute, OSRMRouteResponse } from '../lib/api';

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

export function InAppNavigationModal({
  isOpen,
  onClose,
  startCoords,
  destination,
  distanceKm,
}: InAppNavigationModalProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [travelMode, setTravelMode] = useState<'car' | 'bike' | 'walk'>('car');
  const [isNavigating, setIsNavigating] = useState(true);
  const [osrmRoute, setOsrmRoute] = useState<OSRMRouteResponse | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [totalMins, setTotalMins] = useState(Math.max(1, Math.round(distanceKm * 2.5)));
  const [totalDistanceKm, setTotalDistanceKm] = useState(distanceKm);
  const [userPos, setUserPos] = useState<[number, number]>(startCoords);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const userMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<LeafletPolyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isFetchingRouteRef = useRef(false);

  // Fetch real OSRM road route
  const fetchRoute = async (currentLat: number, currentLng: number) => {
    if (isFetchingRouteRef.current) return;
    isFetchingRouteRef.current = true;
    setIsRecalculating(true);
    try {
      const data = await getOSRMRoute(currentLat, currentLng, destination.lat, destination.lng);
      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        setOsrmRoute(data);

        // Extract GeoJSON coordinates [lng, lat] -> convert to [lat, lng]
        const rawCoords = route.geometry.coordinates;
        const latLngs: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
        setRouteGeometry(latLngs);

        setTotalDistanceKm(Math.round((route.distance / 1000) * 10) / 10);
        setTotalMins(Math.max(1, Math.round(route.duration / 60)));

        // Extract OSRM step maneuvers accurately matching real road geometry
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          const parsedSteps: NavigationStep[] = route.legs[0].steps.map((s, idx) => {
            let iconType: 'straight' | 'right' | 'left' | 'uturn' | 'destination' = 'straight';
            const mod = (s.maneuver.modifier || '').toLowerCase();
            const type = (s.maneuver.type || '').toLowerCase();
            const rawRoadName = s.name ? s.name.trim() : '';
            const roadName = rawRoadName || 'Unnamed road';

            if (idx === route.legs[0].steps.length - 1 || type === 'arrive') {
              iconType = 'destination';
            } else if (mod.includes('uturn')) {
              iconType = 'uturn';
            } else if (mod.includes('right')) {
              iconType = 'right';
            } else if (mod.includes('left')) {
              iconType = 'left';
            } else {
              iconType = 'straight';
            }

            let instruction = '';
            if (iconType === 'destination') {
              instruction = `You have arrived at ${destination.name}`;
            } else if (iconType === 'uturn') {
              instruction = `Make a U-turn onto ${roadName}`;
            } else if (iconType === 'right') {
              instruction = mod.includes('slight')
                ? `Bear right onto ${roadName}`
                : mod.includes('sharp')
                ? `Sharp right onto ${roadName}`
                : `Turn right onto ${roadName}`;
            } else if (iconType === 'left') {
              instruction = mod.includes('slight')
                ? `Bear left onto ${roadName}`
                : mod.includes('sharp')
                ? `Sharp left onto ${roadName}`
                : `Turn left onto ${roadName}`;
            } else {
              instruction = type === 'depart'
                ? `Head ${mod ? mod + ' ' : ''}on ${roadName}`
                : `Continue straight on ${roadName}`;
            }

            const stepLoc: [number, number] = s.maneuver.location
              ? [s.maneuver.location[1], s.maneuver.location[0]]
              : [0, 0];

            return {
              instruction,
              distanceMeters: Math.round(s.distance),
              icon: iconType,
              roadName,
              location: stepLoc,
            };
          });

          setSteps(parsedSteps);
          setCurrentStepIdx(0);
        }
        setIsOffRoute(false);
      }
    } catch (err) {
      console.error('OSRM navigation error:', err);
    } finally {
      isFetchingRouteRef.current = false;
      setIsRecalculating(false);
    }
  };

  // Initial OSRM Route Request
  useEffect(() => {
    if (isOpen) {
      fetchRoute(startCoords[0], startCoords[1]);
    }
  }, [isOpen, startCoords, destination]);

  // Continuous watchPosition during Navigation
  useEffect(() => {
    if (!isOpen || !isNavigating) return;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPos([lat, lng]);

          // Dynamically update currentStepIdx based on user's real GPS distance to step maneuvers
          if (steps && steps.length > 0) {
            for (let i = currentStepIdx; i < steps.length; i++) {
              const stp = steps[i];
              if (stp.location && stp.location[0] !== 0) {
                const distToStep = getDistanceMeters(lat, lng, stp.location[0], stp.location[1]);
                if (distToStep < 25 && i > currentStepIdx) {
                  setCurrentStepIdx(i);
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
        (err) => console.warn('Navigation GPS watch error:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Destination Marker
      const destIcon = L.divIcon({
        html: `
          <div style="background:#EC4899;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);">
            <span style="transform:rotate(45deg);font-size:16px;">🏁</span>
          </div>
        `,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([destination.lat, destination.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>${destination.name}</b><br/>${destination.location || 'Destination'}`);

      // User Live Position Marker
      const userIcon = L.divIcon({
        html: `
          <div style="position:relative;width:28px;height:28px;">
            <div style="position:absolute;inset:0;background:#10B981;border-radius:50%;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:absolute;inset:4px;background:#059669;border:3px solid white;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.5);"></div>
          </div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      userMarkerRef.current = L.marker(startCoords, { icon: userIcon }).addTo(map);

      const endCoords: [number, number] = [destination.lat, destination.lng];
      const bounds = L.latLngBounds([startCoords, endCoords]);
      map.fitBounds(bounds, { padding: [40, 40] });
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
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userPos);
      }

      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }

      if (routeGeometry.length > 0) {
        routeLineRef.current = L.polyline(routeGeometry, {
          color: '#10B981',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }
    });
  }, [userPos, routeGeometry]);

  // Calculate real progress percentage from user's live GPS position
  const remainingDistanceMeters = getDistanceMeters(userPos[0], userPos[1], destination.lat, destination.lng);
  const totalDistanceMeters = Math.max(1, totalDistanceKm * 1000);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalDistanceMeters - remainingDistanceMeters) / totalDistanceMeters) * 100))
  );

  // ETA Calculation
  const now = new Date();
  const etaTime = new Date(now.getTime() + totalMins * 60000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between shadow-xl z-20">
          <div className="flex items-center gap-3.5">
            {/* Maneuver Arrow Icon */}
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
              {currentStep.icon === 'right' && <CornerUpRight className="h-7 w-7 stroke-[2.5]" />}
              {currentStep.icon === 'left' && <CornerUpLeft className="h-7 w-7 stroke-[2.5]" />}
              {currentStep.icon === 'uturn' && <RotateCcw className="h-7 w-7 stroke-[2.5]" />}
              {currentStep.icon === 'straight' && <ArrowRight className="h-7 w-7 -rotate-90 stroke-[2.5]" />}
              {currentStep.icon === 'destination' && <CheckCircle2 className="h-7 w-7 text-emerald-200" />}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                <span>Live GPS Navigation Mode</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight line-clamp-1">
                {currentStep.instruction}
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                In {currentStep.distanceMeters} meters
              </p>
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVoiceMuted(!isVoiceMuted)}
              className="w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              title={isVoiceMuted ? 'Unmute Voice Guidance' : 'Mute Voice Guidance'}
            >
              {isVoiceMuted ? <VolumeX className="h-5 w-5 text-red-300" /> : <Volume2 className="h-5 w-5 text-emerald-200" />}
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
            className="bg-emerald-400 h-1.5 transition-all duration-500 ease-out"
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
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/75 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-xl z-10">
              <button
                onClick={() => setTravelMode('car')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  travelMode === 'car' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                <span>Car/Tricycle</span>
              </button>
              <button
                onClick={() => setTravelMode('bike')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  travelMode === 'bike' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bike className="h-3.5 w-3.5" />
                <span>Motorcycle</span>
              </button>
              <button
                onClick={() => setTravelMode('walk')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  travelMode === 'walk' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Footprints className="h-3.5 w-3.5" />
                <span>Walking</span>
              </button>
            </div>
          </div>

          {/* Right Column: Step-by-Step Directions List */}
          <div className="w-full md:w-80 bg-gray-950 border-t md:border-t-0 md:border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  <span>Live Turn-by-Turn Steps</span>
                </h4>
                <span className="text-xs font-semibold text-emerald-400">
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
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-white ring-1 ring-emerald-500/30'
                        : idx < currentStepIdx
                        ? 'bg-gray-900/40 border-gray-800 text-gray-500'
                        : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-850'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        idx === currentStepIdx
                          ? 'bg-emerald-500 text-white'
                          : idx < currentStepIdx
                          ? 'bg-gray-800 text-gray-500'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold leading-snug">{step.instruction}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{step.distanceMeters} meters</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-gray-800 mt-4">
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
            </div>
          </div>
        </div>

        {/* Bottom ETA Dock Bar */}
        <div className="bg-gray-900 border-t border-white/10 p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Est. Travel Time</p>
              <p className="text-xl font-extrabold text-emerald-400">{totalMins} mins</p>
            </div>
            <div className="h-8 w-px bg-gray-800" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Distance</p>
              <p className="text-sm font-bold text-white">{distanceKm} km</p>
            </div>
            <div className="h-8 w-px bg-gray-800" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">ETA Arrival</p>
              <p className="text-sm font-bold text-white">{etaTime}</p>
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
    </div>
  );
}
