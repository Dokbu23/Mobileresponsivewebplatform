import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar,
  CheckCircle2,
  Wand2,
  Edit3,
  MapPin,
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Printer,
  Share2,
  X,
  ChevronRight,
  Check,
  Navigation,
  BookmarkCheck,
  Compass,
  BookmarkPlus,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { getAuthToken, getPublicJSON, formatImageUrl, API_BASE } from '../../lib/api';

interface ActivityItem {
  time: string;
  activity: string;
  location: string;
  notes?: string;
}

interface DailyPlan {
  day: number;
  title: string;
  activities: ActivityItem[];
}

interface ItineraryCard {
  id: string;
  title: string;
  badge?: string;
  category: string;
  duration: string;
  saves: number;
  image: string;
  description: string;
  highlights: string[];
  days: DailyPlan[];
  isOfficial?: boolean;
}

const MANASALAY_LOCATIONS = [
  'Buktot Beach, Mansalay',
  'Sidell Kite Festival Grounds',
  'PGD Beach Marine Sanctuary',
  'Mangyan Cultural Village',
  'Mangyan Burial Cave',
  'Melzar Mountain Trailhead',
  'Mahalta Hills Viewpoint',
  "Nature's Gift Garden & Eco Hub",
  'Hidden Waterfalls Park',
  'Mansalay Town Plaza & Heritage Center',
  'Mansalay Pasalubong Center',
  'MB Hiraya Beachfront'
];

const getUserTripStorageKey = (user: any) => {
  if (user?.id) return `discover-mansalay:custom-trips:user_${user.id}`;
  if (user?.email) return `discover-mansalay:custom-trips:user_${user.email}`;
  return 'discover-mansalay:custom-trips:anonymous';
};

