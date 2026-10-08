import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Palette,
  MapPin,
  X,
  Search,
  Sparkles,
  Calendar,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Video,
  Play,
  Camera,
  Scissors,
  Music,
  Landmark,
  MoreHorizontal,
  RefreshCw,
  Activity,
  ArrowRight,
  Heart
} from 'lucide-react';
import { getPublicJSON, formatImageUrl, API_BASE, recordView } from '../../lib/api';
import { CULTURE_ARTS_CATEGORIES, PLACEHOLDER_IMAGE } from '../../lib/constants';
import { ShareModal } from '../../components/ShareModal';
import { useApp } from '../../context/AppContext';

interface CultureArtItem {
  id: string | number;
  name: string;
  category?: string;
  artist_name?: string;
  period_era?: string;
  location?: string;
  image?: string;
  images?: string[] | string;
  video?: string;
  description?: string;
  full_description?: string;
  view_count?: number;
  likes?: number;
  created_at?: string;
}

// Decorative Floral Hibiscus SVG Component
function HibiscusFlower({ className = "w-12 h-12 text-pink-400 opacity-60" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden="true">
      <path d="M50 15 C45 30 35 38 20 40 C35 45 40 55 42 70 C46 55 56 48 70 47 C57 43 53 32 50 15 Z" fillOpacity="0.85" />
      <path d="M50 25 C47 35 38 42 27 44 C38 48 43 56 45 68 C48 56 56 50 67 50 C57 46 53 36 50 25 Z" fillOpacity="0.4" />
      <circle cx="50" cy="50" r="6" fill="#FCE4EC" />
      <path d="M50 48 Q52 35 60 22" stroke="#FFF1F7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="22" r="2.5" fill="#FFE082" />
    </svg>
  );
}

