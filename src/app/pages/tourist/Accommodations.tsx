import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Hotel, MapPin, Star, Share2, Heart, Search, X, ChevronLeft, ChevronRight, Phone, Facebook, Instagram, MessageSquare, Navigation, Clock, Filter, ChevronDown } from 'lucide-react';
import { API_BASE, getPublicJSON } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { AutoSwipeCarousel } from '../../components/AutoSwipeCarousel';
import { ShareModal } from '../../components/ShareModal';

interface AccommodationItem {
  id: string;
  name: string;
  description?: string;
  image: string;
  images?: string[];
  pricePerNight: number;
  location?: string;
  type?: string;
  badge?: string;
  rating?: number;
  likes?: number;
  user_id?: string | number;
  is_registered?: boolean;
  resort_amenities?: string[];
  contact_number?: string;
  website?: string;
}

export function Accommodations() {
  const navigate = useNavigate();
  const { userType, currentUser, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const isLoggedIn = Boolean(userType && currentUser);

  const [items, setItems] = useState<AccommodationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<AccommodationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [savedAccIds, setSavedAccIds] = useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  const loadAccommodations = async () => {
    setLoading(true);
    try {
      const [accRes, attrRes] = await Promise.all([
        getPublicJSON('/accommodations').catch(() => []),
        getPublicJSON('/attractions').catch(() => []),
      ]);
      const rawAcc = Array.isArray(accRes) ? accRes : accRes?.data ?? [];
      const rawAttr = Array.isArray(attrRes) ? attrRes : attrRes?.data ?? [];

      const accAttractions = rawAttr.filter((a: any) =>
        a.category === 'Accommodation' || a.category === 'Accommodations' || a.type === 'Accommodation' || a.type === 'Accommodations'
      );

      let customResorts: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_resorts');
        if (stored) customResorts = JSON.parse(stored);
      } catch { }

      let customAttractions: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_attractions');
        if (stored) {
          const parsed = JSON.parse(stored);
          customAttractions = parsed.filter((a: any) =>
            a.category === 'Accommodation' || a.category === 'Accommodations' || a.type === 'Accommodation' || a.type === 'Accommodations'
          );
        }
      } catch { }

      let deletedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
      } catch { }

      const allRaw = [...rawAcc, ...accAttractions].filter(i => !deletedIds.has(String(i.id)));
      const existingIds = new Set(allRaw.map(r => String(r.id)));
      [...customResorts, ...customAttractions].forEach(cr => {
        if (!existingIds.has(String(cr.id)) && !deletedIds.has(String(cr.id))) {
          allRaw.unshift(cr);
        }
      });

      const mapped = allRaw.map((d: any, idx: number) => {
        let parsedImages: string[] = [];
        if (Array.isArray(d.images)) {
          parsedImages = d.images.map((img: any) => String(img).startsWith('http') ? img : `${API_BASE}${img}`);
        } else if (typeof d.images === 'string' && d.images.trim()) {
          try {
            const arr = JSON.parse(d.images);
            if (Array.isArray(arr)) {
              parsedImages = arr.map((img: any) => String(img).startsWith('http') || String(img).startsWith('/assets') ? img : `${API_BASE}${img}`);
            }
          } catch { }
        }
        const mainImg = d.image
          ? (String(d.image).startsWith('http') || String(d.image).startsWith('/assets') ? d.image : `${API_BASE}${d.image}`)
          : '';
        if (parsedImages.length === 0 && mainImg) {
          parsedImages = [mainImg];
        }

        return {
          id: String(d.id),
          name: d.name || d.resort_name || 'Accommodation',
          description: d.description || '',
          pricePerNight: Number(d.price_per_night ?? d.pricePerNight ?? d.price ?? 0),
          location: d.location || 'Mansalay, Oriental Mindoro',
          type: (d.type === 'resort_profile' || d.category === 'resort_profile') ? 'Beach Resort' : (d.category || d.type || 'Beach Resort'),
          badge: d.badge || (idx % 2 === 0 ? 'Top Rated' : 'Eco-Friendly'),
          rating: d.rating || 4.8,
          likes: d.likes || 0,
          image: mainImg,
          images: parsedImages,
          resort_amenities: Array.isArray(d.resort_amenities) ? d.resort_amenities : []
        };
      });
      setItems(mapped);
    } catch (err) {
      console.error('Error fetching real accommodations:', err);
      let customResorts: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_resorts');
        if (stored) customResorts = JSON.parse(stored);
      } catch { }
      let customAttractions: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_attractions');
        if (stored) {
          const parsed = JSON.parse(stored);
          customAttractions = parsed.filter((a: any) =>
            a.category === 'Accommodation' || a.category === 'Accommodations' || a.type === 'Accommodation' || a.type === 'Accommodations'
          );
        }
      } catch { }
      const mapped = [...customResorts, ...customAttractions].map((d: any, idx: number) => {
        const mainImg = d.image ? (String(d.image).startsWith('http') ? d.image : `${API_BASE}${d.image}`) : '';
        const list = Array.isArray(d.images) && d.images.length > 0 ? d.images.map((img: any) => String(img).startsWith('http') ? img : `${API_BASE}${img}`) : (mainImg ? [mainImg] : []);
        return {
          id: String(d.id),
          name: d.name || 'Accommodation',
          description: d.description || '',
          pricePerNight: Number(d.price_per_night ?? d.price ?? 0),
          location: d.location || 'Mansalay, Oriental Mindoro',
          type: d.category || d.type || 'Accommodation',
          badge: 'Top Rated',
          rating: 4.8,
          likes: 0,
          image: mainImg,
          images: list,
          resort_amenities: []
        };
      });
      setItems(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccommodations();
    window.addEventListener('contentUpdated', loadAccommodations);
    window.addEventListener('storage', loadAccommodations);
    return () => {
      window.removeEventListener('contentUpdated', loadAccommodations);
      window.removeEventListener('storage', loadAccommodations);
    };
  }, []);

  const toggleSaveAcc = (acc: AccommodationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isInWishlist(acc.id, 'accommodation')) {
      removeFromWishlist(acc.id, 'accommodation');
    } else {
      addToWishlist({
        id: acc.id,
        type: 'accommodation',
        title: acc.name,
        image: acc.image,
        category: acc.type,
        price: acc.pricePerNight,
      });
    }
  };

  const predefinedStaysCategories = [
    'Beach Resort',
    'Glamping',
    'Farm Resort',
    'Guesthouse',
    'Hotel',
  ];

  const typeCategories = useMemo(() => {
    const types = Array.from(new Set([...predefinedStaysCategories, ...items.map(acc => acc.type).filter(Boolean)]));
    return types.filter(t => t && t.toLowerCase() !== 'static' && t.toLowerCase() !== 'resort_profile' && t.trim() !== '');
  }, [items]);

  const filteredAccommodations = items.filter(acc => {
    const matchesSearch = !searchQuery ||
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.type && acc.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.location && acc.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.description && acc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'All' || typeFilter === 'All Stays' || acc.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50/40 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ── HEADER TITLE & SEARCH ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Stays & Resorts</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium pl-4.5">
              Discover resorts, glamping sites, and places to stay in Mansalay
            </p>
          </div>

          {/* Search Pill Input & Filter Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accommodations, types, or location..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder:text-gray-400 shadow-2xs outline-none transition-all"
              />
            </div>

            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-semibold text-gray-700 shadow-2xs outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="All">All Categories</option>
                {typeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── COUNT SUBHEADER ── */}
        <p className="text-xs font-semibold text-gray-400 mb-4">
          Showing <span className="text-gray-900 font-bold">{filteredAccommodations.length}</span> stays
        </p>

        {/* ── CARDS GRID (4 COLUMNS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAccommodations.map(acc => {
            const isSaved = savedAccIds.includes(acc.id);
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAcc(acc)}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative h-60 bg-gray-900 overflow-hidden">
                  <AutoSwipeCarousel
                    images={acc.images && acc.images.length > 0 ? acc.images : [acc.image]}
                    alt={acc.name}
                    className="w-full h-full"
                    intervalMs={3500}
                  />

                  {acc.badge && (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full shadow-xs">
                      {acc.badge}
                    </span>
                  )}

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareData({
                          title: acc.name,
                          description: acc.description,
                          image: acc.image,
                          category: acc.type || 'Resort',
                        });
                      }}
                      className="w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors hover:scale-110"
                      title="Share this resort"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => toggleSaveAcc(acc, e)}
                      className="w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                    >
                      <Heart className={`h-3.5 w-3.5 ${isInWishlist(acc.id, 'accommodation') ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
                    </button>
                  </div>

                  {/* Dark Overlay Rating */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[11px] font-bold">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{acc.rating || '4.8'}</span>
                    <span className="text-gray-300 font-normal">({acc.likes || 89} saves)</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">{acc.type || 'Resort'}</p>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mt-0.5">{acc.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 min-h-[32px]">{acc.description}</p>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold mt-4 pt-3 border-t border-gray-100">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{acc.location || 'Mansalay, Oriental Mindoro'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACCOMMODATION DETAIL MODAL (Exact FIGMA Screenshot 3 Design) ── */}
      {selectedAcc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedAcc(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Image Slider Header */}
            <div className="relative h-64 bg-gray-900 flex-shrink-0">
              <AutoSwipeCarousel
                images={selectedAcc.images && selectedAcc.images.length > 0 ? selectedAcc.images : [selectedAcc.image]}
                alt={selectedAcc.name}
                className="w-full h-full"
                intervalMs={3000}
                showDots={true}
                showArrows={true}
              />

              <button
                onClick={() => setSelectedAcc(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Rating Pill on Bottom Left */}
              <div className="absolute bottom-3 left-4 flex items-center gap-1 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span>{selectedAcc.rating || '4.7'}</span>
                <span className="text-gray-300 font-normal">• {selectedAcc.likes || 89} saves</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-3 py-1 bg-pink-100 text-pink-600 text-[11px] font-bold rounded-full uppercase">
                    {selectedAcc.type === 'resort_profile' ? 'Beach Resort' : (selectedAcc.type || 'Beach Resort')}
                  </span>
                  <h2 className="text-xl font-extrabold text-gray-900 mt-2">{selectedAcc.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShareData({
                        title: selectedAcc.name,
                        description: selectedAcc.description,
                        image: selectedAcc.image,
                        category: selectedAcc.type || 'Resort',
                      });
                    }}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    title="Share this resort"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleSaveAcc(selectedAcc)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-pink-50"><Heart className={`h-4 w-4 ${savedAccIds.includes(selectedAcc.id) ? 'fill-pink-500 text-pink-500' : ''}`} /></button>
                </div>
              </div>

              {/* Location & Directions Button */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <MapPin className="h-4 w-4 text-pink-500" />
                    <span>{selectedAcc.location || 'Mansalay, Oriental Mindoro'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>8:00 AM – 8:00 PM</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const query = encodeURIComponent(`${selectedAcc.name} ${selectedAcc.location || 'Mansalay Oriental Mindoro'}`);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Navigation className="h-3 w-3" />
                  <span>Directions</span>
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                {selectedAcc.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {(selectedAcc.resort_amenities || ['Farm', 'Agri-tourism', 'Nature', 'Family-friendly']).map((amenity, i) => (
                  <span key={i} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[11px] font-semibold border border-pink-100">
                    ♡ {amenity}
                  </span>
                ))}
              </div>

              {/* Contact & Connect Box */}
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-2.5">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Contact & Connect</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`tel:${selectedAcc.contact_number || '09123456789'}`} className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <a href="https://facebook.com" target="_blank" rel="noreferrer" className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5">
                    <Facebook className="h-3.5 w-3.5" /> Facebook
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer" className="px-3.5 py-2 bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GUEST LOGIN REQUIRED MODAL ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="w-14 h-14 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Heart className="h-7 w-7 fill-pink-500/20 text-pink-500" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Login Required</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                You are currently in guest mode. Please log in or register to save accommodations to your wishlist.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  navigate('/select-role');
                }}
                className="w-full py-2.5 px-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-full shadow-md shadow-pink-500/20 transition-all"
              >
                Log In / Register
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-full transition-all"
              >
                Continue as Guest
              </button>
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
