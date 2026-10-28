import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Navigation, X, Star, Share2, Search, Tag, Camera, Phone, Facebook, Instagram, MessageCircle, Video, Play, Filter, ChevronDown } from 'lucide-react';
import { API_BASE, getPublicJSON, postJSON, formatImageUrl, parseImageGallery, getAuthToken, decodeHtml, recordView, cleanItineraryTitle } from '../../lib/api';
import { ATTRACTION_CATEGORIES } from '../../lib/constants';
import { AutoSwipeCarousel, uniqueImageUrls } from '../../components/AutoSwipeCarousel';
import { VirtualTourModal } from '../../components/VirtualTourModal';
import { ShareModal } from '../../components/ShareModal';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { showUnsaveConfirmDialog } from '../../lib/sweetAlert';
import { PushPinIcon } from '../../components/PushPinIcon';

interface AttractionType {
  id: string;
  name: string;
  description?: string;
  fullDescription?: string;
  image?: string;
  images?: string[];
  video?: string;
  location?: string;
  category?: string;
  view_count?: number;
  rating?: number;
  likes?: number;
  virtual_tour_scenes?: any[];
}

export function Attractions() {
  const navigate = useNavigate();
  const { userType, currentUser, addToWishlist, removeFromWishlist, isInWishlist, getWishlistCount, canPin } = useApp();
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionType | null>(null);
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);
  const [items, setItems] = useState<AttractionType[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  useEffect(() => {
    if (!selectedAttraction) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedAttraction(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedAttraction]);

  const categoryFilters = useMemo(() => {
    const dynamicCats = items.map(a => a.category).filter((c): c is string => Boolean(c));
    const allCats = Array.from(new Set([...ATTRACTION_CATEGORIES, ...dynamicCats]));
    return allCats.filter(c => c && c.toLowerCase() !== 'static' && c.trim() !== '');
  }, [items]);

  const loadAttractions = async () => {
    try {
      const data = await getPublicJSON('/attractions');
      const raw = Array.isArray(data) ? data : [];

      // The API already applies publication and archive rules. Do not filter
      // by generic local-storage IDs because IDs can overlap across content types.
      const allRaw = raw;

      const mapped = allRaw.map((d: any) => {
        const cleanImages = uniqueImageUrls(parseImageGallery(d.images, d.image));
        const mainImage = formatImageUrl(d.image) || cleanImages[0] || '/assets/mansalay_hero_bg.jpg';

        const videoUrl = d.video
          ? (String(d.video).startsWith('http') ? d.video : `${API_BASE}${d.video}`)
          : undefined;

        return {
          id: String(d.id),
          name: cleanItineraryTitle(d.name),
          description: decodeHtml(d.description),
          fullDescription: decodeHtml(d.full_description ?? d.fullDescription),
          image: mainImage,
          images: cleanImages.length > 0 ? cleanImages : (mainImage ? [mainImage] : []),
          video: videoUrl,
          location: decodeHtml(d.location),
          category: decodeHtml(d.category || 'General'),
          view_count: Number(d.view_count) || 0,
          rating: d.rating || 4.8,
          likes: d.likes || 0,
        };
      });
      setItems(mapped);
    } catch (e: any) {
      console.error('Error fetching attractions:', e);
      setItems([]);
      setAllAttractions([]);
    }
  };

  useEffect(() => {
    loadAttractions();
    window.addEventListener('contentUpdated', loadAttractions);
    window.addEventListener('storage', loadAttractions);
    return () => {
      window.removeEventListener('contentUpdated', loadAttractions);
      window.removeEventListener('storage', loadAttractions);
    };
  }, []);

  const filteredAttractions = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.fullDescription && item.fullDescription.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const handleToggleLike = async (e: React.MouseEvent, attraction: AttractionType) => {
    e.stopPropagation();
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to save to wishlist');
      navigate('/tourist/login');
      return;
    }
    if (isInWishlist(attraction.id, 'attraction')) {
      const confirmed = await showUnsaveConfirmDialog(attraction.name);
      if (confirmed) {
        removeFromWishlist(attraction.id, 'attraction', attraction.name);
      }
    } else {
      addToWishlist({
        id: attraction.id,
        type: 'attraction',
        title: attraction.name,
        image: attraction.image,
        category: attraction.category,
        likes: attraction.likes,
      } as any);
    }
  };

  const handleOpenModal = (attraction: AttractionType) => {
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to view attraction details');
      navigate('/tourist/login');
      return;
    }
    recordView(attraction.id, 'attraction');
    setSelectedAttraction({
      ...attraction,
      images: attraction.images && attraction.images.length > 0
        ? attraction.images
        : [attraction.image || '/assets/mansalay_hero_bg.jpg'],
    });
    // Record view in database
    postJSON(`/public/attractions/${attraction.id}/view`, {}, false).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-12">
      {/* Top Header Section */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header Title + Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Attractions
                </h1>
              </div>
              <p className="text-gray-500 text-sm pl-4">
                Explore the natural wonders and cultural treasures of Mansalay
              </p>
            </div>

            {/* Search Input Bar & Filter Select Dropdown */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search attractions, tags, or location"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder-gray-400 outline-none shadow-2xs transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
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
                  {categoryFilters.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-700">{filteredAttractions.length}</span> attractions
            {searchQuery && (
              <span> for "<span className="font-semibold text-gray-800">{searchQuery}</span>"</span>
            )}
          </div>
        </div>
      </div>

      {/* Attractions Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAttractions.map(attraction => {
            return (
              <div
                key={attraction.id}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                onClick={() => handleOpenModal(attraction)}
              >
                {/* Top Image Box */}
                <div className="relative h-64 bg-gray-900 overflow-hidden">
                  <AutoSwipeCarousel
                    images={attraction.images && attraction.images.length > 0 ? attraction.images : [attraction.image || '/assets/mansalay_hero_bg.jpg']}
                    alt={attraction.name}
                    className="w-full h-full"
                    imageClassName="w-full h-full transition-transform duration-500"
                    showDots={false}
                    showArrows={true}
                  />

                  {/* Top Left Stacked Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    {attraction.category && (
                      <span className="px-3 py-0.5 bg-pink-500 text-white text-[10px] font-extrabold rounded-full shadow-xs uppercase">
                        {attraction.category}
                      </span>
                    )}
                  </div>

                  {/* Top Right Pin Button */}
                  <button
                    disabled={!canPin}
                    onClick={(e) => handleToggleLike(e, attraction)}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow-sm flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer z-10 ${
                      isInWishlist(attraction.id, 'attraction')
                        ? 'bg-rose-50 border border-rose-300 ring-2 ring-rose-100'
                        : 'bg-white/90 hover:bg-white border border-gray-200 text-gray-700'
                    }`}
                    title={isInWishlist(attraction.id, 'attraction') ? 'Remove from saved places' : 'Pin to saved places'}
                  >
                    <PushPinIcon
                      isPinned={isInWishlist(attraction.id, 'attraction')}
                      size={16}
                      idPrefix={`attr-${attraction.id}`}
                    />
                  </button>

                  {/* Dark Bottom Overlay with Title & Location */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/90 via-gray-950/50 to-transparent p-4">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
                      {attraction.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-300 mt-1 font-medium">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                        <span className="truncate">{attraction.location || 'Mansalay, Oriental Mindoro'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white">
                        <MapPin className="h-3 w-3 text-pink-400 fill-pink-400" />
                        <span>{getWishlistCount(attraction.id, 'attraction', attraction.likes)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Bar */}
                <div className="p-3.5 bg-white flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{attraction.location || 'Mansalay, Oriental Mindoro'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareData({
                        title: attraction.name,
                        description: attraction.description,
                        image: attraction.image,
                        category: attraction.category || 'Attraction',
                      });
                    }}
                    className="text-pink-500 hover:text-pink-600 transition-colors p-1 hover:scale-110"
                    title="Share attraction"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAttractions.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center my-6 shadow-xs">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-base mb-1">No attractions found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `We couldn't find any attractions matching "${searchQuery}". Try searching for something else or clearing your filters.`
                : 'No attractions match the selected category.'}
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
                  Reset Category
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🌟 ATTRACTION DETAIL MODAL 🌟 */}
      {selectedAttraction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedAttraction(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Carousel Image Box */}
            <div className="relative h-72 bg-white overflow-hidden flex-shrink-0">
              <AutoSwipeCarousel
                images={selectedAttraction.images && selectedAttraction.images.length > 0 ? selectedAttraction.images : [selectedAttraction.image || '/assets/mansalay_hero_bg.jpg']}
                alt={selectedAttraction.name}
                presentation="modal"
                className="w-full h-full"
                imageClassName="w-full h-full"
                intervalMs={3500}
                showDots={true}
                showArrows={true}
              />

              {/* Top-Left Badge e.g. Must Visit */}
              <div className="absolute top-4 left-4 bg-pink-500 text-white text-xs font-semibold px-3.5 py-1 rounded-full shadow-md z-10">
                {selectedAttraction.category || 'Must Visit'}
              </div>

              {/* Top-Right Action Buttons */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2 pointer-events-auto">
                <button
                  disabled={!canPin}
                  onClick={(e) => handleToggleLike(e, selectedAttraction)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                    isInWishlist(selectedAttraction.id, 'attraction')
                      ? 'bg-rose-50 border border-rose-300 ring-2 ring-rose-100'
                      : 'bg-white/90 hover:bg-white border border-gray-200'
                  }`}
                  title={isInWishlist(selectedAttraction.id, 'attraction') ? 'Remove from saved places' : 'Pin to saved places'}
                >
                  <PushPinIcon
                    isPinned={isInWishlist(selectedAttraction.id, 'attraction')}
                    size={18}
                    idPrefix={`modal-attr-${selectedAttraction.id}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttraction(null)}
                  className="z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer pointer-events-auto"
                  aria-label="Close attraction details"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Attraction Title */}
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                  {selectedAttraction.name}
                </h2>
              </div>

              {/* Location & Directions Button */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 min-w-0">
                  <MapPin className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <span className="truncate">{selectedAttraction.location || 'Mansalay, Oriental Mindoro'}</span>
                </div>
                <button
                  onClick={() => alert(`Navigating to ${selectedAttraction.location || 'Mansalay, Oriental Mindoro'}`)}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <Navigation className="h-3 w-3" />
                  <span>Directions</span>
                </button>
              </div>

              {/* Full Description */}
              <p className="text-gray-600 text-sm leading-relaxed font-normal">
                {selectedAttraction.fullDescription || selectedAttraction.description ||
                  'The Oriental Mindoro Heritage and Cultural Center is a landmark institution dedicated to preserving and celebrating the rich history and indigenous heritage of Oriental Mindoro.'}
              </p>

              {/* Tags Section */}
              <div className="flex flex-wrap gap-2 pt-1">
                {['Culture', 'History', 'Museum', 'Heritage'].map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-pink-50 text-pink-500 border border-pink-100/80 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Virtual Tour & Video Player Box */}
              {(() => {
                const PLACEHOLDER = 'pannellum.org';
                const hasRealScenes =
                  Array.isArray(selectedAttraction.virtual_tour_scenes) &&
                  selectedAttraction.virtual_tour_scenes.length > 0 &&
                  selectedAttraction.virtual_tour_scenes.some((s: any) => {
                    const url = s.previewUrl || s.imageUrl || s.panoramaUrl || '';
                    return url && !url.includes(PLACEHOLDER);
                  });
                const hasVirtualTour =
                  !!(selectedAttraction.video) ||
                  hasRealScenes;
                return (
                  <div className="bg-gradient-to-br from-indigo-50/70 via-white to-pink-50/40 border border-indigo-100 rounded-2xl p-4 sm:p-5 my-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
                        <Video className="h-4 w-4 text-indigo-600" />
                        <span>{selectedAttraction.video ? '🎥 Virtual Video Tour Available' : hasVirtualTour ? 'Virtual Tour Available' : 'Virtual Tour'}</span>
                      </div>
                      {selectedAttraction.video ? (
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Video Ready
                        </span>
                      ) : !hasVirtualTour ? (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Not Available
                        </span>
                      ) : null}
                    </div>

                    {selectedAttraction.video ? (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-gray-800">
                        {selectedAttraction.video.includes('youtube.com') || selectedAttraction.video.includes('youtu.be') ? (
                          <iframe
                            src={selectedAttraction.video.includes('watch?v=') ? `https://www.youtube.com/embed/${selectedAttraction.video.split('v=')[1]?.split('&')[0]}` : selectedAttraction.video.includes('youtu.be/') ? `https://www.youtube.com/embed/${selectedAttraction.video.split('youtu.be/')[1]?.split('?')[0]}` : selectedAttraction.video}
                            title={`Virtual Tour - ${selectedAttraction.name}`}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={selectedAttraction.video.startsWith('http') ? selectedAttraction.video : `${API_BASE}${selectedAttraction.video}`}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : null}

                    {hasVirtualTour ? (
                      <button
                        onClick={() => setIsVirtualTourOpen(true)}
                        className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white font-bold rounded-xl text-xs shadow-md shadow-pink-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Open Fullscreen Virtual Tour</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-center text-gray-400 font-medium">No virtual tour posted for this attraction yet</p>
                        <button
                          disabled
                          className="w-full py-2.5 bg-gray-100 text-gray-400 border border-dashed border-gray-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed select-none opacity-60"
                          title="No virtual tour has been set up for this attraction"
                        >
                          <Play className="h-3.5 w-3.5 text-gray-300" />
                          <span>Virtual Tour — Unavailable</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Contact & Connect Section matching screenshot */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  CONTACT & CONNECT
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href="tel:09123456789"
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/80 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call</span>
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100/80 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    <span>Facebook</span>
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-100/80 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    <span>Instagram</span>
                  </a>
                  <button
                    onClick={() => {
                      alert(`Opening chat message for ${selectedAttraction.name}...`);
                    }}
                    className="bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 border border-fuchsia-100/80 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Message</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 360° Interactive Virtual Tour & Video Modal */}
      {selectedAttraction && (
        <VirtualTourModal
          isOpen={isVirtualTourOpen}
          onClose={() => setIsVirtualTourOpen(false)}
          attractionName={selectedAttraction.name}
          category={selectedAttraction.category}
          mainImage={selectedAttraction.image}
          videoUrl={selectedAttraction.video}
          lat={Number((selectedAttraction as any).lat || (selectedAttraction as any).latitude) || undefined}
          lng={Number((selectedAttraction as any).lng || (selectedAttraction as any).longitude) || undefined}
        />
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