export function Itinerary() {
  const navigate = useNavigate();
  const { currentUser, userType } = useApp();

  const isBusinessOrAdmin =
    userType === 'admin' ||
    userType === 'resort' ||
    userType === 'enterprise' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'resort' ||
    currentUser?.role === 'enterprise';

  const canAccessBuilders = !isBusinessOrAdmin;

  const [myCustomTrips, setMyCustomTrips] = useState<ItineraryCard[]>([]);

  const [officialItineraries, setOfficialItineraries] = useState<ItineraryCard[]>([]);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryCard | null>(null);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);

  // AI Generator Form State
  const [aiTravelStyle, setAiTravelStyle] = useState('Beach & Relaxation');
  const [aiDurationDays, setAiDurationDays] = useState('2');
  const [aiPace, setAiPace] = useState('Relaxed');
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual Builder Form State
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderCategory, setBuilderCategory] = useState('Custom Adventure');
  const [builderDurationDays, setBuilderDurationDays] = useState(2);
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderDays, setBuilderDays] = useState<DailyPlan[]>([
    {
      day: 1,
      title: 'Day 1 Arrival & Exploration',
      activities: [
        { time: '09:00 AM', activity: 'Arrival & Welcome Drinks', location: 'Mansalay Town Center' },
        { time: '02:00 PM', activity: 'Beach Relaxation', location: 'Buktot Beach, Mansalay' }
      ]
    },
    {
      day: 2,
      title: 'Day 2 Cultural Tour & Sunset',
      activities: [
        { time: '10:00 AM', activity: 'Indigenous Village Visit', location: 'Mangyan Cultural Village' },
        { time: '05:00 PM', activity: 'Sunset View & Local Dinner', location: 'Sidell Kite Festival Grounds' }
      ]
    }
  ]);

  // Load Admin Published Itineraries
  const loadOfficialItineraries = async () => {
    setLoadingOfficial(true);
    try {
      let apiItems: any[] = [];
      try {
        const data = await getPublicJSON('/attractions');
        if (Array.isArray(data)) {
          apiItems = data.filter((a: any) => 
            a.category === 'Itinerary' || 
            a.days_count || 
            a.schedule || 
            (typeof a.name === 'string' && a.name.includes('(Itinerary)'))
          );
        }
      } catch (err) {
        console.warn('API fetch notice:', err);
      }

      let localItins: any[] = [];
      try {
        const p1 = localStorage.getItem('discover-mansalay:published_itineraries');
        const p2 = localStorage.getItem('discover-mansalay:custom_itinerarys');
        if (p1) localItins = [...localItins, ...JSON.parse(p1)];
        if (p2) localItins = [...localItins, ...JSON.parse(p2)];
      } catch {}

      let deletedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
      } catch {}

      let archivedIds = new Set<string>();
      try {
        const archStr = localStorage.getItem('discover-mansalay:archived_posts');
        if (archStr) archivedIds = new Set(JSON.parse(archStr).map((id: any) => String(id)));
      } catch {}

      const combinedRaw = [...localItins, ...apiItems].filter((item: any) => {
        const sId = String(item.id);
        return !deletedIds.has(sId) && !archivedIds.has(sId);
      });

      const seenIds = new Set<string>();
      const uniqueItems: any[] = [];
      for (const item of combinedRaw) {
        const sId = String(item.id);
        if (!seenIds.has(sId)) {
          seenIds.add(sId);
          uniqueItems.push(item);
        }
      }

      const mapped: ItineraryCard[] = uniqueItems.map((item: any) => {
        let days: DailyPlan[] = [];
        if (Array.isArray(item.days) && item.days.length > 0) {
          days = item.days;
        } else if (Array.isArray(item.schedule) && item.schedule.length > 0) {
          days = item.schedule.map((ds: any) => ({
            day: ds.day || 1,
            title: `Day ${ds.day || 1} Schedule`,
            activities: [
              ds.morning ? { time: '08:30 AM', activity: ds.morning, location: item.location || 'Mansalay' } : null,
              ds.afternoon ? { time: '01:30 PM', activity: ds.afternoon, location: item.location || 'Mansalay' } : null,
              ds.evening ? { time: '06:30 PM', activity: ds.evening, location: item.location || 'Mansalay' } : null,
            ].filter(Boolean) as ActivityItem[],
          }));
        } else {
          const count = Number(item.days_count || 2);
          for (let d = 1; d <= count; d++) {
            days.push({
              day: d,
              title: `Day ${d} Exploration`,
              activities: [
                { time: '09:00 AM', activity: `Morning Tour - Day ${d}`, location: item.location || 'Mansalay' },
                { time: '02:00 PM', activity: `Afternoon Sightseeing & Local Experience`, location: item.location || 'Mansalay' },
                { time: '06:00 PM', activity: `Evening Sunset & Dinner`, location: item.location || 'Mansalay' },
              ]
            });
          }
        }

        let parsedHighlights: string[] = [];
        if (Array.isArray(item.highlights)) {
          parsedHighlights = item.highlights;
        } else if (typeof item.highlights === 'string' && item.highlights.trim()) {
          parsedHighlights = item.highlights.split('\n').filter((h: string) => h.trim().length > 0);
        } else if (item.description) {
          parsedHighlights = [item.description.slice(0, 60)];
        }

        const rawImg = item.image || (Array.isArray(item.images) ? item.images[0] : '');
        const finalImg = formatImageUrl(rawImg) || '/assets/mansalay_hero_bg.jpg';

        return {
          id: String(item.id),
          title: item.title || item.name || 'Official Mansalay Itinerary',
          badge: item.badge || 'Official Tourism Plan',
          category: item.category || 'Travel Itinerary',
          duration: item.duration || `${item.days_count || days.length || 2} days`,
          saves: Number(item.saves || item.likes || 128),
          image: finalImg,
          description: item.description || item.full_description || 'Curated travel plan by the Mansalay Tourism Office.',
          highlights: parsedHighlights.length > 0 ? parsedHighlights : ['Mansalay Coastal Highlights', 'Cultural Experience', 'Local Cuisine'],
          days,
          isOfficial: true,
        };
      });

      setOfficialItineraries(mapped);
    } catch (e) {
      console.error('Error loading official itineraries:', e);
    } finally {
      setLoadingOfficial(false);
    }
  };

  useEffect(() => {
    loadOfficialItineraries();
    const handleRefresh = () => loadOfficialItineraries();
    window.addEventListener('contentUpdated', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('itineraryUpdated', handleRefresh);
    return () => {
      window.removeEventListener('contentUpdated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('itineraryUpdated', handleRefresh);
    };
  }, []);

  // Load tourist personal saved trips for CURRENT logged-in user only
  useEffect(() => {
    if (!currentUser && !getAuthToken()) {
      setMyCustomTrips([]);
      return;
    }
    const key = getUserTripStorageKey(currentUser);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setMyCustomTrips(JSON.parse(stored));
      } else {
        // One-time migration for current user if old shared storage exists
        const legacyStored = localStorage.getItem('discover-mansalay:custom-trips');
        if (legacyStored && currentUser?.id) {
          const parsed = JSON.parse(legacyStored);
          setMyCustomTrips(parsed);
          localStorage.setItem(key, JSON.stringify(parsed));
          localStorage.removeItem('discover-mansalay:custom-trips');
        } else {
          setMyCustomTrips([]);
        }
      }
    } catch {
      setMyCustomTrips([]);
    }
  }, [currentUser?.id, currentUser?.email]);

  // Persist only to the current user's specific storage key
  useEffect(() => {
    if (!currentUser && !getAuthToken()) return;
    const key = getUserTripStorageKey(currentUser);
    try {
      localStorage.setItem(key, JSON.stringify(myCustomTrips));
    } catch (e) {
      console.error(e);
    }
  }, [myCustomTrips, currentUser?.id, currentUser?.email]);

  // AI Itinerary Generator Logic
  const handleGenerateAiItinerary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const daysCount = parseInt(aiDurationDays, 10);
      const generatedDays: DailyPlan[] = [];

      for (let i = 1; i <= daysCount; i++) {
        generatedDays.push({
          day: i,
          title: `Day ${i}: ${aiTravelStyle} Highlights`,
          activities: [
            {
              time: '08:30 AM',
              activity: `Morning ${aiTravelStyle} Experience`,
              location: MANASALAY_LOCATIONS[(i * 2) % MANASALAY_LOCATIONS.length],
              notes: 'Recommended morning activity with minimal crowds'
            },
            {
              time: '12:30 PM',
              activity: 'Local Mansalay Lunch & Rest',
              location: 'Mansalay Town Center'
            },
            {
              time: '03:30 PM',
              activity: 'Afternoon Sightseeing & Photo Walk',
              location: MANASALAY_LOCATIONS[(i * 2 + 1) % MANASALAY_LOCATIONS.length]
            },
            {
              time: '06:30 PM',
              activity: 'Evening Dinner & Sunset Viewing',
              location: 'Sidell Kite Festival Grounds'
            }
          ]
        });
      }

      const newItinerary: ItineraryCard = {
        id: `ai-itin-${Date.now()}`,
        title: `AI Generated ${aiTravelStyle} (${daysCount} Days)`,
        badge: 'AI Customized',
        category: aiTravelStyle,
        duration: `${daysCount} days`,
        saves: 1,
        image: '/assets/mansalay_hero_bg.jpg',
        description: `Customized ${aiPace.toLowerCase()}-paced itinerary created for ${aiTravelStyle} in Mansalay.`,
        highlights: [
          `Tailored for ${aiTravelStyle}`,
          `${aiPace} exploration pace`,
          `${daysCount}-day full coverage of Mansalay`
        ],
        days: generatedDays
      };

      setMyCustomTrips(prev => [newItinerary, ...prev]);
      setIsGenerating(false);
      setShowAiModal(false);
      setSelectedItinerary(newItinerary);
      toast.success('Your AI itinerary has been generated!');
    }, 1200);
  };

  // Manual Builder Actions
  const handleAddActivity = (dayIndex: number) => {
    setBuilderDays(prev => {
      const next = [...prev];
      next[dayIndex].activities.push({
        time: '02:00 PM',
        activity: 'New Activity',
        location: MANASALAY_LOCATIONS[0]
      });
      return next;
    });
  };

  const handleUpdateActivity = (dayIndex: number, actIndex: number, field: keyof ActivityItem, value: string) => {
    setBuilderDays(prev => {
      const next = [...prev];
      next[dayIndex].activities[actIndex] = {
        ...next[dayIndex].activities[actIndex],
        [field]: value
      };
      return next;
    });
  };

  const handleRemoveActivity = (dayIndex: number, actIndex: number) => {
    setBuilderDays(prev => {
      const next = [...prev];
      next[dayIndex].activities = next[dayIndex].activities.filter((_, idx) => idx !== actIndex);
      return next;
    });
  };

  const handleAddDay = () => {
    setBuilderDays(prev => [
      ...prev,
      {
        day: prev.length + 1,
        title: `Day ${prev.length + 1} Mansalay Tour`,
        activities: [
          { time: '09:00 AM', activity: 'Morning Activity', location: MANASALAY_LOCATIONS[0] }
        ]
      }
    ]);
    setBuilderDurationDays(prev => prev + 1);
  };

  const handleSaveCustomBuilder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderTitle.trim()) {
      toast.error('Please enter a title for your trip.');
      return;
    }

    const customCard: ItineraryCard = {
      id: `custom-itin-${Date.now()}`,
      title: builderTitle,
      badge: 'My Custom Trip',
      category: builderCategory,
      duration: `${builderDays.length} days`,
      saves: 1,
      image: '/assets/mansalay_hero_bg.jpg',
      description: builderDescription || 'Personalized custom travel itinerary built with Mansalay Trip Planner.',
      highlights: builderDays.map(d => `${d.title} (${d.activities.length} spots)`),
      days: builderDays
    };

    setMyCustomTrips(prev => [customCard, ...prev]);
    setShowBuilderModal(false);
    setSelectedItinerary(customCard);
    toast.success('Custom itinerary saved successfully!');

    // Reset form
    setBuilderTitle('');
    setBuilderDescription('');
  };

  const handleDeleteCustomTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMyCustomTrips(prev => prev.filter(t => t.id !== id));
    if (selectedItinerary?.id === id) {
      setSelectedItinerary(null);
    }
    toast.success('Trip deleted');
  };

  const handleSaveOfficialToMyTrips = (officialTrip: ItineraryCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAlreadySaved = myCustomTrips.some(t => t.id === `saved-${officialTrip.id}` || t.title === officialTrip.title);
    if (isAlreadySaved) {
      toast.info('This itinerary is already in your My Trips list!');
      return;
    }
    const copiedTrip: ItineraryCard = {
      ...officialTrip,
      id: `saved-${officialTrip.id}-${Date.now()}`,
      badge: 'Saved Official Plan',
    };
    setMyCustomTrips(prev => [copiedTrip, ...prev]);
    toast.success(`"${officialTrip.title}" saved to your trips!`);
  };

  const handlePrintItinerary = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-16 font-sans">
      {/* Top Header Section (Attractions-style header) */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Trip Itinerary Planner
              </h1>
            </div>
            <p className="text-gray-500 text-sm pl-4">
              {canAccessBuilders
                ? 'Explore official recommended itineraries curated by the Tourism Office, or generate your custom schedule.'
                : 'Explore official recommended itineraries and travel routes curated by the Mansalay Tourism Office.'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── 1. OFFICIAL TOURISM ITINERARIES (PUBLISHED BY ADMIN) ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Compass className="h-4 w-4" />
                <span>Official Tourism Routes</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                Official Mansalay Itineraries ({officialItineraries.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Handcrafted recommended itineraries created by the Mansalay Tourism Office</p>
            </div>
          </div>

          {loadingOfficial ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-medium">Loading official itineraries...</p>
            </div>
          ) : officialItineraries.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center max-w-md mx-auto shadow-xs">
              <Compass className="h-10 w-10 text-pink-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Official Itineraries Yet</h3>
              <p className="text-xs text-gray-500 mt-1">
                The Tourism Office is preparing exciting new travel routes for Mansalay.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {officialItineraries.map(trip => (
                <div
                  key={trip.id}
                  onClick={() => setSelectedItinerary(trip)}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    <img
                      src={trip.image}
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-3 py-1 bg-pink-500 text-white text-[10px] font-extrabold rounded-full shadow-md uppercase tracking-wider">
                        {trip.badge || 'Official Plan'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                      <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px]">
                        <Clock className="h-3 w-3 text-pink-400" />
                        {trip.duration}
                      </span>
                      <span className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px]">
                        {trip.days?.length || 2} Days Schedule
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 group-hover:text-pink-600 transition-colors mb-1.5 line-clamp-1">
                        {trip.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                        {trip.description}
                      </p>

                      {trip.highlights && trip.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {trip.highlights.slice(0, 3).map((h, i) => (
                            <span key={i} className="text-[10px] bg-pink-50 text-pink-700 font-semibold px-2.5 py-0.5 rounded-full border border-pink-100 line-clamp-1">
                              ✓ {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItinerary(trip);
                        }}
                        className="flex-1 py-2.5 bg-gray-900 hover:bg-pink-600 text-white font-bold rounded-full text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>View Schedule</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      {canAccessBuilders && (
                        <button
                          onClick={(e) => handleSaveOfficialToMyTrips(trip, e)}
                          className="p-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-full border border-pink-200 transition-colors flex-shrink-0"
                          title="Save copy to My Trips"
                        >
                          <BookmarkPlus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── MY TRIPS & SAVED ITINERARIES (Tourists Only) ── */}
        {canAccessBuilders && (
          <section className="mb-16">
            <div className="flex items-center gap-2 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <BookmarkCheck className="h-4 w-4" />
              <span>Private Itinerary Collection</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">
              My Saved Trips & Itineraries ({myCustomTrips.length})
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              Private to your tourist account ({currentUser?.name || currentUser?.email || 'My Account'}) — only you can view and manage these saved schedules.
            </p>

            {myCustomTrips.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center max-w-md mx-auto shadow-xs">
                <Calendar className="h-10 w-10 text-pink-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-800">No Custom Trips Yet</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Use the interactive options below to auto-generate with AI or build your schedule manually.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Render Custom Built / AI Generated Trips */}
                {myCustomTrips.map(trip => (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedItinerary(trip)}
                    className="bg-white rounded-3xl overflow-hidden border border-pink-100 shadow-sm hover:shadow-xl transition-all cursor-pointer p-5 flex flex-col justify-between relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-3 py-1 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full uppercase">
                          {trip.badge || 'Custom Trip'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDeleteCustomTrip(trip.id, e)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                            title="Delete trip"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-extrabold text-gray-900 group-hover:text-pink-600 transition-colors mb-1">
                        {trip.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4">{trip.description}</p>

                      <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-gray-700">
                          <span>Duration:</span>
                          <span className="text-pink-600">{trip.duration}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500 text-[11px]">
                          <span>Daily Days:</span>
                          <span>{trip.days?.length || 0} Days Plan</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItinerary(trip);
                      }}
                      className="mt-4 w-full py-2.5 bg-gray-900 hover:bg-pink-500 text-white font-bold rounded-full text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>View Full Schedule</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── 3. DYNAMIC TRIP GENERATOR & BUILDER CALLOUT (Tourists Only) ── */}
        {canAccessBuilders && (
          <section className="bg-gradient-to-r from-pink-50/70 via-rose-50/50 to-pink-50/70 border border-pink-100 rounded-3xl p-6 sm:p-10 text-center">
            <div className="flex items-center justify-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Interactive Builders</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Build & Customize Your Mansalay Trip</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-8">
              Let our AI auto-generate an itinerary based on your preferences or hand-pick every location manually.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Smart Generator Option */}
              <div
                onClick={() => setShowAiModal(true)}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-pink-300 transition-all cursor-pointer text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wand2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Smart AI Generator</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-6">
                    Select your travel style, duration, and pace to auto-build a day-by-day customized Mansalay itinerary.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-pink-500 pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-1">✨ AI-powered</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Manual Builder Option */}
              <div
                onClick={() => setShowBuilderModal(true)}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-pink-300 transition-all cursor-pointer text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Edit3 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Custom Manual Builder</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-6">
                    Hand-pick your favorite attractions and accommodations from Mansalay to create your custom trip schedule.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-pink-500 pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-1">📋 Custom Builder</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* ── MODAL 1: ITINERARY DETAIL MODAL ── */}
      {selectedItinerary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="relative h-48 bg-gray-900 flex-shrink-0">
              <img
                src={selectedItinerary.image}
                alt={selectedItinerary.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
              
              <button
                onClick={() => setSelectedItinerary(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 text-white flex items-end justify-between">
                <div>
                  <span className="px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full uppercase">
                    {selectedItinerary.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold mt-1.5">{selectedItinerary.title}</h2>
                  <p className="text-xs text-gray-300 flex items-center gap-2 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-pink-400" /> {selectedItinerary.duration}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintItinerary}
                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full backdrop-blur-md transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print / PDF
                  </button>
                  {canAccessBuilders && (
                    <button
                      onClick={(e) => handleSaveOfficialToMyTrips(selectedItinerary, e)}
                      className="px-3.5 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-full shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" /> Save to My Trips
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Days Schedule Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <p className="text-xs text-gray-600 leading-relaxed bg-pink-50/50 p-3.5 rounded-2xl border border-pink-100">
                {selectedItinerary.description}
              </p>

              <div className="space-y-6">
                {selectedItinerary.days.map((dayPlan) => (
                  <div key={dayPlan.day} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                    <h3 className="text-sm font-extrabold text-pink-600 flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">
                        {dayPlan.day}
                      </span>
                      <span>{dayPlan.title}</span>
                    </h3>

                    <div className="space-y-3 relative border-l-2 border-pink-200 ml-3 pl-4">
                      {dayPlan.activities.map((act, actIdx) => (
                        <div key={actIdx} className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-pink-500 border-2 border-white" />
                          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                                <span className="text-pink-500 text-[11px] font-semibold">{act.time}</span>
                                <span>•</span>
                                <span>{act.activity}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                                <MapPin className="h-3 w-3 text-pink-400" />
                                <span>{act.location}</span>
                              </div>
                              {act.notes && (
                                <p className="text-[10px] text-gray-400 italic mt-1">{act.notes}</p>
                              )}
                            </div>

                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(act.location)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-full text-[11px] font-bold flex items-center gap-1 self-start sm:self-center transition-colors"
                            >
                              <Navigation className="h-3 w-3" /> Map
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
              {selectedItinerary.isOfficial ? (
                <button
                  onClick={(e) => {
                    handleSaveOfficialToMyTrips(selectedItinerary, e);
                  }}
                  className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  <span>Save to My Trips</span>
                </button>
              ) : (
                <span className="text-xs text-gray-400 font-medium">Mansalay Tourism Travel Guide</span>
              )}
              <button
                onClick={() => setSelectedItinerary(null)}
                className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: AI SMART GENERATOR MODAL ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-pink-500">
                <Wand2 className="h-5 w-5" />
                <h3 className="text-lg font-bold text-gray-900">AI Trip Generator</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              Customize your trip criteria and let AI auto-generate an optimized schedule for your Mansalay visit.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Travel Style</label>
                <select
                  value={aiTravelStyle}
                  onChange={(e) => setAiTravelStyle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-hidden font-medium"
                >
                  <option value="Beach & Relaxation">Beach & Relaxation</option>
                  <option value="Cultural & Heritage">Cultural & Heritage</option>
                  <option value="Adventure & Nature">Adventure & Nature Trekking</option>
                  <option value="Food & Local Craft">Food & Local Craft Tour</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Trip Duration</label>
                <select
                  value={aiDurationDays}
                  onChange={(e) => setAiDurationDays(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-hidden font-medium"
                >
                  <option value="1">1 Day Express Tour</option>
                  <option value="2">2 Days Weekend Getaway</option>
                  <option value="3">3 Days Exploration</option>
                  <option value="4">4 Days Extended Adventure</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Pace</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Relaxed', 'Moderate', 'Active'].map((pace) => (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => setAiPace(pace)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        aiPace === pace
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      {pace}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowAiModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAiItinerary}
                disabled={isGenerating}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold shadow-md shadow-pink-500/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MANUAL BUILDER MODAL ── */}
      {showBuilderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveCustomBuilder}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-pink-500">
                <Edit3 className="h-5 w-5" />
                <h3 className="text-lg font-bold text-gray-900">Custom Trip Builder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Trip Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Mansalay Beach & Mountain Tour"
                  value={builderTitle}
                  onChange={(e) => setBuilderTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={builderCategory}
                    onChange={(e) => setBuilderCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-hidden font-medium"
                  >
                    <option value="Custom Adventure">Custom Adventure</option>
                    <option value="Beach Getaway">Beach Getaway</option>
                    <option value="Cultural Heritage">Cultural Heritage</option>
                    <option value="Family Holiday">Family Holiday</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Short Description</label>
                  <input
                    type="text"
                    placeholder="Brief summary of your trip"
                    value={builderDescription}
                    onChange={(e) => setBuilderDescription(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Dynamic Days Builder */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-gray-900 text-sm">Day-by-Day Schedule</h4>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full font-bold text-xs flex items-center gap-1 hover:bg-pink-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Day
                  </button>
                </div>

                {builderDays.map((d, dayIdx) => (
                  <div key={dayIdx} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={d.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuilderDays(prev => {
                            const next = [...prev];
                            next[dayIdx].title = val;
                            return next;
                          });
                        }}
                        className="font-extrabold text-pink-600 bg-transparent border-b border-pink-200 focus:outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddActivity(dayIdx)}
                        className="text-[11px] font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Spot
                      </button>
                    </div>

                    <div className="space-y-2">
                      {d.activities.map((act, actIdx) => (
                        <div key={actIdx} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                          <input
                            type="text"
                            value={act.time}
                            onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'time', e.target.value)}
                            className="w-20 p-1 border border-gray-200 rounded-md text-[11px] font-semibold"
                          />
                          <input
                            type="text"
                            value={act.activity}
                            onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'activity', e.target.value)}
                            className="flex-1 p-1 border border-gray-200 rounded-md text-[11px] font-semibold"
                          />
                          <select
                            value={act.location}
                            onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'location', e.target.value)}
                            className="w-36 p-1 border border-gray-200 rounded-md text-[11px]"
                          >
                            {MANASALAY_LOCATIONS.map((loc, i) => (
                              <option key={i} value={loc}>{loc}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveActivity(dayIdx, actIdx)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold shadow-md shadow-pink-500/20 flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Save Itinerary</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