export function CultureArts() {
  const navigate = useNavigate();
  const { userType } = useApp();
  const [items, setItems] = useState<CultureArtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<CultureArtItem | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  useEffect(() => {
    loadCultureArts();
    window.addEventListener('contentUpdated', loadCultureArts);
    window.addEventListener('storage', loadCultureArts);
    return () => {
      window.removeEventListener('contentUpdated', loadCultureArts);
      window.removeEventListener('storage', loadCultureArts);
    };
  }, []);

  const loadCultureArts = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getPublicJSON('/culture-arts');
      const raw = Array.isArray(data) ? data : [];

      let customList: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_cultures');
        if (stored) customList = JSON.parse(stored);
      } catch {}

      let deletedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
      } catch {}

      const allRaw = [...raw].filter((i) => !deletedIds.has(String(i.id)));
      const existingIds = new Set(allRaw.map((r) => String(r.id)));
      customList.forEach((ci) => {
        if (!existingIds.has(String(ci.id)) && !deletedIds.has(String(ci.id))) {
          allRaw.unshift(ci);
        }
      });

      const mapped: CultureArtItem[] = allRaw.map((item: any) => {
        let parsedImages: string[] = [];
        if (Array.isArray(item.images)) {
          parsedImages = item.images;
        } else if (typeof item.images === 'string' && item.images.trim()) {
          try {
            const parsed = JSON.parse(item.images);
            if (Array.isArray(parsed)) parsedImages = parsed;
            else parsedImages = [item.images];
          } catch {
            parsedImages = [item.images];
          }
        }
        if (parsedImages.length === 0 && item.image) {
          parsedImages = [item.image];
        }

        return {
          id: item.id,
          name: item.name || 'Culture & Art Item',
          category: item.category || 'Traditional Dance',
          artist_name: item.artist_name || '',
          period_era: item.period_era || '',
          location: item.location || 'Mansalay, Oriental Mindoro',
          image: item.image || (parsedImages.length > 0 ? parsedImages[0] : ''),
          images: parsedImages,
          video: item.video || '',
          description: item.description || '',
          full_description: item.full_description || item.description || '',
          view_count: Number(item.view_count || 0),
          likes: Number(item.likes || 0),
          created_at: item.created_at,
        };
      });

      setItems(mapped);
    } catch (err: any) {
      console.warn('Failed to load culture & arts:', err);
      setFetchError('Unable to load Culture & Arts content.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (item: CultureArtItem) => {
    setSelectedItem(item);
    setModalImageIndex(0);
    recordView(item.id, 'culture');
    try {
      getPublicJSON(`/culture-arts/${item.id}`);
    } catch {}
  };

  // Specific category filters with matching icons exactly as requested in design
  const categoryFilters = [
    { label: 'All', icon: Sparkles },
    { label: 'Traditional Dance', icon: Activity },
    { label: 'Music', icon: Music },
    { label: 'Handicrafts', icon: Scissors },
    { label: 'Festivals', icon: Calendar },
    { label: 'Local Arts', icon: Palette },
    { label: 'Cultural Heritage', icon: Landmark },
    { label: 'Others', icon: MoreHorizontal },
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' ||
        (item.category && item.category.toLowerCase() === activeCategory.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.full_description && item.full_description.toLowerCase().includes(q)) ||
        (item.artist_name && item.artist_name.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const detailImages: string[] = useMemo(() => {
    if (!selectedItem) return [];
    if (Array.isArray(selectedItem.images) && selectedItem.images.length > 0) {
      return selectedItem.images;
    }
    if (selectedItem.image) return [selectedItem.image];
    return [];
  }, [selectedItem]);

  return (
    <div className="min-h-screen bg-[#FFF9FB] text-[#3A2430] font-sans pb-16 antialiased">
      {/* ── SECTION 1: CULTURE & ARTS HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#FFF1F7] via-[#FCE4EC]/50 to-[#FFF1F7] border-b border-[#F8BBD0]/40">
        {/* Subtle decorative floral motifs in corners */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <HibiscusFlower className="w-16 h-16 text-[#EC407A]/25" />
        </div>
        <div className="absolute top-12 left-16 pointer-events-none">
          <HibiscusFlower className="w-10 h-10 text-[#E91E63]/20" />
        </div>
        <div className="absolute bottom-4 left-1/3 pointer-events-none">
          <HibiscusFlower className="w-12 h-12 text-[#F48FB1]/20" />
        </div>
        <div className="absolute -top-6 right-1/3 pointer-events-none">
          <HibiscusFlower className="w-20 h-20 text-[#EC407A]/15" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl space-y-4 sm:space-y-6 text-left relative z-10">
            <div className="inline-block">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#E91E63]">
                CULTURE & ARTS
              </span>
            </div>

            <div className="relative">
              <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-serif italic font-extrabold text-[#E91E63] leading-[1.15] tracking-tight">
                Discover the Culture, Arts
                <br />
                and Creative Spirit of Mansalay
              </h1>
              
              {/* Decorative Pink Underline Brush */}
              <div className="w-48 sm:w-64 h-1.5 bg-gradient-to-r from-[#E91E63] via-[#EC407A] to-transparent rounded-full mt-3" />
            </div>

            <p className="text-sm sm:text-base text-[#6B5260] font-normal leading-relaxed max-w-2xl">
              Explore the rich traditions, vibrant arts, local crafts, and cultural heritage that make Mansalay unique.
            </p>

            {/* Search Bar matching the modern pink theme */}
            <div className="pt-2 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#EC407A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cultural traditions, crafts, artists..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white text-xs sm:text-sm font-medium border border-[#F8BBD0] text-[#3A2430] placeholder-[#A08293] shadow-sm focus:outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: CATEGORY FILTERS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none">
          {categoryFilters.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-md shadow-pink-500/20 scale-102'
                    : 'bg-white text-[#6B5260] border-[#F8BBD0] hover:border-[#E91E63] hover:text-[#E91E63] hover:bg-[#FFF1F7]/50 shadow-xs'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-[#EC407A]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: CULTURE & ARTS CARD GRID ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden flex flex-col animate-pulse"
              >
                <div className="aspect-[16/10] bg-pink-100/60" />
                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-5 bg-pink-100 rounded-md w-3/4" />
                    <div className="h-3.5 bg-pink-50 rounded-md w-full" />
                    <div className="h-3.5 bg-pink-50 rounded-md w-4/5" />
                  </div>
                  <div className="h-9 bg-pink-100 rounded-xl w-32 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          /* Error State with Retry */
          <div className="text-center py-20 px-4 bg-white rounded-3xl border border-pink-100 shadow-sm max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FFF1F7] text-[#E91E63] flex items-center justify-center">
              <Palette className="h-7 w-7" />
            </div>
            <h3 className="text-base font-extrabold text-[#3A2430]">
              {fetchError}
            </h3>
            <p className="text-xs text-[#6B5260] mt-1.5">
              Please check your connection and try again.
            </p>
            <button
              onClick={loadCultureArts}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          /* SECTION 4: PROFESSIONAL EMPTY STATE */
          <div className="text-center py-20 px-6 bg-white rounded-3xl border border-pink-100 shadow-sm max-w-xl mx-auto relative overflow-hidden">
            <div className="absolute -top-4 -right-4 pointer-events-none">
              <HibiscusFlower className="w-14 h-14 text-pink-200" />
            </div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FFF1F7] text-[#E91E63] flex items-center justify-center shadow-inner">
              <Palette className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-extrabold text-[#3A2430]">
              No Culture & Arts content available yet.
            </h3>
            <p className="text-xs sm:text-sm text-[#6B5260] mt-2 leading-relaxed max-w-md mx-auto">
              {searchQuery || activeCategory !== 'All'
                ? `No items found matching your current filter. Try selecting "All" or searching with a different term.`
                : 'Official cultural heritage and artistic traditions will appear here once published by the Mansalay Tourism Office.'}
            </p>

            {userType === 'admin' && (
              <button
                onClick={() => navigate('/admin/publish')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-all"
              >
                <span>+ Publish Culture & Arts</span>
              </button>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="group cursor-pointer bg-white rounded-3xl border border-[#FCE4EC] shadow-md shadow-pink-950/5 hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Card Top: Large Cover Photo & Category Badge */}
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-pink-50/50">
                    <img
                      src={item.image ? formatImageUrl(item.image) : PLACEHOLDER_IMAGE}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Floating Category Badge exactly like mockup */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[#E91E63] border border-pink-100 shadow-sm">
                        {item.category || 'Traditional Dance'}
                      </span>
                    </div>

                    {/* View Count Badge */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-medium text-white">
                      <Eye className="h-3 w-3 text-pink-300" />
                      <span>{item.view_count || 0}</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 sm:p-6 space-y-2.5">
                    <h3 className="text-lg font-bold text-[#3A2430] group-hover:text-[#E91E63] transition-colors line-clamp-1">
                      {item.name}
                    </h3>

                    <p className="text-xs text-[#6B5260] line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Metadata row with pink icons matching mockup */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-medium border-t border-pink-50">
                      <div className="flex items-center gap-1.5 text-[#E91E63] font-semibold text-[11px]">
                        <Sparkles className="h-3.5 w-3.5 text-[#EC407A]" />
                        <span className="truncate max-w-[120px]">
                          {item.artist_name || item.category || 'Local Tradition'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[#6B5260] text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-[#E91E63]" />
                        <span className="truncate max-w-[130px]">{item.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Solid Pink Action Button */}
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(item);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold shadow-md shadow-pink-500/20 active:scale-95 transition-all"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ── SECTION 6: DYNAMIC RESULT COUNT ── */}
        {!loading && !fetchError && items.length > 0 && (
          <div className="text-center my-8">
            <span className="text-xs sm:text-sm font-semibold text-[#8C6D80]">
              Showing {filteredItems.length} of {items.length} results
            </span>
          </div>
        )}

        {/* ── SECTION 5: HERITAGE CALLOUT BANNER ── */}
        <section className="mt-8 rounded-3xl overflow-hidden shadow-xl border border-pink-200/50 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center bg-gradient-to-r from-[#D81B60] via-[#E91E63] to-[#EC407A] text-white">
            
            {/* Left Content */}
            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 space-y-3 sm:space-y-4 relative z-10">
              <div className="flex items-center gap-4">
                {/* Double-ring camera icon matching mockup */}
                <div className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center p-1 flex-shrink-0">
                  <div className="w-full h-full rounded-full border border-dashed border-white/80 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl sm:text-3xl font-serif italic font-extrabold text-white leading-tight">
                    Experience Mansalay’s Living Heritage
                  </h2>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-rose-100 max-w-lg leading-relaxed">
                From traditional dances to local crafts, the culture and arts of Mansalay tell a story of people, history, and pride.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    const topSection = document.querySelector('section');
                    if (topSection) topSection.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#D81B60] hover:bg-rose-50 text-xs sm:text-sm font-extrabold shadow-md shadow-black/15 transition-all active:scale-95"
                >
                  <span>Explore More</span>
                  <ArrowRight className="h-4 w-4 text-[#D81B60]" />
                </button>
              </div>
            </div>

            {/* Right Panoramic Landscape Imagery */}
            <div className="lg:col-span-5 h-48 lg:h-full min-h-[220px] relative overflow-hidden">
              <img
                src="/assets/products/attraction/buktot_beach.jpg"
                alt="Mansalay Living Landscape"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/mansalay_hero_bg.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#D81B60] via-[#D81B60]/40 to-transparent lg:block hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#D81B60] via-transparent to-transparent lg:hidden block" />
            </div>

          </div>
        </section>
      </main>

      {/* ── DETAIL MODAL ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-pink-100 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition-all shadow-md"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Media Gallery / Carousel */}
            {detailImages.length > 0 && (
              <div className="relative aspect-[16/9] w-full bg-black rounded-t-3xl overflow-hidden">
                <img
                  src={formatImageUrl(detailImages[modalImageIndex])}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />

                {detailImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalImageIndex((prev) => (prev > 0 ? prev - 1 : detailImages.length - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalImageIndex((prev) => (prev < detailImages.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold">
                      {modalImageIndex + 1} / {detailImages.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full bg-[#FFF1F7] text-[#E91E63] text-xs font-bold border border-pink-200">
                    {selectedItem.category || 'Culture & Arts'}
                  </span>
                  {selectedItem.period_era && (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-[#6B5260] text-xs font-semibold">
                      {selectedItem.period_era}
                    </span>
                  )}
                </div>

                <button
                  onClick={() =>
                    setShareData({
                      title: selectedItem.name,
                      description: selectedItem.description,
                      image: selectedItem.image,
                      category: selectedItem.category,
                    })
                  }
                  className="p-2 rounded-full bg-pink-50 text-[#E91E63] hover:bg-pink-100 transition-colors"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#3A2430]">
                  {selectedItem.name}
                </h2>

                {selectedItem.artist_name && (
                  <p className="text-xs sm:text-sm font-bold text-[#E91E63] mt-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span>Cultural Bearer / Artist: {selectedItem.artist_name}</span>
                  </p>
                )}

                {selectedItem.location && (
                  <p className="text-xs font-medium text-[#6B5260] mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#E91E63]" />
                    <span>{selectedItem.location}</span>
                  </p>
                )}
              </div>

              {/* Full Cultural Story */}
              <div className="text-xs sm:text-sm text-[#3A2430] leading-relaxed space-y-4">
                <p className="font-semibold text-[#6B5260]">
                  {selectedItem.description}
                </p>

                {selectedItem.full_description && selectedItem.full_description !== selectedItem.description && (
                  <div className="pt-3 border-t border-pink-100 whitespace-pre-line text-[#4A3240]">
                    {selectedItem.full_description}
                  </div>
                )}
              </div>

              {/* Video Player if available */}
              {selectedItem.video && (
                <div className="pt-4 border-t border-pink-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#E91E63] mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4 text-[#E91E63]" />
                    <span>Cultural Video Feature</span>
                  </h4>
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                    <video
                      src={formatImageUrl(selectedItem.video)}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-pink-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-[#E91E63]" />
                  <span>{selectedItem.view_count || 0} views</span>
                </span>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-[#3A2430] text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
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
