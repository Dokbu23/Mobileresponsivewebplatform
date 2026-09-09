import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Hotel, Store, Mountain, Filter, Navigation, Compass, Crosshair, ExternalLink, X, Clock, Search, CheckCircle2, Plus, PlusCircle, Building2, AlertTriangle, ShieldCheck, Sparkles, Footprints } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicJSON, getPublicLandmarks, createLandmark, isPointInMansalayPolygon, getRouteWithFallback, getCurrentUserRole, getAuthToken, decodeHtml } from '../../lib/api';
import { MansalayMap, MapMarker, UserGpsData } from '../../components/MansalayMap';
import { InAppNavigationModal } from '../../components/InAppNavigationModal';
import { VirtualTourModal, Tour360Scene } from '../../components/VirtualTourModal';
import { useApp } from '../../context/AppContext';

const MANSALAY_CENTER: [number, number] = [12.5311, 121.4394];

const MANSALAY_BARANGAY_COORDS: Record<string, [number, number]> = {
  'buktot': [12.5532, 121.4688],
  'sidell': [12.5315, 121.4552],
  'pgd': [12.4988, 121.4520],
  'panaytayan': [12.5185, 121.3980],
  'poblacion': [12.5311, 121.4394],
  'brgy poblacion': [12.5311, 121.4394],
  'brgy. poblacion': [12.5311, 121.4394],
  'b. del mundo': [12.5050, 121.4200],
  'balugo': [12.5300, 121.4450],
  'bonbon': [12.5400, 121.4100],
  'budburan': [12.5250, 121.4500],
  'cabalwa': [12.5100, 121.4600],
  'don pedro': [12.4900, 121.4400],
  'maliwanag': [12.5350, 121.4250],
  'manaul': [12.5450, 121.4350],
  'roma': [12.5000, 121.4300],
  'santa brigida': [12.5150, 121.4450],
  'santa maria': [12.5280, 121.4380],
  'santa teresita': [12.5080, 121.4480],
  'villa celestial': [12.5320, 121.4280],
  'wasig': [12.5420, 121.4420],
  'waygan': [12.5380, 121.4480],
  'default': [12.5311, 121.4394],
};

