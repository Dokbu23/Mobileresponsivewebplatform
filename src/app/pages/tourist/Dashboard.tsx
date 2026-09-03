import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  MapPin, Calendar, Hotel, ArrowRight,
  Star, Package, Sparkles, Compass, Utensils,
  Clock, TrendingUp, User, Play, ChevronLeft, ChevronRight,
  Users, Waves, Trees, Info, Heart, Share2, Eye, Camera, CheckCircle, X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API_BASE, getPublicJSON, postJSON, formatImageUrl, getAuthToken, decodeHtml } from '../../lib/api';
import { DetailModal, DetailModalItem } from '../../components/DetailModal';
import { ShareModal } from '../../components/ShareModal';
import { isBerMonths } from '../../components/ChristmasHolidayTheme';
import { toast } from 'sonner';

export function Dashboard() {
  const navigate = useNavigate();
  const { userType, currentUser } = useApp();
  const isHoliday = isBerMonths();
  const [attractions, setAttractions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Detail modal state
  const [modalItem, setModalItem] = useState<DetailModalItem | null>(null);
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Gallery active index state
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  // Active Homepage Hero Background Video
  const [heroVideo, setHeroVideo] = useState<string | null>(() => {
    return localStorage.getItem('discover-mansalay:heroVideo');
  });

  useEffect(() => {
    const syncHeroVideo = () => {
      setHeroVideo(localStorage.getItem('discover-mansalay:heroVideo'));
    };
    window.addEventListener('heroVideoUpdated', syncHeroVideo);
    window.addEventListener('storage', syncHeroVideo);
    return () => {
      window.removeEventListener('heroVideoUpdated', syncHeroVideo);
      window.removeEventListener('storage', syncHeroVideo);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [attractionsRes, productsRes, accommodationsRes, eventsRes, heroVideoRes, statsRes] = await Promise.all([
        getPublicJSON('/attractions').catch(() => []),
        getPublicJSON('/products').catch(() => []),
        getPublicJSON('/accommodations').catch(() => []),
        getPublicJSON('/events').catch(() => []),
        getPublicJSON('/hero-video').catch(() => null),
        getPublicJSON('/stats').catch(() => null),
      ]);

      if (statsRes?.success && statsRes?.stats) {
        setStats(statsRes.stats);
      } else if (statsRes?.stats) {
        setStats(statsRes.stats);
      }

      let customAttractions: any[] = [];
      let customResorts: any[] = [];
      let customEvents: any[] = [];
      let customProducts: any[] = [];
      let deletedIds = new Set<string>();
      let archivedIds = new Set<string>();

      try {
        const a = localStorage.getItem('discover-mansalay:custom_attractions');
        if (a) customAttractions = JSON.parse(a);
        const r = localStorage.getItem('discover-mansalay:custom_resorts');
        if (r) customResorts = JSON.parse(r);
        const e = localStorage.getItem('discover-mansalay:custom_events');
        if (e) customEvents = JSON.parse(e);
        const p = localStorage.getItem('discover-mansalay:custom_products');
        if (p) customProducts = JSON.parse(p);
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
        const archStr = localStorage.getItem('discover-mansalay:archived_posts');
        if (archStr) archivedIds = new Set(JSON.parse(archStr).map((id: any) => String(id)));
      } catch {}

      const rawAttr = Array.isArray(attractionsRes) ? attractionsRes : attractionsRes?.data ?? [];
      const rawProd = Array.isArray(productsRes) ? productsRes : productsRes?.data ?? [];
      const rawAcc = Array.isArray(accommodationsRes) ? accommodationsRes : accommodationsRes?.data ?? [];
      const rawEvt = Array.isArray(eventsRes) ? eventsRes : eventsRes?.data ?? [];

      const mergeSection = (apiList: any[], customList: any[]) => {
        const combined = [...apiList];
        const existingIds = new Set(combined.map(i => String(i.id)));
        customList.forEach(c => {
          if (!existingIds.has(String(c.id))) combined.unshift(c);
        });
        return combined
          .filter(i => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)))
          .map(i => ({
            ...i,
            name: i.name ? decodeHtml(i.name) : i.name,
            title: i.title ? decodeHtml(i.title) : i.title,
            resort_name: i.resort_name ? decodeHtml(i.resort_name) : i.resort_name,
            description: i.description ? decodeHtml(i.description) : i.description,
          }));
      };

      setAttractions(mergeSection(rawAttr, customAttractions));
      setProducts(mergeSection(rawProd, customProducts));
      setAccommodations(mergeSection(rawAcc, customResorts));
      setEvents(mergeSection(rawEvt, customEvents));

      if (heroVideoRes?.video) {
        setHeroVideo(heroVideoRes.video);
        localStorage.setItem('discover-mansalay:heroVideo', heroVideoRes.video);
      }
    } catch {
      setAttractions([]);
      setProducts([]);
      setAccommodations([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('contentUpdated', loadDashboardData);
    window.addEventListener('storage', loadDashboardData);
    return () => {
      window.removeEventListener('contentUpdated', loadDashboardData);
      window.removeEventListener('storage', loadDashboardData);
    };
  }, []);

  // Number formatting helper for stats
  const formatCount = (count?: number | null) => {
    const n = Number(count) || 0;
    if (n <= 0) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M+`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K+`;
    return `${n}+`;
  };

  // Get image helper
  const getImageUrl = (img: string | null | undefined, fallback: string = '/assets/mansalay_hero_bg.jpg') => {
    return formatImageUrl(img) || fallback;
  };

  // 1. Explore Mansalay (Top Picks) — show ALL items
  const topPicks = attractions.length > 0 || accommodations.length > 0
    ? [...attractions, ...accommodations]
    : [];

  // Auto-swipe carousel state for Top Picks
  const [topPickIdx, setTopPickIdx] = useState(0);
  const [topPickPaused, setTopPickPaused] = useState(false);
  const topPickRef = useRef<HTMLDivElement>(null);

  // Responsive: cards visible at once
  const getVisibleCards = useCallback(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }, []);
  const [visibleCards, setVisibleCards] = useState(getVisibleCards);

  useEffect(() => {
    const handleResize = () => setVisibleCards(getVisibleCards());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getVisibleCards]);

  const topPickMaxIdx = Math.max(0, topPicks.length - visibleCards);

  // Auto-slide every 4s
  useEffect(() => {
    if (topPicks.length <= visibleCards || topPickPaused) return;
    const timer = setInterval(() => {
      setTopPickIdx(prev => (prev >= topPickMaxIdx ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [topPicks.length, visibleCards, topPickPaused, topPickMaxIdx]);

  // 2. Featured Beaches (Sun & Sand)
  const featuredBeaches = attractions.filter((a) => {
    const cat = String(a.category || '').toLowerCase();
    const name = String(a.name || '').toLowerCase();
    const desc = String(a.description || '').toLowerCase();
    const loc = String(a.location || '').toLowerCase();
    return cat.includes('beach') || name.includes('beach') || desc.includes('beach') || desc.includes('sand') || loc.includes('beach');
  }).slice(0, 4);

  const displayBeaches = featuredBeaches.length > 0 ? featuredBeaches : attractions.slice(0, 4);

  // 3. Featured Resorts (Where to Stay)
  const featuredResorts = accommodations.slice(0, 4);

  // 4. Popular Attractions (Must See)
  const popularAttractions = attractions
    .filter((a) => a.category !== 'Itinerary' && !a.days_count)
    .slice(0, 4);

  // 5. Upcoming & Past Events — split by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter(e => {
    if (!e.date) return true; // no date = upcoming by default
    return new Date(e.date) >= today;
  });
  const pastEvents = events.filter(e => {
    if (!e.date) return false;
    return new Date(e.date) < today;
  });

  // Pagination for event columns (2 per page)
  const EVENTS_PER_PAGE = 2;
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [pastPage, setPastPage] = useState(0);
  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingEvents.length / EVENTS_PER_PAGE));
  const pastTotalPages = Math.max(1, Math.ceil(pastEvents.length / EVENTS_PER_PAGE));
  const pagedUpcoming = upcomingEvents.slice(upcomingPage * EVENTS_PER_PAGE, (upcomingPage + 1) * EVENTS_PER_PAGE);
  const pagedPast = pastEvents.slice(pastPage * EVENTS_PER_PAGE, (pastPage + 1) * EVENTS_PER_PAGE);


  // 6. Trending Now
  const trendingNowItems = [...attractions, ...accommodations, ...products]
    .sort((a, b) => Number(b.view_count || b.likes || 0) - Number(a.view_count || a.likes || 0))
    .slice(0, 3);

  // 7. Most Wishlisted
  const mostWishlistedItems = [...attractions, ...accommodations, ...products]
    .sort((a, b) => Number(b.likes || b.rating || 0) - Number(a.likes || a.rating || 0))
    .slice(0, 3);

  // 8. Dynamic Gallery Images
  const galleryImages = (() => {
    const allWithImages = [...attractions, ...accommodations].filter((a) => a.image);
    const mapped = allWithImages.map((a) => ({
      src: getImageUrl(a.image),
      title: a.name || a.resort_name || 'Mansalay Attraction',
    }));
    if (mapped.length > 0) return mapped.slice(0, 6);
    return [
      { src: '/assets/mansalay_hero_bg.jpg', title: 'Mansalay' }
    ];
  })();

  const getGalleryImgSrc = (index: number) => {
    return galleryImages[index]?.src || '/assets/mansalay_hero_bg.jpg';
  };

  // Card click handlers
  const openAttractionModal = (a: any) => {
    setModalItem({
      id: String(a.id),
      type: 'attraction',
      name: a.name,
      image: getImageUrl(a.image, '/assets/mansalay_hero_bg.jpg'),
      description: a.description,
      fullDescription: a.full_description ?? a.fullDescription,
      location: a.location,
      category: a.category,
    });
    // Record view in database
    postJSON(`/public/attractions/${a.id}/view`, {}, false).catch(() => {});
  };

  const openAccommodationModal = (acc: any) => {
    setModalItem({
      id: String(acc.id),
      type: 'accommodation',
      name: acc.name || acc.resort_name || 'Accommodation',
      image: getImageUrl(acc.image || (Array.isArray(acc.resort_images) ? acc.resort_images[0] : null)),
      description: acc.description,
      pricePerNight: Number(acc.pricePerNight || acc.price_per_night || 0),
      location: acc.location,
      user_id: acc.user_id,
      is_registered: acc.is_registered,
    });
  };

  const openEventModal = (e: any) => {
    setModalItem({
      id: String(e.id),
      type: 'event',
      name: e.name,
      image: getImageUrl(e.image),
      description: e.description,
      fullDescription: e.full_description ?? e.fullDescription,
      category: e.category,
      date: e.date,
      time: e.time,
      location: e.location,
      capacity: e.capacity,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans pb-16">
      
      {/* ── 1. HERO SECTION ── */}
      <section className="relative w-full h-[520px] md:h-[580px] overflow-hidden bg-gray-950 flex items-center">
        {/* Background Hero Image */}
        <img
          src="/assets/mansalay_hero_bg.jpg"
          alt="Discover Mansalay"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 animate-in fade-in duration-700"
        />
        {/* Dark Left-to-Right Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/65 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent z-10" />

        {/* Hero Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            {/* Small Pink / Holiday Label */}
            {isHoliday ? (
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-gradient-to-r from-red-600 via-pink-600 to-emerald-700 text-white text-xs font-extrabold rounded-full shadow-lg border border-red-400/50">
                <span>🎄</span>
                <span>Maligayang Pasko sa Mansalay!</span>
                <span className="text-yellow-300">✨</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-0.5 bg-pink-500 rounded-full"></span>
                <span className="text-pink-400 font-bold text-xs uppercase tracking-widest">
                  Oriental Mindoro
                </span>
              </div>
            )}

            {/* Main Heading with Santa Hat */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-4">
              <span className="relative inline-block">
                Discover
                {isHoliday && (
                  <span className="absolute -top-7 sm:-top-9 -left-3 text-3xl sm:text-4xl select-none pointer-events-none transform -rotate-12 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                    🎅
                  </span>
                )}
              </span>{' '}
              <span className="text-pink-400 font-black relative inline-block">
                Mansalay
                {isHoliday && (
                  <span className="absolute -top-2 -right-4 text-xs sm:text-sm select-none pointer-events-none animate-spin" style={{ animationDuration: '8s' }}>
                    ❄️
                  </span>
                )}
              </span>
            </h1>

            {/* Subtext Paragraph */}
            <p className="text-sm sm:text-base text-gray-200 font-medium leading-relaxed mb-8 max-w-xl">
              Explore breathtaking beaches, immerse in indigenous culture, and discover the untouched paradise of Oriental Mindoro.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/attractions"
                className={`px-7 py-3.5 font-bold rounded-full text-sm flex items-center gap-2.5 shadow-xl transition-all ${
                  isHoliday
                    ? 'bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-500/40 hover:scale-105 border border-red-300/40'
                    : 'bg-pink-500 hover:bg-pink-600 active:scale-95 text-white shadow-pink-500/35'
                }`}
              >
                {isHoliday && <span className="text-base">❄️</span>}
                <span>Start Exploring</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </Link>
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className={`px-6 py-3.5 text-white font-semibold backdrop-blur-md rounded-full text-sm flex items-center gap-2 border transition-all cursor-pointer ${
                  isHoliday
                    ? 'bg-white/20 hover:bg-white/30 border-white/40 shadow-lg shadow-white/10 hover:scale-105'
                    : 'bg-white/15 hover:bg-white/25 active:scale-95 border-white/25'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                  <Play className="h-3 w-3 fill-white text-white translate-x-0.5" />
                </div>
                <span>Watch Video</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. STATS BAR SECTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/attractions')}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-md flex items-center gap-4 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {formatCount(stats?.tourists || stats?.visitor_count || (attractions.reduce((sum, a) => sum + (Number(a.view_count) || 0), 0) + 12))}
              </p>
              <p className="text-xs text-gray-500 font-medium group-hover:text-blue-600 transition-colors">Visitor Count</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/attractions')}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-md flex items-center gap-4 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {formatCount(attractions.length || stats?.attractions || 8)}
              </p>
              <p className="text-xs text-gray-500 font-medium group-hover:text-emerald-600 transition-colors">Local Attractions</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/attractions')}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-md flex items-center gap-4 hover:shadow-lg hover:border-cyan-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {formatCount(displayBeaches.length || 4)}
              </p>
              <p className="text-xs text-gray-500 font-medium group-hover:text-cyan-600 transition-colors">Beaches</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/accommodations')}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-md flex items-center gap-4 hover:shadow-lg hover:border-pink-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Hotel className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {formatCount(accommodations.length || stats?.resorts || 6)}
              </p>
              <p className="text-xs text-gray-500 font-medium group-hover:text-pink-600 transition-colors">Resorts</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. EXPLORE MANSALAY (TOP PICKS AUTO-SWIPE CAROUSEL) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Top Picks</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Explore Mansalay</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/attractions" className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 mr-2">
              <span>View all</span> <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {topPicks.length > visibleCards && (
              <>
                <button
                  onClick={() => setTopPickIdx(prev => (prev > 0 ? prev - 1 : topPickMaxIdx))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200 transition-all"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTopPickIdx(prev => (prev >= topPickMaxIdx ? 0 : prev + 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200 transition-all"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Auto-Swipe Carousel */}
        {topPicks.length > 0 ? (
          <div
            ref={topPickRef}
            className="relative overflow-hidden"
            onMouseEnter={() => setTopPickPaused(true)}
            onMouseLeave={() => setTopPickPaused(false)}
          >
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${topPickIdx * (100 / visibleCards)}%)`,
              }}
            >
              {topPicks.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 px-2"
                  style={{ width: `${100 / visibleCards}%` }}
                >
                  <div
                    onClick={() => setModalItem({
                      id: String(item.id),
                      type: item.price_per_night || item.pricePerNight ? 'accommodation' : 'attraction',
                      name: item.name || item.resort_name,
                      image: getImageUrl(item.image || item.resort_images?.[0] || item.images?.[0]),
                      description: item.description,
                      location: item.location || 'Mansalay, Oriental Mindoro',
                      category: item.category || item.type || 'Top Pick'
                    })}
                    className="group relative h-72 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all"
                  >
                    <img src={getImageUrl(item.image || item.resort_images?.[0] || item.images?.[0])} alt={item.name || item.resort_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/30 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-pink-500 text-white text-[11px] font-bold rounded-full uppercase">{item.category || item.type || 'Top Pick'}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-lg font-bold">{item.name || item.resort_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-pink-400" /> {item.location || 'Mansalay'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            {topPicks.length > visibleCards && (
              <div className="flex items-center justify-center gap-1.5 mt-5">
                {Array.from({ length: topPickMaxIdx + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTopPickIdx(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === topPickIdx
                        ? 'bg-pink-500 w-6 shadow-sm shadow-pink-500/30'
                        : 'bg-gray-300 w-2 hover:bg-pink-300'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center bg-white rounded-3xl border border-gray-100 p-6">
            <Compass className="h-10 w-10 text-pink-400 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-bold text-gray-700">No published content available yet</p>
            <p className="text-xs text-gray-400 mt-1">Publish content in Admin panel to show items here!</p>
          </div>
        )}
      </section>

      {/* ── 4. ABOUT THE MUNICIPALITY SECTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-pink-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Info className="h-4 w-4" />
            <span>About the Municipality</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Photo Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <img src={getGalleryImgSrc(0)} alt="Mansalay 1" className="rounded-2xl h-36 w-full object-cover shadow-sm hover:scale-102 transition-transform" />
              <img src={getGalleryImgSrc(1)} alt="Mansalay 2" className="rounded-2xl h-36 w-full object-cover shadow-sm hover:scale-102 transition-transform" />
              <img src={getGalleryImgSrc(2)} alt="Mansalay 3" className="rounded-2xl h-36 w-full object-cover shadow-sm hover:scale-102 transition-transform" />
              <img src={getGalleryImgSrc(3)} alt="Mansalay 4" className="rounded-2xl h-36 w-full object-cover shadow-sm hover:scale-102 transition-transform" />
            </div>

            {/* Right Details */}
            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Welcome to <span className="text-pink-500">Mansalay</span>, Oriental Mindoro
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                Mansalay is a 5th class municipality in the province of Oriental Mindoro, Philippines. Nestled between the sea and the mountains, it is home to pristine beaches, vibrant indigenous Mangyan culture, lush forests, and an increasingly vibrant eco-tourism scene.
              </p>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                The town is a gateway to some of the most beautiful natural and cultural attractions in Mindoro — from the majestic mountains to sacred caves, coastal dive sites, and indigenous Hanunuo Mangyan cultural communities.
              </p>

              {/* 6 Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Location</p>
                    <p className="text-xs font-bold text-gray-800">5th district of Oriental Mindoro, Philippines</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Population</p>
                    <p className="text-xs font-bold text-gray-800">Approx. 75,000 residents</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2.5">
                  <Waves className="h-4 w-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Coastline</p>
                    <p className="text-xs font-bold text-gray-800">45 km of beaches & marine coast</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2.5">
                  <Trees className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Area</p>
                    <p className="text-xs font-bold text-gray-800">1,007 sq km land & forests</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Known For</p>
                    <p className="text-xs font-bold text-gray-800">Mangyan culture, pristine beaches, eco-tourism</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Best Time to Visit</p>
                    <p className="text-xs font-bold text-gray-800">November – April (dry season)</p>
                  </div>
                </div>
              </div>

              {/* Map Link Button */}
              <Link
                to="/map"
                className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full text-xs shadow-md shadow-pink-500/25 transition-all"
              >
                <MapPin className="h-4 w-4" />
                <span>Explore the Map</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURED BEACHES (SUN & SAND) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Waves className="h-4 w-4" />
              <span>Sun & Sand</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Featured Beaches</h2>
          </div>
          <Link to="/attractions" className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
            <span>View all</span> <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Real Beaches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayBeaches.length > 0 ? (
            displayBeaches.map((item) => (
              <div key={item.id} onClick={() => openAttractionModal(item)} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg transition-all group cursor-pointer">
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img src={getImageUrl(item.image || item.resort_images?.[0] || item.images?.[0])} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full">{item.category || 'Beach'}</span>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareData({ title: item.name, description: item.description, image: getImageUrl(item.image), category: item.category });
                      }}
                      className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors hover:scale-110"
                      title="Share"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase font-bold text-gray-400">{item.category || 'Beach'}</p>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mt-0.5">{item.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">{item.description || 'Pristine shoreline in Mansalay, Oriental Mindoro'}</p>
                  <div className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold mt-3">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{item.location || 'Mansalay, Oriental Mindoro'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center bg-white rounded-3xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500">No beaches currently available</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 6. FEATURED RESORTS (WHERE TO STAY) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Hotel className="h-4 w-4" />
              <span>Where to Stay</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Featured Resorts</h2>
          </div>
          <Link to="/accommodations" className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
            <span>View all</span> <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredResorts.length > 0 ? (
            featuredResorts.map((item) => (
              <div key={item.id} onClick={() => openAccommodationModal(item)} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg transition-all group cursor-pointer">
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img src={getImageUrl(item.image || item.resort_images?.[0] || item.images?.[0])} alt={item.name || item.resort_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full">{(item.type === 'resort_profile' || item.category === 'resort_profile') ? 'Beach Resort' : (item.category || item.type || 'Beach Resort')}</span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase font-bold text-gray-400">{(item.type === 'resort_profile' || item.category === 'resort_profile') ? 'Beach Resort' : (item.category || item.type || 'Beach Resort')}</p>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mt-0.5">{item.name || item.resort_name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">{item.description || 'Comfortable stay in Mansalay'}</p>
                  <div className="flex items-center justify-between text-[11px] mt-3">
                    <span className="text-pink-500 font-semibold flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{item.location || 'Mansalay'}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center bg-white rounded-3xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500">No resorts currently available</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. POPULAR ATTRACTIONS (MUST SEE) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Compass className="h-4 w-4" />
              <span>Must See</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Popular Attractions</h2>
          </div>
          <Link to="/attractions" className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
            <span>View all</span> <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popularAttractions.length > 0 ? (
            popularAttractions.map((item) => (
              <div key={item.id} onClick={() => openAttractionModal(item)} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg transition-all group cursor-pointer">
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full">{item.category || 'Attraction'}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">{item.description || 'Scenic attraction in Mansalay'}</p>
                  <div className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold mt-3">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{item.location || 'Mansalay, Oriental Mindoro'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center bg-white rounded-3xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500">No popular attractions available</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 8. UPCOMING & PAST EVENTS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Calendar className="h-4 w-4" />
              <span>Events in Mansalay</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Upcoming & Past Events</h2>
          </div>
          <Link to="/events" className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
            <span>View all</span> <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Upcoming Events Column ── */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-extrabold text-gray-900">Upcoming Events</h3>
                <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">{upcomingEvents.length}</span>
              </div>
              {upcomingTotalPages > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <button onClick={() => setUpcomingPage(p => Math.max(0, p - 1))} disabled={upcomingPage === 0} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30 transition-all"><ChevronLeft className="h-3.5 w-3.5" /></button>
                  <span className="font-semibold">{upcomingPage + 1}/{upcomingTotalPages}</span>
                  <button onClick={() => setUpcomingPage(p => Math.min(upcomingTotalPages - 1, p + 1))} disabled={upcomingPage >= upcomingTotalPages - 1} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30 transition-all"><ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {pagedUpcoming.length > 0 ? pagedUpcoming.map((event, idx) => (
                <div key={event.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer" onClick={() => openEventModal(event)}>
                  <div className="relative h-32 overflow-hidden bg-gray-100">
                    {event.image && <img src={getImageUrl(event.image)} alt={event.name} className="w-full h-full object-cover" />}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">Upcoming</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <h4 className="font-bold text-gray-900 text-sm">{event.name}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-pink-500 font-semibold mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-2">{event.description || 'Join us in Mansalay for this exciting event!'}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{event.time || '8:00 AM – 6:00 PM'}</span>
                      </div>
                      <span className="text-[11px] font-bold text-pink-500 border border-pink-200 px-3 py-1 rounded-full hover:bg-pink-50 transition-colors">Details</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center">
                  <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-400">No upcoming events</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Past Events Column ── */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <h3 className="text-base font-extrabold text-gray-900">Past Events</h3>
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">{pastEvents.length}</span>
              </div>
              {pastTotalPages > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <button onClick={() => setPastPage(p => Math.max(0, p - 1))} disabled={pastPage === 0} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30 transition-all"><ChevronLeft className="h-3.5 w-3.5" /></button>
                  <span className="font-semibold">{pastPage + 1}/{pastTotalPages}</span>
                  <button onClick={() => setPastPage(p => Math.min(pastTotalPages - 1, p + 1))} disabled={pastPage >= pastTotalPages - 1} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30 transition-all"><ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {pagedPast.length > 0 ? pagedPast.map((event, idx) => (
                <div key={event.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all cursor-pointer" onClick={() => openEventModal(event)}>
                  <div className="relative h-32 overflow-hidden bg-gray-100">
                    {event.image && <img src={getImageUrl(event.image)} alt={event.name} className="w-full h-full object-cover" />}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-gray-600 text-white text-[10px] font-bold rounded-full">Past</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <h4 className="font-bold text-gray-900 text-sm">{event.name}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-pink-500 font-semibold mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date'}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-2">{event.description || 'This event has already passed.'}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{event.time || '8:00 AM – 6:00 PM'}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors">View</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center">
                  <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-400">No past events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. PHOTO GALLERY (THROUGH THE LENS) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="flex items-center justify-center gap-1.5 text-pink-500 text-xs font-bold uppercase tracking-wider mb-1">
          <Camera className="h-4 w-4" />
          <span>Photo Gallery</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8">Mansalay Through the Lens</h2>

        {/* Thumbnail Row */}
        <div className="flex items-center justify-center gap-4 overflow-x-auto pb-4">
          {galleryImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveGalleryIdx(idx)}
              className={`relative flex-shrink-0 w-36 h-36 rounded-2xl overflow-hidden transition-all ${
                idx === activeGalleryIdx ? 'ring-4 ring-pink-500 scale-105 shadow-lg' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      {/* ── 10. TRENDING NOW & MOST WISHLISTED ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Trending Now */}
          <div className="bg-pink-50/40 border border-pink-100 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg mb-4">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <span>Trending Now</span>
            </div>
            <div className="space-y-3">
              {trendingNowItems.length > 0 ? (
                trendingNowItems.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.price_per_night || item.pricePerNight) openAccommodationModal(item);
                      else openAttractionModal(item);
                    }}
                    className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img src={getImageUrl(item.image)} alt={item.name || item.resort_name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.name || item.resort_name}</h4>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Eye className="h-3 w-3 text-gray-400" /> {item.view_count || Math.floor(Math.random() * 500) + 120} views
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2.5 py-1 rounded-full">#{idx + 1}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">No trending items currently available</p>
              )}
            </div>
          </div>

          {/* Most Wishlisted */}
          <div className="bg-pink-50/40 border border-pink-100 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg mb-4">
              <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              <span>Most Wishlisted</span>
            </div>
            <div className="space-y-3">
              {mostWishlistedItems.length > 0 ? (
                mostWishlistedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.price_per_night || item.pricePerNight) openAccommodationModal(item);
                      else openAttractionModal(item);
                    }}
                    className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-2xs hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img src={getImageUrl(item.image)} alt={item.name || item.resort_name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.name || item.resort_name}</h4>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Heart className="h-3 w-3 text-pink-500 fill-pink-500" /> {item.likes || Math.floor(Math.random() * 200) + 45} saves
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2.5 py-1 rounded-full">#{idx + 1}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">No wishlisted items currently available</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. CTA FOOTER BANNER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl shadow-pink-500/20 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Ready to Explore Mansalay?</h2>
            <p className="text-sm sm:text-base text-pink-100 font-medium mb-8">
              Create your personalized itinerary and discover the hidden gems of Oriental Mindoro.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/itinerary"
                onClick={(e) => {
                  if (!currentUser) {
                    e.preventDefault();
                    toast.error('Please log in to access your Itinerary');
                    navigate('/login');
                  }
                }}
                className="px-7 py-3.5 bg-white hover:bg-pink-50 text-pink-600 font-bold rounded-full text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-pink-500" />
                <span>Build My Itinerary</span>
              </Link>
              <Link
                to="/attractions"
                className="px-7 py-3.5 bg-pink-600/40 hover:bg-pink-600/60 text-white font-bold rounded-full text-xs sm:text-sm border border-white/30 backdrop-blur-md transition-all flex items-center gap-2"
              >
                <span>Explore Attractions</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. DETAIL MODAL ── */}
      <DetailModal
        item={modalItem}
        onClose={() => setModalItem(null)}
      />

      {/* ── 13. SOCIAL SHARE MODAL ── */}
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

      {/* ── 14. YOUTUBE-STYLE HERO VIDEO TOUR MODAL ── */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                  <Play className="h-4 w-4 fill-white text-white translate-x-0.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                    Mansalay Virtual Video Tour
                  </h3>
                  <p className="text-xs text-slate-400">Discover the paradise of Oriental Mindoro</p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player Box */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {(() => {
                if (!heroVideo) {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                      <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center mb-4 border border-pink-500/30">
                        <Play className="h-8 w-8 fill-pink-500 translate-x-0.5" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1">Mansalay Virtual Tour Video</h4>
                      <p className="text-xs text-slate-400 max-w-md">
                        Experience the pristine beaches, waterfalls, and rich indigenous culture of Mansalay.
                      </p>
                      <p className="text-[11px] text-pink-400/80 mt-4 bg-pink-500/10 px-3 py-1.5 rounded-full border border-pink-500/20">
                        💡 Tip: Upload your video file or YouTube link in Admin -&gt; Publish Content!
                      </p>
                    </div>
                  );
                }

                if (heroVideo.includes('youtube.com') || heroVideo.includes('youtu.be')) {
                  let embedUrl = heroVideo;
                  if (heroVideo.includes('watch?v=')) {
                    const id = heroVideo.split('v=')[1]?.split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
                  } else if (heroVideo.includes('youtu.be/')) {
                    const id = heroVideo.split('youtu.be/')[1]?.split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
                  }
                  return (
                    <iframe
                      src={embedUrl}
                      title="Mansalay Video Tour"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }

                const fullSrc = heroVideo.startsWith('http') || heroVideo.startsWith('/storage')
                  ? (heroVideo.startsWith('http') ? heroVideo : `${API_BASE}${heroVideo}`)
                  : heroVideo;

                return (
                  <video
                    src={fullSrc}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                );
              })()}
            </div>

            {/* Modal Footer Info */}
            <div className="px-6 py-4 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-pink-500 flex-shrink-0" />
                <span>Mansalay, Oriental Mindoro, Philippines</span>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full transition-colors ml-auto shadow-md shadow-pink-500/20"
              >
                Done Watching
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
