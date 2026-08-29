import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Hotel, Store, Mountain, Filter, Navigation, Compass, Crosshair, ExternalLink, X, Clock, Search, CheckCircle2, Plus, PlusCircle, Building2, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicJSON, getPublicLandmarks, createLandmark, isPointInMansalayPolygon, getOSRMRoute, getCurrentUserRole, getAuthToken } from '../../lib/api';
import { MansalayMap, MapMarker, UserGpsData } from '../../components/MansalayMap';
import { InAppNavigationModal } from '../../components/InAppNavigationModal';
import { useApp } from '../../context/AppContext';

const MANSALAY_CENTER: [number, number] = [12.5311, 121.4394];

const MANSALAY_BARANGAY_COORDS: Record<string, [number, number]> = {
  'buktot': [12.5532, 121.4688],
  'sidell': [12.5315, 121.4552],
  'pgd': [12.4988, 121.4520],
  'panaytayan': [12.5185, 121.3980],
  'poblacion': [12.5311, 121.4394],
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

interface DirectoryLocation {
  id: string;
  name: string;
  category: 'Beach' | 'Cultural' | 'Heritage' | 'Adventure' | 'Resort' | 'Landmark' | 'Market';
  icon: string;
  iconBg: string;
  description: string;
  address: string;
  coords: [number, number];
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
  const [isInAppNavOpen, setIsInAppNavOpen] = useState(false);

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

  // Fetch OSRM Road Route whenever selected destination changes
  useEffect(() => {
    if (!selectedDestination) {
      setOsrmRouteCoords(null);
      return;
    }

    const startLat = rawGps ? rawGps.lat : (userLocation ? userLocation[0] : MANSALAY_CENTER[0]);
    const startLng = rawGps ? rawGps.lng : (userLocation ? userLocation[1] : MANSALAY_CENTER[1]);

    getOSRMRoute(startLat, startLng, selectedDestination.lat, selectedDestination.lng).then((res) => {
      if (res && res.routes && res.routes[0]) {
        const coords = res.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        setOsrmRouteCoords(coords);
      } else {
        setOsrmRouteCoords(null);
      }
    });
  }, [selectedDestination, rawGps, userLocation]);

  // Accurate Location Directory matching Figma Designs
  const directoryLocations: DirectoryLocation[] = [
    {
      id: 'dir-1',
      name: 'Buktot Beach',
      category: 'Beach',
      icon: '🌊',
      iconBg: 'bg-blue-50 text-blue-600',
      description: 'Most popular beach in Mansalay featuring pristine white sand and crystal clear ocean waters.',
      address: 'Barangay Buktot, Mansalay, Oriental Mindoro',
      coords: [12.5532, 121.4688]
    },
    {
      id: 'dir-2',
      name: 'Sidell Beach & Kite Grounds',
      category: 'Beach',
      icon: '🪁',
      iconBg: 'bg-pink-50 text-pink-600',
      description: 'Golden sands and optimal sea breeze for kite flying, sunsets, and relaxation.',
      address: 'Sidell Beach, Mansalay, Oriental Mindoro',
      coords: [12.5315, 121.4552]
    },
    {
      id: 'dir-3',
      name: 'PGD Beach Marine Sanctuary',
      category: 'Beach',
      icon: '🤿',
      iconBg: 'bg-teal-50 text-teal-600',
      description: 'Pristine marine protected area with coral reefs, ideal for snorkeling and swimming.',
      address: 'PGD Coast, Mansalay, Oriental Mindoro',
      coords: [12.4988, 121.4520]
    },
    {
      id: 'dir-4',
      name: 'Mangyan Cultural Village',
      category: 'Cultural',
      icon: '🏹',
      iconBg: 'bg-amber-50 text-amber-600',
      description: 'Authentic Hanunuo Mangyan ancestral village highlighting traditional crafts and heritage.',
      address: 'Panaytayan, Mansalay, Oriental Mindoro',
      coords: [12.5185, 121.3980]
    },
    {
      id: 'dir-5',
      name: 'Mangyan Burial Cave',
      category: 'Heritage',
      icon: '🏛️',
      iconBg: 'bg-purple-50 text-purple-600',
      description: 'Sacred heritage cave site holding ancient burial artifacts of indigenous ancestors.',
      address: 'Mansalay Hills, Oriental Mindoro',
      coords: [12.5450, 121.4120]
    },
    {
      id: 'dir-6',
      name: 'Melzar Mountain Trek Trail',
      category: 'Adventure',
      icon: '⛰️',
      iconBg: 'bg-emerald-50 text-emerald-600',
      description: 'Scenic mountain trail with panoramic summit views of Mansalay Bay and lush valleys.',
      address: 'Mansalay Highlands, Oriental Mindoro',
      coords: [12.5620, 121.4280]
    },
    {
      id: 'dir-7',
      name: 'Mansalay Heritage Plaza',
      category: 'Landmark',
      icon: '🏛️',
      iconBg: 'bg-amber-50 text-amber-600',
      description: 'Historic town plaza and civic center preserving Oriental Mindoro culture and events.',
      address: 'Poblacion Town Center, Mansalay, Oriental Mindoro',
      coords: [12.5311, 121.4394]
    },
    {
      id: 'dir-8',
      name: 'MB Hiraya Beach Resort',
      category: 'Resort',
      icon: '🏨',
      iconBg: 'bg-rose-50 text-rose-600',
      description: 'Top-rated beachfront resort with outdoor pools, luxury rooms, and oceanfront dining.',
      address: 'Mansalay Beachfront, Oriental Mindoro',
      coords: [12.5410, 121.4610]
    }
  ];

  const [dynamicLocations, setDynamicLocations] = useState<DirectoryLocation[]>([]);

  // Auto-acquire tourist GPS location on load and listen to content changes
  useEffect(() => {
    handleGetLocation();
    window.addEventListener('contentUpdated', fetchAllData);
    window.addEventListener('storage', fetchAllData);
    return () => {
      window.removeEventListener('contentUpdated', fetchAllData);
      window.removeEventListener('storage', fetchAllData);
    };
  }, []);

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
        lat: getCoords(a.location)[0],
        lng: getCoords(a.location)[1],
        name: a.name,
        type: 'attraction',
        description: a.description,
        location: a.location,
      }));

      const resortMarkers: MapMarker[] = rawAccommodations.map((a: any) => ({
        id: `resort-${a.id}`,
        lat: getCoords(a.location)[0],
        lng: getCoords(a.location)[1],
        name: a.name || a.resort_name,
        type: 'resort',
        description: a.description,
        location: a.location,
      }));

      const dbLandmarkMarkers: MapMarker[] = rawLandmarks.map((l: any) => ({
        id: `db-landmark-${l.id}`,
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        name: l.name,
        type: l.type || 'resort',
        description: l.description,
        location: l.address,
        image: l.image,
      }));

      setMarkers([...attractionMarkers, ...resortMarkers, ...dbLandmarkMarkers]);

      // Dynamic Directory Locations
      const mappedAttractionsDirs: DirectoryLocation[] = rawAttractions.map((a: any) => ({
        id: `att-${a.id}`,
        name: a.name,
        category: a.category || 'Beach',
        icon: a.category === 'Beach' ? '🌊' : a.category === 'Cultural' ? '🏛️' : '🏔️',
        iconBg: 'bg-blue-50 text-blue-600',
        description: a.description || 'Attraction in Mansalay',
        address: a.location || 'Mansalay, Oriental Mindoro',
        coords: getCoords(a.location),
      }));

      const mappedResortDirs: DirectoryLocation[] = rawAccommodations.map((a: any) => ({
        id: `res-${a.id}`,
        name: a.name || a.resort_name,
        category: 'Resort',
        icon: '🏨',
        iconBg: 'bg-rose-50 text-rose-600',
        description: a.description || 'Resort in Mansalay',
        address: a.location || 'Mansalay, Oriental Mindoro',
        coords: getCoords(a.location),
      }));

      const mappedLandmarkDirs: DirectoryLocation[] = rawLandmarks.map((l: any) => ({
        id: `lm-${l.id}`,
        name: l.name,
        category: (l.type === 'resort' ? 'Resort' : l.type === 'enterprise' ? 'Market' : 'Landmark') as any,
        icon: l.type === 'resort' ? '🏨' : l.type === 'enterprise' ? '🛍️' : '📍',
        iconBg: l.type === 'resort' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600',
        description: l.description || 'Landmark in Mansalay',
        address: l.address || 'Mansalay, Oriental Mindoro',
        coords: [Number(l.latitude), Number(l.longitude)],
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
      });

      toast.success('Landmark added successfully! Marker is now visible to all users.');
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
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
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

  const startPoint: [number, number] = userLocation || MANSALAY_CENTER;
  const distanceKm = selectedDestination
    ? getDistanceKm(startPoint[0], startPoint[1], selectedDestination.lat, selectedDestination.lng)
    : 0;

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
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/20'
              }`}
              title="Locate My GPS Position"
            >
              <Crosshair className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : isUsingLiveGps ? 'GPS Active' : 'My Location'}</span>
            </button>

            {userRole !== 'tourist' && (
              <button
                onClick={() => handleMapClick({ lat: MANSALAY_CENTER[0], lng: MANSALAY_CENTER[1] })}
                className="px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 whitespace-nowrap"
                title="Add Landmark inside Mansalay Boundary"
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
              <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
                🔒 Strict Mansalay Boundary
              </span>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
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
              onMapClick={handleMapClick}
            />

            {/* GPS Telemetry HUD Panel Overlay (Top Left) */}
            <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-slate-700/60 text-white font-mono text-[11px] w-72">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-pink-400 uppercase tracking-wider text-[10px]">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  <span>GPS Telemetry HUD</span>
                </div>
                {rawGps ? (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    rawGps.accuracy <= 10 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    rawGps.accuracy <= 30 ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                    rawGps.accuracy <= 100 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {rawGps.accuracy <= 10 ? 'Excellent' : rawGps.accuracy <= 30 ? 'Good' : rawGps.accuracy <= 100 ? 'Fair' : 'Weak'}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[9px]">Acquiring...</span>
                )}
              </div>

              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Latitude:</span>
                  <span className="font-semibold">{rawGps ? rawGps.lat.toFixed(6) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Longitude:</span>
                  <span className="font-semibold">{rawGps ? rawGps.lng.toFixed(6) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Accuracy:</span>
                  <span className="font-semibold">{rawGps ? `±${rawGps.accuracy} m` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heading:</span>
                  <span className="font-semibold">{rawGps && rawGps.heading !== null ? `${rawGps.heading}°` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed:</span>
                  <span className="font-semibold">{rawGps && rawGps.speed !== null ? `${rawGps.speed} m/s` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Altitude:</span>
                  <span className="font-semibold">{rawGps && rawGps.altitude !== null ? `${rawGps.altitude} m` : 'N/A'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-500">
                  <span>Timestamp:</span>
                  <span>{rawGps ? new Date(rawGps.timestamp || Date.now()).toLocaleTimeString() : 'N/A'}</span>
                </div>
              </div>
            </div>

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
                    <p className="text-base font-extrabold text-pink-600">{distanceKm} km</p>
                  </div>
                  <button
                    onClick={() => setIsInAppNavOpen(true)}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full text-xs shadow-md shadow-pink-500/20 transition-all flex items-center gap-1"
                  >
                    <Compass className="h-3.5 w-3.5" /> Start Live Nav
                  </button>
                </div>

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
          distanceKm={distanceKm}
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-800">
                <span className="font-semibold">✅ Geofence Verified: Inside Mansalay</span>
                <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded-lg text-[11px]">
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
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/10'
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