function getCoords(location?: string | null): [number, number] {
  if (!location) return MANSALAY_BARANGAY_COORDS['default'];
  const locLower = location.toLowerCase();
  for (const [key, coords] of Object.entries(MANSALAY_BARANGAY_COORDS)) {
    if (locLower.includes(key)) {
      return coords;
    }
  }
  return MANSALAY_BARANGAY_COORDS['default'];
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function getStoredScenes(type: string, id?: string | number): Tour360Scene[] | undefined {
  try {
    if (id) {
      const fromId = localStorage.getItem(`discover-mansalay:${type}_360_scenes_${id}`);
      if (fromId) {
        const parsed = JSON.parse(fromId);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const fromLm = localStorage.getItem(`discover-mansalay:landmark_360_scenes_${id}`);
      if (fromLm) {
        const parsed = JSON.parse(fromLm);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    const fromGeneral = localStorage.getItem(`discover-mansalay:${type}_360_scenes`);
    if (fromGeneral) {
      const parsed = JSON.parse(fromGeneral);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return undefined;
}

interface DirectoryLocation {
  id: string;
  name: string;
  category: string;
  icon: string;
  iconBg: string;
  description: string;
  address: string;
  coords: [number, number];
  virtual_tour_scenes?: Tour360Scene[];
}

export function MapExplore() {
  const navigate = useNavigate();
  const { currentUser, userType, isAdmin } = useApp();

  useEffect(() => {
    if (!currentUser && !getAuthToken()) {
      toast.error('Please log in to access the Map');
      navigate('/tourist/login');
    }
  }, [currentUser, navigate]);

  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [rawGps, setRawGps] = useState<UserGpsData | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [isUsingLiveGps, setIsUsingLiveGps] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<MapMarker | null>(null);
  const [osrmRouteCoords, setOsrmRouteCoords] = useState<[number, number][] | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [isInAppNavOpen, setIsInAppNavOpen] = useState(false);
  const [navInitialMode, setNavInitialMode] = useState<'car' | 'bike' | 'transit'>('car');
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);
  const [tour360Data, setTour360Data] = useState<{
    name: string;
    category?: string;
    lat: number;
    lng: number;
    scenes?: Tour360Scene[];
  } | null>(null);

  // Landmark Creation & Geofence State
  const [showAddLandmarkModal, setShowAddLandmarkModal] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmittingLandmark, setIsSubmittingLandmark] = useState(false);
  const [landmarkForm, setLandmarkForm] = useState({
    name: '',
    type: 'resort' as 'resort' | 'enterprise',
    category: 'Resort',
    description: '',
    address: 'Mansalay, Oriental Mindoro',
    image: '',
  });

  // Continuous High-Accuracy Device GPS Position Watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsErrorMsg('⚠️ Geolocation API is not supported by your device browser.');
      return;
    }
    setLocating(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
        setRawGps({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          heading: heading !== null && !isNaN(heading) ? Math.round(heading) : null,
          speed: speed !== null && !isNaN(speed) ? Math.round(speed * 10) / 10 : null,
          timestamp: pos.timestamp,
          altitude: altitude !== null && !isNaN(altitude) ? Math.round(altitude) : null,
        });
        setUserLocation([latitude, longitude]);
        setIsUsingLiveGps(true);
        setLocating(false);
        setGpsErrorMsg(null);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorMsg('📍 Location permission is required for navigation.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsErrorMsg('⚠️ GPS location is currently unavailable. Please check your device location settings.');
        } else if (err.code === err.TIMEOUT) {
          setGpsErrorMsg('⚠️ GPS request timed out. Attempting to acquire location again...');
        } else {
          setGpsErrorMsg(`⚠️ GPS Error: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Fetch route whenever selected destination changes (Google Maps → OSRM fallback)
  useEffect(() => {
    if (!selectedDestination) {
      setOsrmRouteCoords(null);
      setRouteDistanceKm(null);
      return;
    }

    const startLat = rawGps ? rawGps.lat : (userLocation ? userLocation[0] : MANSALAY_CENTER[0]);
    const startLng = rawGps ? rawGps.lng : (userLocation ? userLocation[1] : MANSALAY_CENTER[1]);

    getRouteWithFallback(startLat, startLng, selectedDestination.lat, selectedDestination.lng).then((res) => {
      if (res && res.routeCoords.length > 0) {
        setOsrmRouteCoords(res.routeCoords);
        // Use actual road distance from routing engine (not straight-line)
        setRouteDistanceKm(Math.round((res.totalDistanceMeters / 1000) * 10) / 10);
      } else {
        setOsrmRouteCoords(null);
        setRouteDistanceKm(null);
      }
    });
  }, [selectedDestination, rawGps, userLocation]);

  const [dynamicLocations, setDynamicLocations] = useState<DirectoryLocation[]>([]);

  // Auto-acquire tourist GPS location on load and listen to content changes
  useEffect(() => {
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to explore the Map');
      navigate('/tourist/login');
      return;
    }
    handleGetLocation();
    window.addEventListener('contentUpdated', fetchAllData);
    window.addEventListener('storage', fetchAllData);
    return () => {
      window.removeEventListener('contentUpdated', fetchAllData);
      window.removeEventListener('storage', fetchAllData);
    };
  }, [currentUser, navigate]);

  const fetchAllData = async () => {
    try {
      const [attractions, accommodations, landmarks] = await Promise.all([
        getPublicJSON('/attractions').catch(() => []),
        getPublicJSON('/accommodations').catch(() => []),
        getPublicLandmarks().catch(() => []),
      ]);

      let deletedIds = new Set<string>();
      let archivedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
        const archStr = localStorage.getItem('discover-mansalay:archived_posts');
        if (archStr) archivedIds = new Set(JSON.parse(archStr).map((id: any) => String(id)));
      } catch {}

      const rawAttractions = (Array.isArray(attractions) ? attractions : []).filter((a: any) => !deletedIds.has(String(a.id)) && !archivedIds.has(String(a.id)));
      const rawAccommodations = (Array.isArray(accommodations) ? accommodations : []).filter((a: any) => !deletedIds.has(String(a.id)) && !archivedIds.has(String(a.id)));
      const rawLandmarks = (Array.isArray(landmarks) ? landmarks : []).filter((l: any) => !deletedIds.has(String(l.id)) && !archivedIds.has(String(l.id)));

      const attractionMarkers: MapMarker[] = rawAttractions.map((a: any) => ({
        id: `attraction-${a.id}`,
        // Use precise DB coordinates if available, else fall back to barangay-level approximation
        lat: (a.latitude && a.longitude) ? Number(a.latitude) : getCoords(a.location)[0],
        lng: (a.latitude && a.longitude) ? Number(a.longitude) : getCoords(a.location)[1],
        name: decodeHtml(a.name),
        type: 'attraction',
        description: decodeHtml(a.description),
        location: decodeHtml(a.location),
        virtual_tour_scenes: a.virtual_tour_scenes,
      }));

      const resortMarkers: MapMarker[] = rawAccommodations.map((a: any) => ({
        id: `resort-${a.id}`,
        // Use precise DB coordinates if available, else fall back to barangay-level approximation
        lat: (a.latitude && a.longitude) ? Number(a.latitude) : getCoords(a.location)[0],
        lng: (a.latitude && a.longitude) ? Number(a.longitude) : getCoords(a.location)[1],
        name: decodeHtml(a.name || a.resort_name),
        type: 'resort',
        description: decodeHtml(a.description),
        location: decodeHtml(a.location),
        virtual_tour_scenes: a.virtual_tour_scenes || getStoredScenes('resort', a.user_id || a.id),
        userId: a.user_id || a.id,
      }));

      const dbLandmarkMarkers: MapMarker[] = rawLandmarks.map((l: any) => ({
        id: `db-landmark-${l.id}`,
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        name: decodeHtml(l.name),
        type: l.type || 'resort',
        description: decodeHtml(l.description),
        location: decodeHtml(l.address),
        image: l.image,
        virtual_tour_scenes: l.virtual_tour_scenes || l.user?.virtual_tour_scenes || getStoredScenes(l.type || 'resort', l.id) || getStoredScenes(l.type || 'resort', l.user_id),
        userId: l.user_id || l.userId,
      }));

      setMarkers([...attractionMarkers, ...resortMarkers, ...dbLandmarkMarkers]);

      // Dynamic Directory Locations
      const mappedAttractionsDirs: DirectoryLocation[] = rawAttractions.map((a: any) => ({
        id: `att-${a.id}`,
        name: decodeHtml(a.name),
        category: decodeHtml(a.category || 'Beach'),
        icon: a.category === 'Beach' ? '🌊' : a.category === 'Cultural' ? '🏙️' : '🏔️',
        iconBg: 'bg-blue-50 text-blue-600',
        description: decodeHtml(a.description || 'Attraction in Mansalay'),
        address: decodeHtml(a.location || 'Mansalay, Oriental Mindoro'),
        coords: (a.latitude && a.longitude)
          ? [Number(a.latitude), Number(a.longitude)]
          : getCoords(a.location),
        virtual_tour_scenes: a.virtual_tour_scenes,
      }));

      const mappedResortDirs: DirectoryLocation[] = rawAccommodations.map((a: any) => ({
        id: `res-${a.id}`,
        name: decodeHtml(a.name || a.resort_name),
        category: 'Resort',
        icon: '🏨',
        iconBg: 'bg-rose-50 text-rose-600',
        description: decodeHtml(a.description || 'Resort in Mansalay'),
        address: decodeHtml(a.location || 'Mansalay, Oriental Mindoro'),
        coords: (a.latitude && a.longitude)
          ? [Number(a.latitude), Number(a.longitude)]
          : getCoords(a.location),
        virtual_tour_scenes: a.virtual_tour_scenes || getStoredScenes('resort', a.user_id || a.id),
      }));

      const mappedLandmarkDirs: DirectoryLocation[] = rawLandmarks.map((l: any) => ({
        id: `lm-${l.id}`,
        name: decodeHtml(l.name),
        category: (l.type === 'resort' ? 'Resort' : l.type === 'enterprise' ? 'Market' : 'Landmark') as any,
        icon: l.type === 'resort' ? '🏨' : l.type === 'enterprise' ? '🛍️' : '📍',
        iconBg: l.type === 'resort' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600',
        description: l.description || 'Landmark in Mansalay',
        address: l.address || 'Mansalay, Oriental Mindoro',
        coords: [Number(l.latitude), Number(l.longitude)],
        virtual_tour_scenes: l.virtual_tour_scenes || l.user?.virtual_tour_scenes || getStoredScenes(l.type || 'resort', l.id) || getStoredScenes(l.type || 'resort', l.user_id),
      }));

      setDynamicLocations([...mappedAttractionsDirs, ...mappedResortDirs, ...mappedLandmarkDirs]);
    } catch (err) {
      console.error('Map fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const userRole = useMemo(() => {
    if (isAdmin || userType === 'admin' || currentUser?.role === 'admin') return 'admin';
    if (userType === 'resort' || currentUser?.role === 'resort') return 'resort';
    if (userType === 'enterprise' || currentUser?.role === 'enterprise') return 'enterprise';
    return getCurrentUserRole();
  }, [isAdmin, userType, currentUser]);

  const getMarkerScenes = (marker: MapMarker): Tour360Scene[] | undefined => {
    if (Array.isArray(marker.virtual_tour_scenes) && marker.virtual_tour_scenes.length > 0) {
      return marker.virtual_tour_scenes;
    }
    const fromStored = getStoredScenes(marker.type, marker.id);
    if (fromStored) return fromStored;
    if (marker.userId) {
      const fromUser = getStoredScenes(marker.type, marker.userId);
      if (fromUser) return fromUser;
    }
    if (currentUser?.virtual_tour_scenes && (currentUser.role === marker.type || userRole === marker.type)) {
      return currentUser.virtual_tour_scenes;
    }
    const generalStored = getStoredScenes(marker.type);
    if (generalStored) return generalStored;
    return undefined;
  };

  const handleOpen360Tour = (marker: MapMarker) => {
    const scenes = getMarkerScenes(marker);
    setTour360Data({
      name: marker.name,
      category: marker.type,
      lat: marker.lat,
      lng: marker.lng,
      scenes,
    });
    setIsVirtualTourOpen(true);
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    const { lat, lng } = coords;

    // TOURISTS ARE VIEW & NAVIGATION ONLY - CANNOT CREATE LANDMARKS
    if (userRole === 'tourist') {
      toast.info('ℹ️ Tourists can view landmarks and get live road directions. Landmark creation is reserved for Resort, Enterprise, and Admin accounts.');
      return;
    }

    // Strict 2D Polygon Geofence Check
    if (!isPointInMansalayPolygon(lat, lng)) {
      toast.error('⚠️ Invalid Landmark Location. Landmarks can only be created within Mansalay, Oriental Mindoro.');
      return;
    }

    const defaultType = userRole === 'enterprise' ? 'enterprise' : 'resort';
    const prefilledName = userRole === 'resort'
      ? ((currentUser as any)?.resort_name || currentUser?.name || '')
      : userRole === 'enterprise'
      ? ((currentUser as any)?.store_name || currentUser?.name || '')
      : '';
    const prefilledAddress = (currentUser as any)?.barangay
      ? `${(currentUser as any).barangay}, Mansalay, Oriental Mindoro`
      : 'Mansalay, Oriental Mindoro';

    setClickedCoords(coords);
    setLandmarkForm({
      name: prefilledName,
      type: defaultType,
      category: defaultType === 'resort' ? 'Resort' : 'Enterprise',
      description: (currentUser as any)?.store_description || (currentUser as any)?.resort_description || (currentUser as any)?.description || '',
      address: prefilledAddress,
      image: '',
    });
    setShowAddLandmarkModal(true);
  };

  const handleSaveLandmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'tourist') {
      toast.error('Tourists are not allowed to create landmarks.');
      return;
    }
    if (!clickedCoords) return;
    if (!landmarkForm.name) {
      toast.error('Please enter a name for the landmark.');
      return;
    }

    const finalType = userRole === 'resort' ? 'resort' : userRole === 'enterprise' ? 'enterprise' : landmarkForm.type;

    // Attach active 360 scenes from user profile or localstorage to this landmark
    let scenesToAttach: Tour360Scene[] | undefined = undefined;
    try {
      if (Array.isArray(currentUser?.virtual_tour_scenes) && currentUser.virtual_tour_scenes.length > 0) {
        scenesToAttach = currentUser.virtual_tour_scenes;
      } else {
        const stored = getStoredScenes(finalType, currentUser?.id) || getStoredScenes(finalType);
        if (stored) scenesToAttach = stored;
      }
    } catch {}

    setIsSubmittingLandmark(true);
    try {
      await createLandmark({
        name: landmarkForm.name,
        type: finalType,
        category: landmarkForm.category || (finalType === 'resort' ? 'Resort' : 'Enterprise'),
        description: landmarkForm.description,
        address: landmarkForm.address,
        latitude: clickedCoords.lat,
        longitude: clickedCoords.lng,
        image: landmarkForm.image,
        virtual_tour_scenes: scenesToAttach,
      });

      toast.success('Landmark added successfully! 360° Walkthrough is linked to your landmark.');
      setShowAddLandmarkModal(false);
      setClickedCoords(null);

      // Refresh map markers from database so all users see it
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save landmark');
    } finally {
      setIsSubmittingLandmark(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation(MANSALAY_CENTER);
      setIsUsingLiveGps(false);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
        setRawGps({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          heading: heading !== null && !isNaN(heading) ? Math.round(heading) : null,
          speed: speed !== null && !isNaN(speed) ? Math.round(speed * 10) / 10 : null,
          timestamp: pos.timestamp,
          altitude: altitude !== null && !isNaN(altitude) ? Math.round(altitude) : null,
        });
        setUserLocation([latitude, longitude]);
        setIsUsingLiveGps(true);
        setLocating(false);
      },
      () => {
        setUserLocation(MANSALAY_CENTER);
        setIsUsingLiveGps(false);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const startPoint: [number, number] = rawGps ? [rawGps.lat, rawGps.lng] : (userLocation || MANSALAY_CENTER);
  // Straight-line estimate (used as placeholder while route loads)
  const straightLineKm = selectedDestination
    ? getDistanceKm(startPoint[0], startPoint[1], selectedDestination.lat, selectedDestination.lng)
    : 0;
  // Actual road distance from routing engine (replaces straight-line once loaded)
  const displayDistanceKm = routeDistanceKm ?? straightLineKm;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(dynamicLocations.map(loc => loc.category).filter(Boolean)));
    return ['All', ...cats];
  }, [dynamicLocations]);

  const filteredDirectory = dynamicLocations.filter(loc => {
    if (!loc || !loc.name) return false;
    const matchesCategory = filterCategory === 'All' || loc.category === filterCategory;
    const matchesSearch = !searchQuery ||
      (loc.name && loc.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (loc.description && loc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const openGoogleMapsDirections = (destLat: number, destLng: number, destName: string) => {
    const origin = startPoint ? `${startPoint[0]},${startPoint[1]}` : 'Mansalay+Oriental+Mindoro';
    const destination = `${destLat},${destLng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&destination_place_id=${encodeURIComponent(destName)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50/40 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ── HEADER TITLE & SEARCH ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Interactive Travel Map</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium pl-4.5">
              Explore Mansalay, Oriental Mindoro — real-time GPS locations, directions, and tourist directory
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search locations, beaches, resorts..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder:text-gray-400 shadow-2xs outline-none transition-all"
              />
            </div>

            <button
              onClick={handleGetLocation}
              disabled={locating}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                isUsingLiveGps
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-pink-500/25 ring-2 ring-pink-300/40'
                  : 'bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 shadow-sm'
              }`}
              title="Locate My GPS Position"
            >
              <Crosshair className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : isUsingLiveGps ? 'GPS Active' : 'My Location'}</span>
            </button>

            {userRole !== 'tourist' && (
              <button
                onClick={() => handleMapClick({ lat: MANSALAY_CENTER[0], lng: MANSALAY_CENTER[1] })}
                className="px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-md shadow-pink-500/25 whitespace-nowrap active:scale-95"
                title="Add Landmark on Map"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Add Landmark</span>
              </button>
            )}
          </div>
        </div>

        {/* ── MAP CONTAINER ── */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm mb-12">
          {/* Top Bar inside Map Container */}
          <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 flex-wrap">
              <MapPin className="h-4 w-4 text-pink-500" />
              <span>Mansalay, Oriental Mindoro</span>
              <span className="text-[11px] font-medium text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
                {isUsingLiveGps ? '📍 Based on your GPS' : '📍 Mansalay Center'}
              </span>
            </div>
            <button
              onClick={() => openGoogleMapsDirections(MANSALAY_CENTER[0], MANSALAY_CENTER[1], 'Mansalay Town Center')}
              className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Open Google Maps Navigation</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Leaflet Map Box */}
          <div className="relative h-[500px]">
            <MansalayMap
              markers={markers}
              height="500px"
              zoom={13}
              userLocation={userLocation}
              userGps={rawGps}
              routeCoords={osrmRouteCoords}
              selectedMarker={selectedDestination}
              onSelectMarker={(marker) => setSelectedDestination(marker)}
              onOpenVirtualTour={handleOpen360Tour}
              onMapClick={handleMapClick}
            />



            {/* GPS Quality Banner (Bottom Overlay inside Map) */}
            {rawGps && rawGps.accuracy > 100 && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-rose-900/90 backdrop-blur-md border border-rose-500/50 text-rose-100 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2">
                <AlertTriangle className="h-5 w-5 text-rose-300 flex-shrink-0" />
                <span>
                  <strong>⚠️ Weak GPS Signal (±{rawGps.accuracy}m)</strong> — Move to an open sky area for better precision.
                </span>
              </div>
            )}

            {gpsErrorMsg && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-amber-900/90 backdrop-blur-md border border-amber-500/50 text-amber-100 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2">
                <AlertTriangle className="h-5 w-5 text-amber-300 flex-shrink-0" />
                <span>{gpsErrorMsg}</span>
              </div>
            )}

            {/* Selected Route Guidance Card Overlay */}
            {selectedDestination && (
              <div className="absolute top-4 right-4 w-80 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-pink-200 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                      <Navigation className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{selectedDestination.name}</h3>
                      <p className="text-[10px] font-semibold text-pink-500 uppercase">{selectedDestination.type}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDestination(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-4 w-4" /></button>
                </div>

                <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {isUsingLiveGps ? 'Distance from your GPS' : 'Distance from Town Center'}
                    </p>
                    <p className="text-base font-extrabold text-pink-600">
                      {displayDistanceKm} km
                      {routeDistanceKm === null && selectedDestination && (
                        <span className="text-[10px] text-gray-400 font-normal ml-1">(est.)</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNavInitialMode('car');
                      setIsInAppNavOpen(true);
                    }}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full text-xs shadow-md shadow-pink-500/20 transition-all flex items-center gap-1"
                  >
                    <Compass className="h-3.5 w-3.5" /> Start Live Nav
                  </button>
                </div>

                {/* 360° Virtual Walkthrough & Street View */}
                <button
                  onClick={() => {
                    handleOpen360Tour(selectedDestination);
                  }}
                  className="w-full mb-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                >
                  <Footprints className="h-3.5 w-3.5 text-emerald-100" />
                  <span>360° Walkthrough & Google Street View</span>
                </button>

                {/* AI Commute Route Advisor */}
                <button
                  onClick={() => {
                    setNavInitialMode('transit');
                    setIsInAppNavOpen(true);
                  }}
                  className="w-full mb-2 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-pink-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-100 animate-pulse" />
                  <span>AI Commute Guide (Saan Sasakay/Bababa)</span>
                </button>

                <button
                  onClick={() => openGoogleMapsDirections(selectedDestination.lat, selectedDestination.lng, selectedDestination.name)}
                  className="w-full py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Google Maps Driving Directions</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── LOCATION DIRECTORY SECTION ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-gray-900">Location Directory</h2>
            <span className="text-xs text-gray-400 font-semibold">{filteredDirectory.length} locations</span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {categories.map((cat: any) => {
              const isActive = filterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* 3 Columns Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDirectory.map((loc) => {
              if (!loc) return null;
              const coords: [number, number] = loc.coords && loc.coords.length === 2 ? loc.coords : MANSALAY_CENTER;
              const locDist = getDistanceKm(startPoint[0], startPoint[1], coords[0], coords[1]);
              const iconBg = loc.iconBg || 'bg-blue-50 text-blue-600';
              const icon = loc.icon || '📍';

              return (
                <div key={loc.id || Math.random()} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center text-lg flex-shrink-0 shadow-2xs`}>
                          {icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-gray-900 group-hover:text-pink-600 transition-colors line-clamp-1">{loc.name}</h3>
                          <p className="text-[11px] font-semibold text-gray-400">{loc.category || 'Landmark'}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-pink-50 text-pink-600 font-extrabold text-xs rounded-full border border-pink-100 whitespace-nowrap">
                        {locDist} km
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mb-4 min-h-[36px]">{loc.description}</p>
                    
                    <div className="flex items-center gap-1.5 text-[11px] text-pink-500 font-semibold mb-6">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{loc.address}</span>
                    </div>
                  </div>

                  {/* Buttons Row */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedDestination({
                          id: loc.id,
                          lat: coords[0],
                          lng: coords[1],
                          name: loc.name,
                          type: 'attraction',
                          location: loc.address
                        });
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="flex-1 py-2 px-3 bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold rounded-full text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Show on map</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDestination({
                          id: loc.id,
                          lat: coords[0],
                          lng: coords[1],
                          name: loc.name,
                          type: 'attraction',
                          location: loc.address
                        });
                        setIsInAppNavOpen(true);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-full text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>Directions</span>
                    </button>

                    <button
                      onClick={() => {
                        const matchedMarker = markers.find(m => m.id === loc.id || m.name === loc.name);
                        if (matchedMarker) {
                          handleOpen360Tour(matchedMarker);
                        } else {
                          handleOpen360Tour({
                            id: loc.id,
                            lat: coords[0],
                            lng: coords[1],
                            name: loc.name,
                            type: (loc.category === 'Resort' ? 'resort' : loc.category === 'Market' ? 'enterprise' : 'attraction') as any,
                            location: loc.address,
                            virtual_tour_scenes: loc.virtual_tour_scenes,
                          });
                        }
                      }}
                      className="py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold rounded-full text-xs transition-colors flex items-center justify-center gap-1"
                      title="Open 360° Virtual Walkthrough"
                    >
                      <Footprints className="h-3 w-3" />
                      <span>360°</span>
                    </button>

                    <button
                      onClick={() => openGoogleMapsDirections(coords[0], coords[1], loc.name)}
                      className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors flex-shrink-0"
                      title="Open Google Maps Driving Directions"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Built-In In-App Turn-By-Turn Navigation Modal */}
      {selectedDestination && (
        <InAppNavigationModal
          isOpen={isInAppNavOpen}
          onClose={() => setIsInAppNavOpen(false)}
          startCoords={startPoint}
          destination={selectedDestination}
          distanceKm={displayDistanceKm}
          initialMode={navInitialMode}
        />
      )}

      {/* 360° Virtual Walkthrough & Google Street View Modal */}
      {tour360Data && (
        <VirtualTourModal
          isOpen={isVirtualTourOpen}
          onClose={() => setIsVirtualTourOpen(false)}
          attractionName={tour360Data.name}
          category={tour360Data.category}
          lat={tour360Data.lat}
          lng={tour360Data.lng}
          customScenes={tour360Data.scenes}
        />
      )}

      {/* ── ADD LANDMARK MODAL (GEOFENCED WITHIN MANSALAY) ── */}
      {showAddLandmarkModal && clickedCoords && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-pink-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pink-500 to-rose-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Add Landmark on Map</h2>
                  <p className="text-xs text-pink-100 font-medium">Inside Mansalay Municipality Boundary</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddLandmarkModal(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLandmark} className="p-6 space-y-5">
              {/* Coordinates Badge */}
              <div className="bg-pink-50 border border-pink-200 rounded-2xl p-3 flex items-center justify-between text-xs text-pink-800">
                <span className="font-semibold">✅ Geofence Verified: Inside Mansalay</span>
                <span className="font-mono bg-pink-100 px-2 py-0.5 rounded-lg text-[11px] text-pink-900 font-bold">
                  {clickedCoords.lat.toFixed(4)}, {clickedCoords.lng.toFixed(4)}
                </span>
              </div>

              {/* Landmark Type Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Landmark Type *</label>
                {userRole === 'resort' ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                    <span className="text-xl">🏨</span>
                    <span>Resort Account — Creating Resort Landmark</span>
                  </div>
                ) : userRole === 'enterprise' ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-800 text-xs font-bold">
                    <span className="text-xl">🛍️</span>
                    <span>Enterprise Account — Creating Enterprise Landmark</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLandmarkForm({ ...landmarkForm, type: 'resort', category: 'Resort' })}
                      className={`p-3.5 border-2 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                        landmarkForm.type === 'resort'
                          ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md shadow-pink-500/10'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                      }`}
                    >
                      <span className="text-2xl">🏨</span>
                      <span>Resort (Accommodation)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLandmarkForm({ ...landmarkForm, type: 'enterprise', category: 'Enterprise' })}
                      className={`p-3.5 border-2 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                        landmarkForm.type === 'enterprise'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                      }`}
                    >
                      <span className="text-2xl">🛍️</span>
                      <span>Enterprise (Shop / Store)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Landmark Name *</label>
                <input
                  type="text"
                  value={landmarkForm.name}
                  onChange={(e) => setLandmarkForm({ ...landmarkForm, name: e.target.value })}
                  placeholder={landmarkForm.type === 'resort' ? 'e.g. Buktot Beach Resort & Cottages' : 'e.g. Mansalay Handicrafts & Store'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-xl text-xs font-medium outline-none transition-all"
                  required
                />
              </div>

              {/* Address / Location */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Address / Barangay</label>
                <input
                  type="text"
                  value={landmarkForm.address}
                  onChange={(e) => setLandmarkForm({ ...landmarkForm, address: e.target.value })}
                  placeholder="e.g. Barangay Buktot, Mansalay, Oriental Mindoro"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-xl text-xs font-medium outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={landmarkForm.description}
                  onChange={(e) => setLandmarkForm({ ...landmarkForm, description: e.target.value })}
                  placeholder="Briefly describe this location..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-xl text-xs font-medium outline-none transition-all resize-none"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Image URL (Optional)</label>
                <input
                  type="url"
                  value={landmarkForm.image}
                  onChange={(e) => setLandmarkForm({ ...landmarkForm, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-xl text-xs font-medium outline-none transition-all"
                />
              </div>

              {/* 360 Virtual Walkthrough Status */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    🌐
                  </div>
                  <div>
                    <div className="font-extrabold text-emerald-900">360° Virtual Walkthrough</div>
                    <div className="text-[11px] text-emerald-700">
                      {currentUser?.virtual_tour_scenes?.length || getStoredScenes(userRole === 'enterprise' ? 'enterprise' : 'resort', currentUser?.id)?.length
                        ? `Connected (${(currentUser?.virtual_tour_scenes || getStoredScenes(userRole === 'enterprise' ? 'enterprise' : 'resort', currentUser?.id))?.length} 360 scenes from your Profile attached)`
                        : 'Your 360 scenes from Profile will automatically link to this map marker'}
                    </div>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-lg text-[10px] whitespace-nowrap">
                  Auto-Linked
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmittingLandmark}
                  className="flex-1 py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-extrabold rounded-2xl hover:opacity-95 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 text-xs"
                >
                  {isSubmittingLandmark ? 'Saving...' : 'SAVE & Publish Marker'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLandmarkModal(false)}
                  className="px-6 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
