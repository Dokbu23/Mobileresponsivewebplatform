import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Navigation, X, Star, Heart, ChevronLeft, ChevronRight, Share2, Search, Tag, Camera, Phone, Facebook, Instagram, MessageCircle, ArrowRight, Video, Play, Filter, ChevronDown } from 'lucide-react';
import { API_BASE, getPublicJSON, postJSON, formatImageUrl, getAuthToken } from '../../lib/api';
import { ATTRACTION_CATEGORIES } from '../../lib/constants';
import { VirtualTourModal } from '../../components/VirtualTourModal';
import { AutoSwipeCarousel } from '../../components/AutoSwipeCarousel';
import { ShareModal } from '../../components/ShareModal';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';

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
}

export function Attractions() {
  const navigate = useNavigate();
  const { currentUser, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionType | null>(null);
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [items, setItems] = useState<AttractionType[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedAttractions, setLikedAttractions] = useState<Set<string>>(new Set());
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<string, number>>({});
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  const categoryFilters = useMemo(() => {
    const dynamicCats = items.map(a => a.category).filter((c): c is string => Boolean(c));
    const allCats = Array.from(new Set([...ATTRACTION_CATEGORIES, ...dynamicCats]));
    return allCats.filter(c => c && c.toLowerCase() !== 'static' && c.trim() !== '');
  }, [items]);

  const loadAttractions = async () => {
    try {
      const data = await getPublicJSON('/attractions');
      const raw = Array.isArray(data) ? data : [];

      let customAttractions: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_attractions');
        if (stored) customAttractions = JSON.parse(stored);
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

      const allRaw = [...raw].filter(i => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)));
      const existingIds = new Set(allRaw.map(r => String(r.id)));
      customAttractions.forEach(ca => {
        if (!existingIds.has(String(ca.id)) && !deletedIds.has(String(ca.id)) && !archivedIds.has(String(ca.id))) {
          allRaw.unshift(ca);
        }
      });

      const mapped = allRaw.map((d: any) => {
        let parsedImages: string[] = [];
        if (Array.isArray(d.images)) {
          parsedImages = d.images;
        } else if (typeof d.images === 'string' && d.images.trim()) {
          try {
            const parsed = JSON.parse(d.images);
            if (Array.isArray(parsed)) parsedImages = parsed;
            else if (d.images.includes(',')) parsedImages = d.images.split(',').map((s: string) => s.trim());
            else parsedImages = [d.images];
          } catch {
            if (d.images.includes(',')) parsedImages = d.images.split(',').map((s: string) => s.trim());
            else parsedImages = [d.images];
          }
        }

        if (parsedImages.length === 0 && d.image) {
          if (typeof d.image === 'string' && d.image.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(d.image);
              if (Array.isArray(parsed)) parsedImages = parsed;
              else parsedImages = [d.image];
            } catch {
              parsedImages = [d.image];
            }
          } else {
            parsedImages = [d.image];
          }
        }

        const cleanImages = parsedImages.map((img: string) => formatImageUrl(img)).filter(Boolean);
        const mainImage = formatImageUrl(d.image) || cleanImages[0] || '/assets/mansalay_hero_bg.jpg';

        const videoUrl = d.video
          ? (String(d.video).startsWith('http') ? d.video : `${API_BASE}${d.video}`)
          : undefined;

        return {
          id: String(d.id),
          name: d.name,
          description: d.description,
          fullDescription: d.full_description ?? d.fullDescription,
          image: mainImage,
          images: cleanImages.length > 0 ? cleanImages : (mainImage ? [mainImage] : []),
          video: videoUrl,
          location: d.location,
          category: d.category || 'General',
          view_count: Number(d.view_count) || 0,
          rating: d.rating || 4.8,
          likes: d.likes || 0,
        };
      });
      setItems(mapped);
      
      // Initialize image indices
      const indices: Record<string, number> = {};
      mapped.forEach(item => {
        indices[item.id] = 0;
      });
      setCurrentImageIndices(indices);
    } catch (e: any) {
      console.error('Error fetching attractions:', e);
      let customAttractions: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_attractions');
        if (stored) customAttractions = JSON.parse(stored);
      } catch {}
      let deletedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
      } catch {}
      const mapped = customAttractions.filter(d => !deletedIds.has(String(d.id))).map((d: any) => ({
        id: String(d.id),
        name: d.name,
        description: d.description,
        fullDescription: d.full_description ?? d.description,
        image: d.image || '/assets/default-attraction.jpg',
        images: d.image ? [d.image] : [],
        video: d.video,
        location: d.location,
        category: d.category || 'General',
        view_count: 0,
        rating: 4.8,
        likes: 0,
      }));
      setItems(mapped);
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
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.fullDescription && item.fullDescription.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const handleToggleLike = (e: React.MouseEvent, attraction: AttractionType) => {
    e.stopPropagation();
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to save to wishlist');
      navigate('/tourist/login');
      return;
    }
    if (isInWishlist(attraction.id, 'attraction')) {
      removeFromWishlist(attraction.id, 'attraction');
    } else {
      addToWishlist({
        id: attraction.id,
        type: 'attraction',
        title: attraction.name,
        image: attraction.image,
        category: attraction.category,
      });
    }
  };

  const handleImageNavigation = (e: React.MouseEvent, attractionId: string, direction: 'prev' | 'next') => {
    e.stopPropagation();
    const attraction = items.find(item => item.id === attractionId);
    if (!attraction?.images) return;
    
    setCurrentImageIndices(prev => {
      const currentIndex = prev[attractionId] || 0;
      const imagesCount = attraction.images!.length;
      let newIndex;
      
      if (direction === 'prev') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : imagesCount - 1;
      } else {
        newIndex = currentIndex < imagesCount - 1 ? currentIndex + 1 : 0;
      }
      
      return { ...prev, [attractionId]: newIndex };
    });
  };

  const getSpecialBadge = (attraction: AttractionType, index: number) => {
    if (attraction.view_count && attraction.view_count > 1000) return 'Most Visit';
    if (attraction.likes && attraction.likes > 200) return 'Most Wishlist';  
    if (index < 2) return 'Trending';
    return null;
  };

  const handleOpenModal = (attraction: AttractionType) => {
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to view attraction details');
      navigate('/tourist/login');
      return;
    }
    setSelectedAttraction(attraction);
    setModalImageIndex(0);
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
          {filteredAttractions.map((attraction, index) => {
            const hasMultipleImages = Boolean(attraction.images && attraction.images.length > 1);
            const currentImageIndex = currentImageIndices[attraction.id] || 0;
            const currentImage = (attraction.images && attraction.images.length > 0)
              ? attraction.images[currentImageIndex]
              : (attraction.image || '/assets/default-attraction.jpg');
            const specialBadge = getSpecialBadge(attraction, index);
            const isLiked = likedAttractions.has(attraction.id);
            
            return (
              <div
                key={attraction.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col group"
                onClick={() => handleOpenModal(attraction)}
              >
                {/* Image Container with Carousel */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <AutoSwipeCarousel
                    images={attraction.images && attraction.images.length > 0 ? attraction.images : (attraction.image ? [attraction.image] : [])}
                    alt={attraction.name}
                    className="w-full h-full"
                    intervalMs={3500}
                  />

                  {/* Dark gradient overlay for rating & wishlists readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Special Badge (top left) */}
                  {specialBadge && (
                    <div className="absolute top-3 left-3 bg-pink-500 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm z-10">
                      {specialBadge}
                    </div>
                  )}

                  {/* Action Icons (top right) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
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
                      className="w-7 h-7 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-sm transition-colors hover:scale-110"
                      title="Share attraction"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleToggleLike(e, attraction)}
                      className="w-7 h-7 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow-sm transition-colors"
                      title="Add to Wishlist"
                    >
                      <Heart 
                        className={`h-3.5 w-3.5 ${isInWishlist(attraction.id, 'attraction') ? 'fill-pink-500 text-pink-500' : 'text-gray-700'}`} 
                      />
                    </button>
                  </div>

                  {/* Left & Right Arrow Navigation (Visible when multiple images) */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={(e) => handleImageNavigation(e, attraction.id, 'prev')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-pink-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-md border border-white/20"
                        title="Previous image"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleImageNavigation(e, attraction.id, 'next')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-pink-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-md border border-white/20"
                        title="Next image"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      {/* Image Indicator Dots at bottom center */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
                        {attraction.images!.map((_, imgIdx) => (
                          <div
                            key={imgIdx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              imgIdx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Category & Likes overlay at bottom of image */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-10">
                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[11px] font-semibold">
                      <Tag className="h-3 w-3 text-pink-400" />
                      <span>{attraction.category}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white text-[11px] font-medium">
                      <Heart className="h-3 w-3 text-pink-400 fill-pink-400/50" />
                      <span>{attraction.likes}</span>
                    </div>
                  </div>
                </div>

                {/* Card Text Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 block mb-1">
                      {attraction.category}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm mb-1.5 line-clamp-1 group-hover:text-pink-500 transition-colors">
                      {attraction.name}
                    </h3>
                    <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-3">
                      {attraction.description || 'A landmark cultural institution preserving the rich history and indigenous heritage...'}
                    </p>
                  </div>
                  
                  {/* Location footer matching screenshot */}
                  <div className="flex items-center text-pink-500 text-[11px] font-medium pt-2 border-t border-gray-50">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{attraction.location || 'Mansalay, Oriental Mindoro'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAttractions.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-800 text-base">No attractions found</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? `No results found for "${searchQuery}"` : 'No attractions available in this category'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-full text-xs font-medium hover:bg-pink-600 transition-colors shadow-sm"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal matching user screenshot */}
      {selectedAttraction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedAttraction(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Modal Image Banner with Badges & Arrows */}
            <div className="relative aspect-[16/10] bg-gray-900 flex-shrink-0">
              <AutoSwipeCarousel
                images={selectedAttraction.images && selectedAttraction.images.length > 0 ? selectedAttraction.images : (selectedAttraction.image ? [selectedAttraction.image] : [])}
                alt={selectedAttraction.name}
                className="w-full h-full"
                intervalMs={3000}
                showDots={true}
                showArrows={true}
              />

              {/* Top-Left Badge e.g. Must Visit */}
              <div className="absolute top-4 left-4 bg-pink-500 text-white text-xs font-semibold px-3.5 py-1 rounded-full shadow-md z-10">
                {getSpecialBadge(selectedAttraction, 0) || 'Must Visit'}
              </div>

              {/* Top-Right Close Button */}
              <button
                onClick={() => setSelectedAttraction(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-colors z-20"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Left & Right Navigation Arrows */}
              {selectedAttraction.images && selectedAttraction.images.length > 1 && (
                <>
                  <button
                    onClick={() => setModalImageIndex(prev => (prev > 0 ? prev - 1 : selectedAttraction.images!.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 border border-white/10"
                    title="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setModalImageIndex(prev => (prev < selectedAttraction.images!.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 border border-white/10"
                    title="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Bottom-Left Saves Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 z-10">
                <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />
                <span className="font-bold">{selectedAttraction.likes} saves</span>
              </div>

              {/* Bottom-Center Dots Indicator if multiple images */}
              {selectedAttraction.images && selectedAttraction.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  {selectedAttraction.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setModalImageIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === modalImageIndex ? 'bg-white w-3.5' : 'bg-white/50 w-1.5'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Full Description */}
              <p className="text-gray-600 text-sm leading-relaxed font-normal">
                {selectedAttraction.fullDescription || selectedAttraction.description || 
                  'The Oriental Mindoro Heritage and Cultural Center is a landmark institution dedicated to preserving and celebrating the rich history and indigenous heritage of Oriental Mindoro. Visitors can explore exhibits on Mangyan culture, colonial history, and the natural wonders of the region through interactive displays and curated artifacts.'}
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

              {/* Virtual Tour & Video Box */}
              <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 text-center my-2">
                <div className="flex items-center justify-center gap-2 font-bold text-gray-900 text-sm mb-3">
                  <Video className="h-4 w-4 text-pink-500" />
                  <span>{selectedAttraction.video ? 'Attraction Video Available' : 'Virtual Tour Available'}</span>
                </div>
                <button
                  onClick={() => setIsVirtualTourOpen(true)}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white font-bold rounded-xl text-sm shadow-md shadow-pink-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>Virtual Tour</span>
                </button>
              </div>

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
