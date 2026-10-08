import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  MapPin,
  X,
  Search,
  Calendar,
  Clock,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Landmark,
  ArrowRight,
  RefreshCw,
  Compass,
  Scroll,
} from 'lucide-react';
import { getPublicJSON, formatImageUrl, recordView } from '../../lib/api';
import { HISTORY_CATEGORIES, PLACEHOLDER_IMAGE } from '../../lib/constants';
import { ShareModal } from '../../components/ShareModal';
import { useApp } from '../../context/AppContext';

export interface HistoryItem {
  id: string | number;
  name: string;
  category?: string;
  period?: string;
  date?: string;
  location?: string;
  image?: string;
  images?: string[] | string;
  video?: string;
  description?: string;
  full_description?: string;
  source?: string;
  view_count?: number;
  likes?: number;
  created_at?: string;
}

export function History() {
  const navigate = useNavigate();
  const { userType } = useApp();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [shareData, setShareData] = useState<{
    title: string;
    description?: string;
    image?: string;
    category?: string;
  } | null>(null);

  useEffect(() => {
    loadHistories();
  }, []);

  const loadHistories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicJSON('/histories');
      const raw = Array.isArray(data) ? data : [];

      let customList: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_histories');
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

      const mapped: HistoryItem[] = allRaw.map((item: any) => {
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
          name: item.name || 'Historical Milestone',
          category: item.category || 'Early History',
          period: item.period || item.historical_period || '',
          date: item.date || '',
          location: item.location || 'Mansalay, Oriental Mindoro',
          image: item.image || (parsedImages.length > 0 ? parsedImages[0] : ''),
          images: parsedImages,
          video: item.video || '',
          description: item.description || '',
          full_description: item.full_description || item.description || '',
          source: item.source || item.author || '',
          view_count: Number(item.view_count || 0),
          likes: Number(item.likes || 0),
          created_at: item.created_at,
        };
      });

      setItems(mapped);
    } catch (err) {
      console.warn('Failed to load history items:', err);
      setError("Unable to load Mansalay's history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (item: HistoryItem) => {
    setSelectedItem(item);
    setModalImageIndex(0);
    recordView(item.id, 'history');
    try {
      getPublicJSON(`/histories/${item.id}`);
    } catch {}
  };

  // Category filter list
  const categoryFilters = useMemo(() => {
    return ['All', ...HISTORY_CATEGORIES];
  }, []);

  // Filtered stories
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
        (item.period && item.period.toLowerCase().includes(q)) ||
        (item.date && item.date.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  // Modal images
  const detailImages: string[] = useMemo(() => {
    if (!selectedItem) return [];
    if (Array.isArray(selectedItem.images) && selectedItem.images.length > 0) {
      return selectedItem.images;
    }
    if (selectedItem.image) return [selectedItem.image];
    return [];
  }, [selectedItem]);

  // Related history stories (up to 3 items)
  const relatedStories = useMemo(() => {
    if (!selectedItem) return [];
    return items
      .filter((i) => String(i.id) !== String(selectedItem.id))
      .filter(
        (i) =>
          !selectedItem.category ||
          i.category?.toLowerCase() === selectedItem.category?.toLowerCase()
      )
      .slice(0, 3);
  }, [items, selectedItem]);

  // Gallery items for "Mansalay Through the Years"
  const galleryItems = useMemo(() => {
    const list: { image: string; title: string; period?: string; location?: string }[] = [];
    items.forEach((item) => {
      if (item.image) {
        list.push({
          image: item.image,
          title: item.name,
          period: item.period || item.date,
          location: item.location,
        });
      }
      if (Array.isArray(item.images)) {
        item.images.slice(1).forEach((img) => {
          list.push({
            image: img,
            title: item.name,
            period: item.period || item.date,
            location: item.location,
          });
        });
      }
    });
    return list.slice(0, 5);
  }, [items]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9FB] text-[#3A2430] font-sans antialiased pb-20">
      
      {/* ── SECTION 1: HISTORY HERO (White & Pink Aesthetic) ── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#FFF1F7] via-[#FCE4EC]/50 to-[#FFF1F7] border-b border-[#F8BBD0]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 relative z-10">
          <div className="max-w-3xl space-y-4 sm:space-y-6 text-left">
            
            {/* Archival Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#F8BBD0] shadow-xs">
              <Landmark className="h-3.5 w-3.5 text-[#E91E63]" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#E91E63]">
                HISTORY OF MANSALAY
              </span>
            </div>

            {/* Main Heading - Matching Culture & Arts Serif Italic Style */}
            <div className="relative">
              <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-serif italic font-extrabold text-[#E91E63] leading-[1.15] tracking-tight">
                Discover the Story of Mansalay
              </h1>
              {/* Decorative Pink Underline Brush */}
              <div className="w-48 sm:w-64 h-1.5 bg-gradient-to-r from-[#E91E63] via-[#EC407A] to-transparent rounded-full mt-3" />
            </div>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base text-[#6B5260] font-normal leading-relaxed max-w-2xl">
              Journey through the history, people, places, and events that shaped Mansalay.
            </p>

            {/* Search Bar matching the White & Pink theme */}
            <div className="pt-2 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#EC407A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search historical events, eras, people, milestones..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-full bg-white text-sm font-medium text-[#3A2430] placeholder-[#A08293] shadow-sm border border-[#F8BBD0] focus:outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: INTRODUCTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF1F7] border border-[#F8BBD0] text-[#E91E63] text-xs font-bold uppercase tracking-wider">
            <Scroll className="h-3.5 w-3.5" />
            <span>HISTORICAL FOUNDATION</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif italic font-extrabold text-[#3A2430] tracking-tight">
            The Story Behind Mansalay
          </h2>

          {/* Small decorative pink line */}
          <div className="w-16 h-1 bg-[#E91E63] rounded-full mx-auto" />

          <p className="text-sm sm:text-base text-[#6B5260] font-normal leading-relaxed max-w-2xl mx-auto">
            Explore the rich history of Mansalay through stories, important events, communities, places, and milestones that helped shape the municipality we know today.
          </p>

          <p className="text-sm sm:text-base text-[#6B5260] font-normal leading-relaxed max-w-2xl mx-auto">
            From the ancestral traditions of indigenous Mangyan communities to pivotal colonial encounters and municipal progress, each era represents a foundational pillar in Mansalay&apos;s proud identity.
          </p>

          <div className="pt-4">
            <button
              onClick={() => scrollToSection('timeline-section')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white text-sm font-semibold shadow-md shadow-pink-500/20 transition-all hover:scale-102"
            >
              <span>Explore the Timeline</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HISTORICAL TIMELINE ── */}
      <section id="timeline-section" className="bg-[#FFF1F7]/50 py-16 sm:py-24 border-y border-[#F8BBD0]/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#E91E63]">
              CHRONOLOGY
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif italic font-extrabold text-[#3A2430] tracking-tight">
              Historical Timeline
            </h2>
            <p className="text-sm sm:text-base text-[#6B5260] font-normal">
              A chronological journey across key eras and turning points in Mansalay.
            </p>
          </div>

          {loading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 sm:gap-6 animate-pulse">
                  <div className="w-10 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-pink-200" />
                    <div className="w-0.5 flex-1 bg-pink-100 mt-2" />
                  </div>
                  <div className="flex-1 bg-white p-6 rounded-2xl border border-pink-100">
                    <div className="h-4 bg-pink-100 rounded-md w-1/4 mb-3" />
                    <div className="h-6 bg-pink-50 rounded-md w-3/4 mb-2" />
                    <div className="h-4 bg-pink-50 rounded-md w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-6 bg-white rounded-3xl border border-[#F8BBD0]/60 max-w-lg mx-auto shadow-sm">
              <Compass className="h-10 w-10 text-[#E91E63] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#3A2430]">Timeline records will appear here</h3>
              <p className="text-xs sm:text-sm text-[#6B5260] mt-1">
                Historical milestones published by the Tourism Office will automatically populate this chronological timeline.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline spine */}
              <div className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-0.5 bg-[#F48FB1] -translate-x-1/2" />

              <div className="space-y-8 sm:space-y-12">
                {items.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <div
                      key={item.id}
                      className={`relative flex flex-col sm:flex-row items-start ${
                        isEven ? 'sm:flex-row-reverse' : ''
                      } gap-6 sm:gap-12`}
                    >
                      {/* Timeline Center Marker */}
                      <div className="absolute left-4 sm:left-1/2 top-1.5 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-4 border-[#E91E63] flex items-center justify-center shadow-md z-10">
                        <div className="w-2 h-2 rounded-full bg-[#E91E63]" />
                      </div>

                      {/* Content Card */}
                      <div className="ml-12 sm:ml-0 sm:w-1/2">
                        <div
                          onClick={() => handleOpenDetail(item)}
                          className="group cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#F8BBD0]/60 shadow-xs hover:shadow-lg transition-all duration-300 hover:border-[#E91E63]/50"
                        >
                          {/* Era or Date Badge */}
                          {(item.date || item.period) && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1F7] text-[#E91E63] border border-pink-200 text-xs font-semibold mb-3">
                              <Calendar className="h-3 w-3" />
                              <span>{item.date || item.period}</span>
                            </div>
                          )}

                          <h3 className="text-base sm:text-lg font-serif italic font-bold text-[#3A2430] group-hover:text-[#E91E63] transition-colors">
                            {item.name}
                          </h3>

                          {item.image && (
                            <div className="mt-3 rounded-xl overflow-hidden aspect-[16/9] bg-pink-50/50">
                              <img
                                src={formatImageUrl(item.image)}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                          )}

                          <p className="text-xs sm:text-sm text-[#6B5260] mt-3 line-clamp-3 leading-relaxed font-normal">
                            {item.description}
                          </p>

                          <div className="mt-4 pt-3 border-t border-pink-100 flex items-center justify-between">
                            <span className="text-xs text-[#8C6D80] font-medium truncate max-w-[150px]">
                              {item.category}
                            </span>
                            <span className="text-xs font-semibold text-[#E91E63] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                              <span>Read Story</span>
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Spacer for desktop symmetry */}
                      <div className="hidden sm:block sm:w-1/2" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ── SECTION 4 & 5: STORIES OF MANSALAY & CATEGORY FILTERS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-8 space-y-2 text-left">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#E91E63]">
            HISTORICAL ARCHIVES
          </span>
          <h2 className="text-2xl sm:text-4xl font-serif italic font-extrabold text-[#3A2430] tracking-tight">
            Stories of Mansalay
          </h2>
          <p className="text-sm sm:text-base text-[#6B5260] font-normal">
            Browse through detailed articles, community narratives, and foundational milestones.
          </p>
        </div>

        {/* SECTION 5: Category Filters */}
        <div className="mb-8 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2">
            {categoryFilters.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-md shadow-pink-500/20 scale-102'
                      : 'bg-white text-[#6B5260] border-[#F8BBD0] hover:border-[#E91E63] hover:text-[#E91E63] hover:bg-[#FFF1F7]/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stories Listing */}
        {loading ? (
          /* Loading State: White/Pink Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-pink-100 p-5 animate-pulse space-y-4"
              >
                <div className="aspect-[16/10] bg-pink-100/70 rounded-2xl" />
                <div className="h-4 bg-pink-100 rounded-md w-1/3" />
                <div className="h-5 bg-pink-50 rounded-md w-4/5" />
                <div className="h-3 bg-pink-50 rounded-md w-full" />
                <div className="h-3 bg-pink-50 rounded-md w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-pink-200 shadow-sm max-w-lg mx-auto">
            <p className="text-base font-bold text-[#3A2430]">{error}</p>
            <button
              onClick={loadHistories}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E91E63] text-white text-xs font-semibold hover:bg-[#D81B60] transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State: Zero fake data */
          <div className="text-center py-20 px-4 bg-white rounded-3xl border border-[#F8BBD0]/60 shadow-sm max-w-xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FFF1F7] text-[#E91E63] flex items-center justify-center">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#3A2430]">
              No History content available yet.
            </h3>
            <p className="text-xs sm:text-sm text-[#6B5260] mt-2 max-w-md mx-auto">
              {searchQuery
                ? `No historical records matched "${searchQuery}". Please check your search term or select another category.`
                : 'Official historical archives and community records will appear here once published by the Mansalay Tourism Office.'}
            </p>
            {userType === 'admin' && (
              <button
                onClick={() => navigate('/admin/content')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-semibold shadow-md shadow-pink-500/20 transition-all"
              >
                <span>+ Publish History Content</span>
              </button>
            )}
          </div>
        ) : (
          /* Real Dynamic Cards Grid: Desktop 3 cols, Tablet 2 cols, Mobile 1 col */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="group cursor-pointer bg-white rounded-3xl border border-[#F8BBD0]/60 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col hover:border-[#E91E63]/50"
              >
                {/* Historical Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-pink-50/50">
                  <img
                    src={item.image ? formatImageUrl(item.image) : PLACEHOLDER_IMAGE}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Period/Date Badge */}
                  {(item.period || item.date) && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold shadow-xs flex items-center gap-1 border border-white/20">
                        <Clock className="h-3 w-3 text-pink-300" />
                        <span>{item.period || item.date}</span>
                      </span>
                    </div>
                  )}

                  {/* Category Badge matching Culture & Arts pill */}
                  <div className="absolute bottom-3 left-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[#E91E63] border border-pink-100 shadow-sm">
                      {item.category}
                    </span>
                  </div>

                  {/* Views */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white">
                    <Eye className="h-3 w-3 text-pink-300" />
                    <span>{item.view_count || 0}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-serif italic font-bold text-[#3A2430] group-hover:text-[#E91E63] transition-colors line-clamp-2 leading-snug">
                      {item.name}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#6B5260] mt-2 line-clamp-3 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-pink-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[#6B5260] font-medium truncate max-w-[160px]">
                      <MapPin className="h-3.5 w-3.5 text-[#E91E63] shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>

                    <span className="font-semibold text-[#E91E63] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      <span>Read Story</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      </section>

      {/* ── SECTION 6: HISTORICAL PHOTO / ARCHIVE FEATURE ── */}
      {galleryItems.length > 0 && (
        <section className="bg-[#FFF1F7]/50 py-16 sm:py-20 border-y border-[#F8BBD0]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-8 space-y-2 text-left">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#E91E63]">
                VISUAL ARCHIVE
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif italic font-extrabold text-[#3A2430] tracking-tight">
                Mansalay Through the Years
              </h2>
              <p className="text-sm sm:text-base text-[#6B5260] font-normal">
                Photographic glimpses into historical landmarks, community gatherings, and heritage sites.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Featured Large Historical Photo */}
              <div className="lg:col-span-7 rounded-3xl overflow-hidden bg-white border border-[#F8BBD0]/60 shadow-md relative aspect-[16/10]">
                <img
                  src={formatImageUrl(galleryItems[0].image)}
                  alt={galleryItems[0].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                  {galleryItems[0].period && (
                    <span className="text-xs font-semibold text-pink-200 uppercase tracking-wider">
                      {galleryItems[0].period}
                    </span>
                  )}
                  <h3 className="text-lg sm:text-xl font-serif italic font-bold">{galleryItems[0].title}</h3>
                  {galleryItems[0].location && (
                    <p className="text-xs text-pink-100 mt-1 flex items-center gap-1 font-normal">
                      <MapPin className="h-3 w-3 text-pink-400" />
                      <span>{galleryItems[0].location}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Smaller Supporting Archive Photos */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                {galleryItems.slice(1).map((gItem, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl overflow-hidden bg-white border border-[#F8BBD0]/60 shadow-xs relative aspect-square group"
                  >
                    <img
                      src={formatImageUrl(gItem.image)}
                      alt={gItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <p className="text-xs font-serif italic font-bold line-clamp-1">{gItem.title}</p>
                      {gItem.period && (
                        <p className="text-[10px] text-pink-200 font-normal">{gItem.period}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 7: FEATURED HERITAGE CALLOUT (Solid Vibrant Pink Gradient) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#D81B60] via-[#E91E63] to-[#EC407A] text-white p-8 sm:p-12 lg:p-16 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-pink-100">
              COMMUNITY HERITAGE
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif italic font-extrabold text-white tracking-tight leading-snug">
              Preserving the Story of Mansalay
            </h2>
            <p className="text-sm sm:text-base text-rose-100 font-normal leading-relaxed">
              Every place has a story. Discover the people, traditions, and events that continue to shape Mansalay&apos;s identity.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#E91E63] hover:bg-pink-50 text-sm font-semibold shadow-md transition-all hover:scale-102"
              >
                <span>Explore History →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8 & 9: HISTORY DETAILS MODAL & RELATED STORIES ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-pink-100 relative text-[#3A2430]">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-md"
              aria-label="Close details"
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
                        setModalImageIndex((prev) =>
                          prev > 0 ? prev - 1 : detailImages.length - 1
                        );
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalImageIndex((prev) =>
                          prev < detailImages.length - 1 ? prev + 1 : 0
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-semibold">
                      {modalImageIndex + 1} / {detailImages.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Header Meta */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full bg-[#E91E63] text-white text-xs font-semibold">
                    {selectedItem.category}
                  </span>
                  {(selectedItem.period || selectedItem.date) && (
                    <span className="px-3 py-1 rounded-full bg-[#FFF1F7] text-[#E91E63] border border-pink-200 text-xs font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{selectedItem.period || selectedItem.date}</span>
                    </span>
                  )}
                  {selectedItem.location && (
                    <span className="px-3 py-1 rounded-full bg-white border border-[#F8BBD0] text-[#6B5260] text-xs font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#E91E63]" />
                      <span>{selectedItem.location}</span>
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif italic font-extrabold text-[#3A2430] leading-tight">
                  {selectedItem.name}
                </h2>

                {selectedItem.source && (
                  <p className="text-xs font-medium text-[#6B5260] mt-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#E91E63]" />
                    <span>Archival Source: {selectedItem.source}</span>
                  </p>
                )}
              </div>

              {/* Full Historical Content */}
              <div className="prose prose-sm max-w-none text-[#3A2430] leading-relaxed font-normal whitespace-pre-line bg-[#FFF9FB] p-6 rounded-2xl border border-pink-100">
                {selectedItem.full_description || selectedItem.description}
              </div>

              {/* Video Embed if Available */}
              {selectedItem.video && (
                <div className="space-y-2">
                  <h4 className="text-sm font-serif italic font-bold text-[#3A2430] flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-[#E91E63]" />
                    <span>Historical Documentary / Footage</span>
                  </h4>
                  <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black shadow-md">
                    {selectedItem.video.includes('youtube') || selectedItem.video.includes('youtu.be') ? (
                      <iframe
                        src={selectedItem.video.replace('watch?v=', 'embed/')}
                        title={selectedItem.name}
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={formatImageUrl(selectedItem.video)}
                        controls
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 9: Related History Stories */}
              {relatedStories.length > 0 && (
                <div className="pt-6 border-t border-pink-100 space-y-4">
                  <h4 className="text-base font-serif italic font-extrabold text-[#3A2430]">Related Stories</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedStories.map((rel) => (
                      <div
                        key={rel.id}
                        onClick={() => handleOpenDetail(rel)}
                        className="group cursor-pointer bg-white p-3 rounded-2xl border border-pink-100 hover:border-[#E91E63]/40 transition-all shadow-xs"
                      >
                        <div className="aspect-[16/10] rounded-xl overflow-hidden bg-pink-50/50 mb-2">
                          <img
                            src={rel.image ? formatImageUrl(rel.image) : PLACEHOLDER_IMAGE}
                            alt={rel.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-xs font-serif italic font-bold text-[#3A2430] line-clamp-1 group-hover:text-[#E91E63]">
                          {rel.name}
                        </p>
                        <p className="text-[11px] text-[#8C6D80] mt-0.5 font-normal">
                          {rel.period || rel.date || rel.category}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-4 border-t border-pink-100 flex items-center justify-between">
                <button
                  onClick={() =>
                    setShareData({
                      title: selectedItem.name,
                      description: selectedItem.description,
                      image: selectedItem.image ? formatImageUrl(selectedItem.image) : undefined,
                      category: selectedItem.category,
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#F8BBD0] text-[#E91E63] hover:bg-[#FFF1F7] text-xs font-semibold transition-all"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Story</span>
                </button>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2 rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-semibold shadow-xs transition-all"
                >
                  Back to History
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareData && (
        <ShareModal
          isOpen={true}
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
