import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Clock, X, Star, Share2, Heart, Search, ChevronLeft, ChevronRight, Navigation, Filter, ChevronDown } from 'lucide-react';
import { API_BASE, getPublicJSON } from '../../lib/api';
import { ShareModal } from '../../components/ShareModal';
import { AutoSwipeCarousel } from '../../components/AutoSwipeCarousel';
import { useApp } from '../../context/AppContext';

interface EventType {
  id: string;
  name: string;
  description?: string;
  fullDescription?: string;
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  images?: string[];
  category?: string;
  capacity?: string;
  rating?: number;
  badges?: string[];
  tags?: string[];
}

export function Events() {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [items, setItems] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Upcoming' | 'Recent' | 'Past'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await getPublicJSON('/events');
      const raw = Array.isArray(data) ? data : data?.data ?? [];

      let customEvents: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_events');
        if (stored) customEvents = JSON.parse(stored);
      } catch {}

      let deletedIds = new Set<string>();
      let archivedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
        const archStr = localStorage.getItem('discover-mansalay:archived_posts');
        if (archStr) archivedIds = new Set(JSON.parse(archStr).map((id: any) => String(id)));
      } catch {}

      const allRaw = [...raw].filter((i: any) => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)));
      const existingIds = new Set(allRaw.map((r: any) => String(r.id)));
      customEvents.forEach((ce: any) => {
        if (!existingIds.has(String(ce.id)) && !deletedIds.has(String(ce.id)) && !archivedIds.has(String(ce.id))) {
          allRaw.unshift(ce);
        }
      });

      const mapped = allRaw.map((d: any) => {
        const mainImg = d.image
          ? (String(d.image).startsWith('http') || String(d.image).startsWith('/assets') ? d.image : `${API_BASE}${d.image}`)
          : '/assets/mansalay_hero_bg.jpg';
        const imgList = Array.isArray(d.images) && d.images.length > 0
          ? d.images.map((img: any) => String(img).startsWith('http') || String(img).startsWith('/assets') ? img : `${API_BASE}${img}`)
          : [mainImg];

        return {
          ...d,
          id: String(d.id),
          name: d.name || 'Event',
          date: d.date || '',
          time: d.time || '',
          location: d.location || 'Mansalay, Oriental Mindoro',
          category: d.category || 'Festival',
          rating: d.rating || 4.8,
          description: d.description || '',
          fullDescription: d.full_description ?? d.fullDescription ?? d.description ?? '',
          image: mainImg,
          images: imgList,
          badges: d.category ? ['Upcoming', d.category] : ['Upcoming', 'Event'],
          tags: [d.category || 'Event', 'Mansalay', 'Community']
        };
      });
      setItems(mapped);
    } catch (err) {
      console.error('Error fetching real events:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    window.addEventListener('contentUpdated', loadEvents);
    window.addEventListener('storage', loadEvents);
    return () => {
      window.removeEventListener('contentUpdated', loadEvents);
      window.removeEventListener('storage', loadEvents);
    };
  }, []);

  const toggleSaveEvent = (event: EventType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isInWishlist(event.id, 'event')) {
      removeFromWishlist(event.id, 'event');
    } else {
      addToWishlist({
        id: event.id,
        type: 'event',
        title: event.name,
        image: event.image,
        category: event.category,
      });
    }
  };

  // Dynamic Categories list derived from real API data
  const categoriesList = useMemo(() => {
    const cats = Array.from(new Set(items.map(ev => ev.category).filter((c): c is string => Boolean(c))));
    return cats.filter(c => c && c.toLowerCase() !== 'static' && c.trim() !== '');
  }, [items]);

  // Filtered Events
  const filteredEvents = items.filter(ev => {
    // Search query filter
    const matchesSearch = !searchQuery || 
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.category && ev.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const matchesCategory = categoryFilter === 'All' || ev.category === categoryFilter;

    // Status filter
    const eventDate = ev.date ? new Date(ev.date) : null;
    const now = new Date();
    let matchesStatus = true;
    if (statusFilter === 'Upcoming') matchesStatus = Boolean(eventDate && eventDate >= now);
    if (statusFilter === 'Past') matchesStatus = Boolean(eventDate && eventDate < now);
    if (statusFilter === 'Recent') matchesStatus = true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50/40 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ── HEADER TITLE & SEARCH ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Events</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium pl-4.5">
              Discover upcoming events and festivals in Mansalay
            </p>
          </div>

          {/* Search Input & Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events or location..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder:text-gray-400 shadow-2xs outline-none transition-all"
              />
            </div>

            <div className="relative w-full sm:w-36">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-4 pr-8 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-semibold text-gray-700 shadow-2xs outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="All">All Events</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Recent">Recent</option>
                <option value="Past">Past</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-44">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-semibold text-gray-700 shadow-2xs outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="All">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── EVENT COUNT ── */}
        <p className="text-xs font-semibold text-gray-400 mb-4">
          Showing <span className="text-gray-900 font-bold">{filteredEvents.length}</span> events
        </p>

        {/* ── EVENT CARDS GRID (4 COLUMNS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredEvents.map(event => {
            const isSaved = savedEventIds.includes(event.id);
            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Top Image Box */}
                <div className="relative h-64 bg-gray-900 overflow-hidden">
                  <img
                    src={event.image || '/assets/mansalay_hero_bg.jpg'}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                  />

                  {/* Top Left Stacked Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isPast = event.date && new Date(event.date) < today;
                      return (
                        <span className={`px-3 py-0.5 text-[10px] font-extrabold rounded-full backdrop-blur-md ${
                          isPast
                            ? 'bg-slate-700/90 text-white shadow-xs'
                            : 'bg-emerald-400/95 text-emerald-950'
                        }`}>
                          {isPast ? 'Past' : 'Upcoming'}
                        </span>
                      );
                    })()}
                    {event.category && (
                      <span className="px-3 py-0.5 bg-pink-500 text-white text-[10px] font-extrabold rounded-full shadow-xs uppercase">
                        {event.category}
                      </span>
                    )}
                  </div>

                  {/* Top Right Wishlist Heart */}
                  <button
                    onClick={(e) => toggleSaveEvent(event, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-sm flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist(event.id, 'event') ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
                  </button>

                  {/* Dark Bottom Overlay with Title & Date */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/90 via-gray-950/50 to-transparent p-4">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-300 mt-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                      <span>{event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Upcoming'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Bar */}
                <div className="p-3.5 bg-white flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>{event.time || '9:00 AM – 5:00 PM'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-700">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{event.rating || '4.8'}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareData({
                          title: event.name,
                          description: event.description,
                          image: event.image,
                          category: event.category || 'Event',
                        });
                      }}
                      className="text-pink-500 hover:text-pink-600 transition-colors p-1 hover:scale-110"
                      title="Share event"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEvents.length === 0 && !loading && (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center my-8">
            <Calendar className="h-12 w-12 mx-auto text-pink-300 mb-3" />
            <h3 className="text-base font-bold text-gray-900">No events match your criteria</h3>
            <p className="text-xs text-gray-500 mt-1">Try clearing your filters or changing your search terms.</p>
          </div>
        )}
      </div>

      {/* ── EVENT DETAIL MODAL (Exact FIGMA Screenshot 2 Design) ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Carousel Image Box */}
            <div className="relative h-72 bg-gray-900 overflow-hidden flex-shrink-0">
              <AutoSwipeCarousel
                images={selectedEvent.images && selectedEvent.images.length > 0 ? selectedEvent.images : [selectedEvent.image || '/assets/mansalay_hero_bg.jpg']}
                alt={selectedEvent.name}
                className="w-full h-full"
                intervalMs={3500}
                showDots={true}
                showArrows={true}
              />

              {/* Close Button */}
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Badges on Top Left */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = selectedEvent.date && new Date(selectedEvent.date) < today;
                  return (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                      isPast ? 'bg-slate-700 text-white shadow-xs' : 'bg-emerald-500 text-white shadow-xs'
                    }`}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                  );
                })()}
                {selectedEvent.category && (
                  <span className="px-3 py-1 bg-pink-500 text-white text-xs font-bold rounded-full uppercase">
                    {selectedEvent.category}
                  </span>
                )}
              </div>

              {/* Bottom Carousel Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span className="w-2 h-2 rounded-full bg-white/50"></span>
                <span className="w-2 h-2 rounded-full bg-white/50"></span>
              </div>
            </div>

            {/* Bottom Content Info */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                  {selectedEvent.name}
                </h2>
                
                {/* Meta details row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold mt-2">
                  <div className="flex items-center gap-1 text-pink-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 15, 2026'}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{selectedEvent.time || '9:00 AM – 9:00 PM'}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{selectedEvent.rating || '4.9'}</span>
                  </div>
                </div>
              </div>

              {/* Location & Directions Button */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <MapPin className="h-4 w-4 text-pink-500" />
                  <span>{selectedEvent.location || 'Town Plaza, Mansalay'}</span>
                </div>
                <button
                  onClick={() => alert(`Navigating to ${selectedEvent.location || 'Town Plaza, Mansalay'}`)}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Navigation className="h-3 w-3" />
                  <span>Directions</span>
                </button>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                {selectedEvent.fullDescription || selectedEvent.description}
              </p>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(selectedEvent.tags || ['Cultural', 'Festival', 'Heritage', 'Community']).map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[11px] font-semibold border border-pink-100">
                    🏷️ {tag}
                  </span>
                ))}
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => toggleSaveEvent(selectedEvent)}
                  className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    savedEventIds.includes(selectedEvent.id)
                      ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20'
                      : 'border-pink-300 text-pink-600 hover:bg-pink-50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${savedEventIds.includes(selectedEvent.id) ? 'fill-white' : ''}`} />
                  <span>{savedEventIds.includes(selectedEvent.id) ? 'Saved' : 'Save Event'}</span>
                </button>

                <button
                  onClick={() => {
                    setShareData({
                      title: selectedEvent.name,
                      description: selectedEvent.description,
                      image: selectedEvent.image,
                      category: selectedEvent.category || 'Event',
                    });
                  }}
                  className="px-6 py-2.5 border border-pink-300 text-pink-600 hover:bg-pink-50 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SOCIAL SHARE MODAL ── */}
      {shareData && (
        <ShareModal
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          title={shareData.title}
          description={shareData.description}
          image={shareData.image}
          category={shareData.category}
        />
      )}
    </div>
  );
}
