import { useEffect, useState } from 'react';
import { MapPin, Hotel, Store, Mountain, Filter } from 'lucide-react';
import { getPublicJSON, API_BASE } from '../../lib/api';
import { MansalayMap } from '../../components/MansalayMap';

// Known coordinates for Mansalay barangays/landmarks
// These are approximate — in production you'd store lat/lng in the DB
const MANSALAY_LOCATIONS: Record<string, [number, number]> = {
  'Poblacion': [12.5167, 121.4333],
  'B. Del Mundo': [12.5050, 121.4200],
  'Balugo': [12.5300, 121.4450],
  'Bonbon': [12.5400, 121.4100],
  'Budburan': [12.5250, 121.4500],
  'Cabalwa': [12.5100, 121.4600],
  'Don Pedro': [12.4900, 121.4400],
  'Maliwanag': [12.5350, 121.4250],
  'Manaul': [12.5450, 121.4350],
  'Panaytayan': [12.5200, 121.4150],
  'Roma': [12.5000, 121.4300],
  'Santa Brigida': [12.5150, 121.4450],
  'Santa Maria': [12.5280, 121.4380],
  'Santa Teresita': [12.5080, 121.4480],
  'Villa Celestial': [12.5320, 121.4280],
  'Wasig': [12.5420, 121.4420],
  'Waygan': [12.5380, 121.4480],
  // Default fallback with slight random offset
  'default': [12.5167, 121.4333],
};

function getCoords(location?: string | null): [number, number] {
  if (!location) return addJitter(MANSALAY_LOCATIONS['default']);
  // Try exact match
  for (const [key, coords] of Object.entries(MANSALAY_LOCATIONS)) {
    if (location.toLowerCase().includes(key.toLowerCase())) {
      return addJitter(coords);
    }
  }
  return addJitter(MANSALAY_LOCATIONS['default']);
}

function addJitter(coords: [number, number]): [number, number] {
  // Add small random offset so markers don't stack exactly
  return [
    coords[0] + (Math.random() - 0.5) * 0.008,
    coords[1] + (Math.random() - 0.5) * 0.008,
  ];
}

type FilterType = 'all' | 'attraction' | 'resort' | 'enterprise';

export function MapExplore() {
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [mapKey, setMapKey] = useState(0); // force re-mount when filter changes

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [attractions, accommodations, products] = await Promise.all([
          getPublicJSON('/attractions').catch(() => []),
          getPublicJSON('/accommodations').catch(() => []),
          getPublicJSON('/products').catch(() => []),
        ]);

        const attractionMarkers = (Array.isArray(attractions) ? attractions : []).map((a: any) => ({
          id: `attraction-${a.id}`,
          lat: getCoords(a.location)[0],
          lng: getCoords(a.location)[1],
          name: a.name,
          type: 'attraction' as const,
          description: a.description,
          image: a.image ? (String(a.image).startsWith('http') ? a.image : `${API_BASE}${a.image}`) : undefined,
        }));

        const resortMarkers = (Array.isArray(accommodations) ? accommodations : [])
          .filter((a: any) => a.type === 'resort_profile' || a.is_registered)
          .map((a: any) => ({
            id: `resort-${a.id}`,
            // Use actual lat/lng if available, otherwise fall back to barangay lookup
            lat: a.latitude ? Number(a.latitude) : getCoords(a.location || a.barangay)[0],
            lng: a.longitude ? Number(a.longitude) : getCoords(a.location || a.barangay)[1],
            name: a.name,
            type: 'resort' as const,
            description: a.description ? a.description.slice(0, 100) + '...' : undefined,
            image: a.image ? (String(a.image).startsWith('http') ? a.image : `${API_BASE}${a.image}`) : undefined,
          }));

        // Get unique enterprise stores from products
        const enterpriseMap = new Map<number, any>();
        (Array.isArray(products) ? products : []).forEach((p: any) => {
          if (p.user_id && !enterpriseMap.has(p.user_id)) {
            enterpriseMap.set(p.user_id, {
              id: `enterprise-${p.user_id}`,
              lat: getCoords(p.barangay)[0],
              lng: getCoords(p.barangay)[1],
              name: p.store_name || p.business_name || 'Local Store',
              type: 'enterprise' as const,
              description: p.store_description || 'Local enterprise in Mansalay',
            });
          }
        });

        setMarkers([...attractionMarkers, ...resortMarkers, ...Array.from(enterpriseMap.values())]);
      } catch (err) {
        console.error('Map data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredMarkers = filter === 'all' ? markers : markers.filter(m => m.type === filter);

  const counts = {
    all: markers.length,
    attraction: markers.filter(m => m.type === 'attraction').length,
    resort: markers.filter(m => m.type === 'resort').length,
    enterprise: markers.filter(m => m.type === 'enterprise').length,
  };

  const handleFilter = (f: FilterType) => {
    setFilter(f);
    setMapKey(prev => prev + 1); // re-mount map with new markers
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Explore Mansalay</h1>
            <p className="text-sm text-muted-foreground">Discover attractions, resorts, and local stores on the map</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all', label: 'All', icon: Filter, color: 'bg-primary text-white' },
          { key: 'attraction', label: 'Attractions', icon: Mountain, color: 'bg-pink-500 text-white' },
          { key: 'resort', label: 'Resorts', icon: Hotel, color: 'bg-green-500 text-white' },
          { key: 'enterprise', label: 'Stores', icon: Store, color: 'bg-blue-500 text-white' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => handleFilter(key as FilterType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === key
                ? color + ' shadow-md scale-105'
                : 'bg-white border-2 border-primary/20 text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
              {counts[key as FilterType]}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-pink-500" />
          <span>Attractions 🏖️</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Resorts 🏨</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Stores 🛍️</span>
        </div>
        <span className="ml-auto">Click a marker to see details</span>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg">
        {loading ? (
          <div className="h-[500px] flex items-center justify-center bg-primary/5">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-primary/30 mb-3 animate-bounce" />
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <MansalayMap
            key={mapKey}
            markers={filteredMarkers}
            height="500px"
            zoom={13}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white border-2 border-pink-100 rounded-xl p-4 text-center">
          <Mountain className="h-6 w-6 text-pink-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-pink-500">{counts.attraction}</p>
          <p className="text-xs text-muted-foreground">Attractions</p>
        </div>
        <div className="bg-white border-2 border-green-100 rounded-xl p-4 text-center">
          <Hotel className="h-6 w-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-500">{counts.resort}</p>
          <p className="text-xs text-muted-foreground">Resorts</p>
        </div>
        <div className="bg-white border-2 border-blue-100 rounded-xl p-4 text-center">
          <Store className="h-6 w-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-500">{counts.enterprise}</p>
          <p className="text-xs text-muted-foreground">Local Stores</p>
        </div>
      </div>
    </div>
  );
}
