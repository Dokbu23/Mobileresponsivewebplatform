import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Store, Star, Share2, Heart, Search, X, ChevronLeft, ChevronRight, Phone, MessageSquare, Facebook, Navigation, MapPin, ExternalLink, Lock, Filter, ChevronDown } from 'lucide-react';
import { API_BASE, getPublicJSON, formatImageUrl } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { AutoSwipeCarousel } from '../../components/AutoSwipeCarousel';
import { ShareModal } from '../../components/ShareModal';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  images?: string[];
  category: string;
  badge?: string;
  rating?: number;
  likes?: number;
  sellerName?: string;
  shopName?: string;
  productOwner?: string;
  user_id?: number | null;
  is_registered?: boolean;
  owner?: any;
  variations?: any[];
}

export function Products() {
  const navigate = useNavigate();
  const { userType, currentUser, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const isLoggedIn = Boolean(userType && currentUser);

  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{ title: string; description?: string; image?: string; category?: string } | null>(null);

  const handleStoreClick = (sellerName?: string, userId?: number | string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to view store profile');
      navigate('/tourist/login');
      return;
    }
    if (selectedProduct) setSelectedProduct(null);

    const targetParam = userId ? String(userId) : encodeURIComponent(sellerName || 'Store');
    navigate(`/business/enterprise/${targetParam}`);
  };

  const handleProductCardClick = (product: ProductItem) => {
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to view product details');
      navigate('/tourist/login');
      return;
    }
    setSelectedProduct(product);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getPublicJSON('/products').catch(() => []);
      const raw = Array.isArray(data) ? data : data?.data ?? data?.products ?? [];

      let customProducts: any[] = [];
      try {
        const stored = localStorage.getItem('discover-mansalay:custom_products');
        if (stored) customProducts = JSON.parse(stored);
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

      const allRaw = [...raw].filter((i: any) => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)));
      const existingIds = new Set(allRaw.map((r: any) => String(r.id)));
      customProducts.forEach((cp: any) => {
        if (!existingIds.has(String(cp.id)) && !deletedIds.has(String(cp.id)) && !archivedIds.has(String(cp.id))) {
          allRaw.unshift(cp);
        }
      });

      const mapped = allRaw.map((p: any, idx: number) => {
        let parsedImages: string[] = [];
        if (Array.isArray(p.images)) {
          parsedImages = p.images.map((img: any) => formatImageUrl(img)).filter(Boolean);
        } else if (typeof p.images === 'string' && p.images.trim()) {
          try {
            const arr = JSON.parse(p.images);
            if (Array.isArray(arr)) {
              parsedImages = arr.map((img: any) => formatImageUrl(img)).filter(Boolean);
            }
          } catch {}
        }
        const mainImg = formatImageUrl(p.image);
        if (parsedImages.length === 0 && mainImg) {
          parsedImages = [mainImg];
        }

        return {
          id: String(p.id),
          name: p.name ?? 'Product',
          description: p.description ?? '',
          price: Number(p.price ?? 0),
          stock: Number(p.stock ?? 0),
          image: mainImg,
          images: parsedImages,
          category: p.category ?? 'General',
          badge: p.badge || (idx % 2 === 0 ? 'Best Seller' : 'Top Rated'),
          rating: p.rating || 4.8,
          likes: p.likes || 0,
          sellerName: p.shop_name || p.store_name || p.owner?.store_name || p.owner?.resort_name || p.seller_name || p.owner?.name || 'Mansalay Artisan Co-op',
          shopName: p.shop_name || p.store_name || p.owner?.store_name || 'Mansalay Artisan Store',
          productOwner: p.product_owner || p.owner_name || p.owner?.name || p.seller_name || '',
          user_id: p.user_id,
          is_registered: p.is_registered,
        };
      });
      setItems(mapped);
    } catch (err) {
      console.error('Error fetching real products:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    window.addEventListener('contentUpdated', loadProducts);
    window.addEventListener('storage', loadProducts);
    return () => {
      window.removeEventListener('contentUpdated', loadProducts);
      window.removeEventListener('storage', loadProducts);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      const stored = localStorage.getItem(`discover-mansalay:saved-products:${currentUser.id}`);
      if (stored) {
        try {
          setSavedProductIds(JSON.parse(stored));
        } catch {
          setSavedProductIds([]);
        }
      }
    } else {
      setSavedProductIds([]);
    }
  }, [isLoggedIn, currentUser?.id]);

  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      localStorage.setItem(
        `discover-mansalay:saved-products:${currentUser.id}`,
        JSON.stringify(savedProductIds)
      );
    }
  }, [savedProductIds, isLoggedIn, currentUser?.id]);

  const toggleSaveProduct = (product: ProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser && !getAuthToken()) {
      toast.info('Please log in or register to save to wishlist');
      navigate('/tourist/login');
      return;
    }
    if (isInWishlist(product.id, 'product')) {
      removeFromWishlist(product.id, 'product');
    } else {
      addToWishlist({
        id: product.id,
        type: 'product',
        title: product.name,
        image: product.image,
        category: product.category,
        price: product.price,
      });
    }
  };

  const productCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map(p => p.category).filter((c): c is string => Boolean(c))));
    return cats.filter(c => c && c.toLowerCase() !== 'static' && c.trim() !== '');
  }, [items]);

  const filteredProducts = items.filter(p => {
    const matchesStore = !selectedStoreFilter || 
      (p.sellerName && p.sellerName.toLowerCase().includes(selectedStoreFilter.toLowerCase()));

    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sellerName && p.sellerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || categoryFilter === 'All Categories' || categoryFilter === 'All Products' ||
      (p.category && p.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim());

    return matchesStore && matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50/40 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ── HEADER TITLE & SEARCH ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full" />
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Products</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium pl-4.5">
              Shop authentic Mansalay handicrafts, delicacies, pasalubong, and community-made goods
            </p>
          </div>

          {/* Search Pill Input & Filter Select Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, sellers, or tags..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-medium placeholder:text-gray-400 shadow-2xs outline-none transition-all"
              />
            </div>

            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-full text-xs font-semibold text-gray-700 shadow-2xs outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="All">All Categories</option>
                {productCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── ACTIVE STORE FILTER BANNER ── */}
        {selectedStoreFilter && (
          <div className="mb-6 p-4 bg-pink-50/90 border border-pink-200 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-xs">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Filtered by Store</p>
                <h4 className="text-sm font-extrabold text-gray-900">{selectedStoreFilter}</h4>
              </div>
            </div>
            <button
              onClick={() => setSelectedStoreFilter(null)}
              className="px-3.5 py-1.5 bg-white hover:bg-pink-100 border border-pink-300 rounded-full text-xs font-bold text-pink-700 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <X className="h-3.5 w-3.5 text-pink-500" />
              <span>Show All Stores</span>
            </button>
          </div>
        )}

        {/* ── COUNT SUBHEADER ── */}
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-4">
          <p>Showing <span className="text-gray-900 font-bold">{filteredProducts.length}</span> products</p>
          <p className="hidden sm:block text-gray-400">Click any product for details & seller contact</p>
        </div>

        {/* ── PRODUCT CARDS GRID (4 COLUMNS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const isSaved = savedProductIds.includes(product.id);
            return (
              <div
                key={product.id}
                onClick={() => handleProductCardClick(product)}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Top Image Box */}
                <div className="relative h-60 bg-gray-900 overflow-hidden">
                  <AutoSwipeCarousel
                    images={product.images && product.images.length > 0 ? product.images : [product.image]}
                    alt={product.name}
                    className="w-full h-full"
                    intervalMs={3500}
                  />

                  {/* Top Left Badge */}
                  {product.badge && (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full shadow-xs">
                      {product.badge}
                    </span>
                  )}

                  {/* Top Right Wishlist & Share */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareData({
                          title: product.name,
                          description: product.description,
                          image: product.image,
                          category: product.category || 'Product',
                        });
                      }}
                      className="w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors hover:scale-110"
                      title="Share product"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => toggleSaveProduct(product, e)}
                      className="w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                    >
                      <Heart className={`h-3.5 w-3.5 ${isInWishlist(product.id, 'product') ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
                    </button>
                  </div>

                  {/* Dark Overlay Rating & Likes */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{product.rating || '4.8'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/90">
                      <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                      <span>{product.likes || 189}</span>
                    </div>
                  </div>
                </div>

                {/* Content Below Image */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">{product.category}</p>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mt-0.5">{product.name}</h3>
                    <p className="text-pink-500 font-extrabold text-sm mt-1">
                      ₱{Number(product.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 min-h-[32px]">{product.description}</p>
                  </div>

                  <div
                    onClick={(e) => handleStoreClick(product.sellerName, product.user_id, e)}
                    className="flex flex-col gap-0.5 text-[11px] text-pink-600 hover:text-pink-700 font-semibold mt-4 pt-3 border-t border-gray-100 group/store cursor-pointer transition-colors"
                    title={`Click to view all products from ${product.sellerName || 'this store'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-pink-500 group-hover/store:scale-110 transition-transform flex-shrink-0" />
                      <span className="truncate group-hover/store:underline">{product.shopName || product.sellerName || 'Mansalay Artisan Store'}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-auto flex-shrink-0 group-hover/store:opacity-100 text-pink-500" />
                    </div>
                    {product.productOwner && (
                      <span className="text-[10px] text-gray-400 font-normal pl-5 truncate">
                        Owner: {product.productOwner}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PRODUCT DETAIL MODAL (Exact FIGMA Screenshot 2 Design) ── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Image Slider Header */}
            <div className="relative h-64 bg-gray-900 flex-shrink-0">
              <AutoSwipeCarousel
                images={selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images : [selectedProduct.image]}
                alt={selectedProduct.name}
                className="w-full h-full"
                intervalMs={3000}
                showDots={true}
                showArrows={true}
              />

              {/* Close Button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Category & Badge */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-pink-500 text-white text-[11px] font-bold rounded-full shadow-md">
                  {selectedProduct.category}
                </span>
                {selectedProduct.badge && (
                  <span className="px-3 py-1 bg-black/70 text-white text-[11px] font-bold rounded-full backdrop-blur-md">
                    {selectedProduct.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Title & Price & Actions */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">
                    {selectedProduct.name}
                  </h3>
                  <div className="text-2xl font-black text-pink-600 mt-1">
                    ₱{Number(selectedProduct.price).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShareData({
                        title: selectedProduct.name,
                        description: selectedProduct.description,
                        image: selectedProduct.image,
                        category: selectedProduct.category || 'Product',
                      });
                    }}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    title="Share product"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleSaveProduct(selectedProduct)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-pink-50"><Heart className={`h-4 w-4 ${isInWishlist(selectedProduct.id, 'product') ? 'fill-pink-500 text-pink-500' : ''}`} /></button>
                </div>
              </div>

              {/* Sub-info bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {selectedProduct.rating || '4.8'}
                  </span>
                  <span className="text-gray-400">({selectedProduct.likes || 267} saves)</span>
                  <span>•</span>
                  <button
                    onClick={(e) => handleStoreClick(selectedProduct.sellerName, selectedProduct.user_id, e)}
                    className="font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 cursor-pointer transition-colors group/modalstore"
                    title={`Click to view all products from ${selectedProduct.sellerName || 'this store'}`}
                  >
                    <Store className="h-3.5 w-3.5 text-pink-500 group-hover/modalstore:scale-110 transition-transform" />
                    <span className="underline decoration-pink-300 underline-offset-2 group-hover/modalstore:decoration-pink-600">
                      {selectedProduct.shopName || selectedProduct.sellerName || 'Mansalay Seller'}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover/modalstore:opacity-100" />
                  </button>
                  {selectedProduct.productOwner && (
                    <>
                      <span>•</span>
                      <span className="text-gray-600 font-medium">
                        Owner: <strong className="text-gray-900">{selectedProduct.productOwner}</strong>
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    const query = encodeURIComponent(`${selectedProduct.sellerName || selectedProduct.name} Mansalay Oriental Mindoro`);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                  }}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Navigation className="h-3 w-3" />
                  <span>Directions</span>
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                {selectedProduct.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {['Beaded', 'Jewelry', 'Handmade', 'Cultural'].map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[11px] font-semibold border border-pink-100">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Contact Seller Box */}
              <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-2xl text-center space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900">Interested? Contact the seller to order</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">No online checkout — reach out directly via your preferred channel below.</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <a href="tel:09123456789" className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <a href="https://facebook.com" target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5">
                    <Facebook className="h-3.5 w-3.5" /> Facebook
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
                You are currently in guest mode. Please log in or register to save products to your wishlist.
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
