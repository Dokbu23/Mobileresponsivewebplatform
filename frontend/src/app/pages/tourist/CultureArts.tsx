import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Palette,
  MapPin,
  X,
  Search,
  Filter,
  ChevronDown,
  Sparkles,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Video,
  ArrowRight,
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
  const [shareData, setShareData] = useState<{
    title: string;
    description?: string;
    image?: string;
    category?: string;
  } | null>(null);

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

      // The API is authoritative for publication and archive status.
      const allRaw = raw;

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

  const categoriesList = useMemo(() => {
    const defaultCats = CULTURE_ARTS_CATEGORIES;
    const dynamicCats = Array.from(new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c))));
    return Array.from(new Set([...defaultCats, ...dynamicCats]));
  }, [items]);

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
    <div className="min-h-screen bg-gray-50/40 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ── HEADER TITLE & SEARCH ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Culture & Arts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium pl-4.5">
              Explore the rich cultural heritage and artistic traditions of Mansalay
            </p>
          </div>

          {/* Search Input & Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search culture, arts, or traditions..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder:text-gray-400 shadow-2xs outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 pointer-events-none" />
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-semibold text-gray-700 shadow-2xs outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="All">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── RESULT COUNT ── */}
        <p className="text-xs font-semibold text-gray-400 mb-4">
          Showing <span className="text-gray-900 font-bold">{filteredItems.length}</span> culture & arts
          {searchQuery && (
            <span> for "<span className="text-gray-900 font-bold">{searchQuery}</span>"</span>
          )}
        </p>

        {/* ── CULTURE & ARTS CARDS GRID (4 COLUMNS) ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 p-4 space-y-3 animate-pulse shadow-xs"
              >
                <div className="h-56 bg-gray-100 rounded-2xl" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-full" />
                <div className="h-3 bg-gray-50 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Top Image Box */}
                <div className="relative h-64 bg-gray-900 overflow-hidden">
                  <img
                    src={item.image ? formatImageUrl(item.image) : PLACEHOLDER_IMAGE}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />

                  {/* Top Left Stacked Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    {item.category && (
                      <span className="px-3 py-0.5 bg-pink-500 text-white text-[10px] font-extrabold rounded-full shadow-xs uppercase">
                        {item.category}
                      </span>
                    )}
                    {item.period_era && (
                      <span className="px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold rounded-full border border-white/20">
                        {item.period_era}
                      </span>
                    )}
                  </div>

                  {/* Top Right Share Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareData({
                        title: item.name,
                        description: item.description,
                        image: item.image,
                        category: item.category || 'Culture & Arts',
                      });
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>

                  {/* Dark Bottom Overlay with Title */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/90 via-gray-950/50 to-transparent p-4">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
                      {item.name}
                    </h3>
                    {item.artist_name && (
                      <p className="text-[11px] text-pink-300 font-medium line-clamp-1 mt-0.5">
                        By {item.artist_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Info Section */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
                    {item.description}
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-gray-400 truncate max-w-[170px]">
                      <MapPin className="h-3 w-3 text-pink-500 shrink-0" />
                      <span className="truncate">{item.location || 'Mansalay, Oriental Mindoro'}</span>
                    </div>
                    <span className="text-pink-500 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── EMPTY STATE ── */}
        {filteredItems.length === 0 && !loading && (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center my-8 shadow-xs">
            <Palette className="h-12 w-12 mx-auto text-pink-300 mb-3" />
            <h3 className="text-base font-bold text-gray-900">No culture & arts found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery
                ? `We couldn't find any items matching "${searchQuery}". Try searching with different keywords or clearing your filters.`
                : 'No culture & arts match the selected category.'}
            </p>
            <div className="flex justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 font-bold text-xs rounded-full transition-colors border border-pink-200"
                >
                  Clear Search
                </button>
              )}
              {activeCategory !== 'All' && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('All')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-xs rounded-full transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {userType === 'admin' && (
              <div className="mt-6">
                <button
                  onClick={() => navigate('/admin/publish')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-all"
                >
                  <span>+ Publish Culture & Arts</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── DETAIL MODAL ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition-all shadow-md"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Media Gallery / Carousel */}
            {detailImages.length > 0 && (
              <div className="relative aspect-[16/10] w-full bg-black rounded-t-3xl overflow-hidden">
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
                  <span className="px-3.5 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold border border-pink-100">
                    {selectedItem.category || 'Culture & Arts'}
                  </span>
                  {selectedItem.period_era && (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
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
                  className="p-2 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {selectedItem.name}
                </h2>

                {selectedItem.artist_name && (
                  <p className="text-xs sm:text-sm font-bold text-pink-600 mt-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    <span>Cultural Bearer / Artist: {selectedItem.artist_name}</span>
                  </p>
                )}

                {selectedItem.location && (
                  <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-pink-500" />
                    <span>{selectedItem.location}</span>
                  </p>
                )}
              </div>

              {/* Full Cultural Story */}
              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
                <p className="font-semibold text-gray-700">
                  {selectedItem.description}
                </p>

                {selectedItem.full_description && selectedItem.full_description !== selectedItem.description && (
                  <div className="pt-3 border-t border-gray-100 whitespace-pre-line text-gray-600">
                    {selectedItem.full_description}
                  </div>
                )}
              </div>

              {/* Video Player if available */}
              {selectedItem.video && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4 text-pink-600" />
                    <span>Cultural Video Feature</span>
                  </h4>
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                    {selectedItem.video.includes('youtube.com') || selectedItem.video.includes('youtu.be') ? (
                      <iframe
                        src={
                          selectedItem.video.includes('watch?v=')
                            ? `https://www.youtube.com/embed/${selectedItem.video.split('v=')[1]?.split('&')[0]}`
                            : selectedItem.video.includes('youtu.be/')
                            ? `https://www.youtube.com/embed/${selectedItem.video.split('youtu.be/')[1]?.split('?')[0]}`
                            : selectedItem.video
                        }
                        title={`Video - ${selectedItem.name}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={selectedItem.video.startsWith('http') ? selectedItem.video : `${API_BASE}${selectedItem.video}`}
                        controls
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-pink-500" />
                  <span>{selectedItem.view_count || 0} views</span>
                </span>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
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
