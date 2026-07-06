import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Hotel, Store, MapPin, Phone, Mail, Star,
  ArrowLeft, Package, Search, CreditCard,
  MessageCircle, Heart,
  CheckCircle, ShoppingBag
} from 'lucide-react';
import { getPublicJSON, getAuthToken } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import ChatModal from '../../components/ChatModal';

interface BusinessOwner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  barangay?: string;
  description?: string;
  payment_details?: any[];
  created_at?: string;
  store_name?: string;
  store_description?: string;
  store_logo?: string;
  store_banner?: string;
  store_is_setup?: boolean;
}

interface BusinessProfileData {
  owner: BusinessOwner;
  accommodations?: any[];
  products?: any[];
  is_registered: boolean;
}

export function BusinessProfile() {
  const { type, userId } = useParams<{ type: 'resort' | 'enterprise'; userId: string }>();
  const navigate = useNavigate();
  const { addToCart, userType } = useApp();
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!type || !userId) return;

    (async () => {
      try {
        const result = await getPublicJSON(`/business/${type}/${userId}`);
        setData(result);
      } catch {
        setError('Business profile not found or not yet approved.');
      } finally {
        setLoading(false);
      }
    })();
  }, [type, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-32 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Store className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Shop Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { owner } = data;
  const isResort = type === 'resort';
  const products = data.products || [];
  const accommodations = data.accommodations || [];
  const items = isResort ? accommodations : products;

  const getImageUrl = (img: string) => {
    if (!img) return '/assets/default-product.jpg';
    return img.startsWith('http') ? img : `http://localhost:8000${img}`;
  };

  const totalProducts = items.length;
  const joinedYear = owner.created_at ? new Date(owner.created_at).getFullYear() : new Date().getFullYear();
  const yearsActive = new Date().getFullYear() - joinedYear;

  // Categories with product images
  const categoryMap = new Map<string, { count: number; image: string }>();
  products.forEach((p: any) => {
    if (p.category) {
      if (!categoryMap.has(p.category)) {
        categoryMap.set(p.category, { count: 1, image: p.image });
      } else {
        const existing = categoryMap.get(p.category)!;
        categoryMap.set(p.category, { ...existing, count: existing.count + 1 });
      }
    }
  });
  const categories = Array.from(categoryMap.entries()).map(([name, info]) => ({
    name,
    count: info.count,
    image: info.image,
  }));

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAccommodations = accommodations.filter((accommodation: any) => {
    return accommodation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           accommodation.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Unfollowed shop' : 'Following shop!');
  };

  const handleChat = () => {
    if (!getAuthToken()) {
      toast.error('Please login to chat with the shop');
      navigate('/select-role');
      return;
    }
    setChatOpen(true);
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      id: String(product.id),
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      stock: Number(product.stock),
      image: product.image || '',
      category: product.category || '',
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors mb-3 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </button>

        {/* 🌟 SHOP HEADER BANNER - Enhanced */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Banner */}
          {owner.store_banner ? (
            <div className="relative h-36 md:h-48 overflow-hidden">
              <img
                src={getImageUrl(owner.store_banner)}
                alt="Store banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          ) : (
            <div className="h-24 bg-gradient-to-br from-pink-50 via-white to-pink-50" />
          )}

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo / Avatar */}
                <div className="relative -mt-10">
                  {owner.store_logo ? (
                    <img
                      src={getImageUrl(owner.store_logo)}
                      alt={(owner.store_name && owner.store_name !== 'default') ? owner.store_name : owner.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-lg ring-4 ring-white border-2 border-pink-100"
                    />
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                      {isResort
                        ? <Hotel className="h-8 w-8 md:h-10 md:w-10 text-white" />
                        : <Store className="h-8 w-8 md:h-10 md:w-10 text-white" />
                      }
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* Shop Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                      {(owner.store_name && owner.store_name !== 'default') ? owner.store_name : owner.name}
                    </h1>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                      ✓ Verified
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                    <span>Active {yearsActive > 0 ? `${yearsActive} year${yearsActive > 1 ? 's' : ''} ago` : 'Today'}</span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[owner.barangay, 'Mansalay'].filter(Boolean).join(', ')}
                    </span>
                  </p>
                  {owner.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 max-w-xl">{owner.description}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFollowing ? 'fill-gray-700' : 'fill-white'}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={handleChat}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50 transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
            <div className="px-3 py-3 text-center">
              <div className="text-base md:text-lg font-bold text-pink-500">{totalProducts}</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">{isResort ? 'Rooms' : 'Products'}</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-base md:text-lg font-bold text-pink-500">
                4.8 <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Rating</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-base md:text-lg font-bold text-pink-500">100%</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Response</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-base md:text-lg font-bold text-pink-500">{yearsActive}y</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Joined</div>
            </div>
          </div>
        </div>

        {/* 🎨 PROMO BANNERS REMOVED */}

        {/* 📁 CATEGORIES */}
        {!isResort && categories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 tracking-widest">CATEGORIES</h2>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs text-pink-500 hover:text-pink-600 font-semibold"
                >
                  View All
                </button>
              )}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                {/* All Products */}
                <div
                  onClick={() => setSelectedCategory('all')}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 transition-all shadow-sm ${
                    selectedCategory === 'all'
                      ? 'border-pink-500 ring-4 ring-pink-100 scale-110'
                      : 'border-gray-200 group-hover:border-pink-300 group-hover:scale-105'
                  } bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center`}>
                    <ShoppingBag className={`h-7 w-7 md:h-8 md:w-8 ${selectedCategory === 'all' ? 'text-pink-600' : 'text-pink-500'}`} />
                  </div>
                  <span className={`text-[10px] md:text-xs text-center font-medium leading-tight ${
                    selectedCategory === 'all' ? 'text-pink-500 font-bold' : 'text-gray-700'
                  }`}>
                    All Products
                    <div className="text-[9px] text-gray-400">({products.length})</div>
                  </span>
                </div>

                {/* Dynamic Categories */}
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.name;
                  return (
                    <div
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className="flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 transition-all shadow-sm ${
                        isSelected
                          ? 'border-pink-500 ring-4 ring-pink-100 scale-110'
                          : 'border-gray-200 group-hover:border-pink-300 group-hover:scale-105'
                      } bg-gray-100`}>
                        <img
                          src={getImageUrl(category.image)}
                          alt={category.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/assets/default-product.jpg';
                          }}
                        />
                      </div>
                      <span className={`text-[10px] md:text-xs text-center font-medium leading-tight line-clamp-1 ${
                        isSelected ? 'text-pink-500 font-bold' : 'text-gray-700'
                      }`}>
                        {category.name}
                        <div className="text-[9px] text-gray-400">({category.count})</div>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 🔍 SEARCH BAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products in this shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* 📦 PRODUCTS GRID */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 tracking-widest">
              {selectedCategory === 'all' 
                ? (isResort ? 'ALL ACCOMMODATIONS' : 'ALL PRODUCTS')
                : selectedCategory.toUpperCase()}
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {isResort ? filteredAccommodations.length : filteredProducts.length} items
            </span>
          </div>

          <div className="p-4">
            {isResort ? (
              filteredAccommodations.length === 0 ? (
                <div className="py-16 text-center">
                  <Hotel className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No accommodations available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {filteredAccommodations.map((accommodation: any) => (
                    <AccommodationCard
                      key={accommodation.id}
                      accommodation={accommodation}
                      onBookNow={() => navigate('/accommodations')}
                    />
                  ))}
                </div>
              )
            ) : (
              filteredProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium mb-4">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No products match your search' 
                      : 'No products available'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {filteredProducts.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      userType={userType}
                      onAddToCart={() => handleAddToCart(product)}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* 💳 PAYMENT METHODS */}
        {owner.payment_details && owner.payment_details.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
            <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-pink-500" />
              <h2 className="text-sm font-bold text-gray-800 tracking-widest">ACCEPTED PAYMENT METHODS</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {owner.payment_details.map((payment: any, index: number) => (
                <div key={index} className="border-2 border-pink-100 bg-pink-50/30 rounded-xl p-4 hover:border-pink-300 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-0.5 bg-pink-500 text-white text-[10px] font-bold rounded uppercase">
                      {payment.type}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{payment.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{payment.account_number}</p>
                  <p className="text-xs text-gray-500">{payment.account_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📞 CONTACT INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
          <h3 className="text-sm font-bold text-gray-800 tracking-widest mb-4">CONTACT INFORMATION</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {owner.email && (
              <a href={`mailto:${owner.email}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-all">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-pink-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm text-gray-800 truncate font-medium">{owner.email}</div>
                </div>
              </a>
            )}
            {owner.phone && (
              <a href={`tel:${owner.phone}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-all">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-pink-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="text-sm text-gray-800 font-medium">{owner.phone}</div>
                </div>
              </a>
            )}
            {(owner.address || owner.barangay) && (
              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-pink-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm text-gray-800 truncate font-medium">
                    {[owner.barangay, 'Mansalay, Oriental Mindoro'].filter(Boolean).join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        receiverId={owner.id}
        receiverName={owner.name}
        receiverRole={isResort ? 'resort' : 'enterprise'}
      />
    </div>
  );
}

// Clean Product Card
function ProductCard({ product, userType, onAddToCart }: any) {
  const imageUrl = product.image
    ? (product.image.startsWith('http') ? product.image : `http://localhost:8000${product.image}`)
    : '/assets/default-product.jpg';

  const isOutOfStock = product.stock === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all duration-300 group cursor-pointer">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = '/assets/default-product.jpg'; }}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-800">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3 className="text-sm text-gray-900 line-clamp-2 min-h-[40px] leading-snug mb-2 font-medium">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-0.5 mb-2">
          <span className="text-pink-500 text-xs">₱</span>
          <span className="text-pink-500 font-bold text-base">
            {Number(product.price).toLocaleString()}
          </span>
        </div>

        {/* Rating & Stock */}
        <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">4.8</span>
          <span className="mx-1">|</span>
          <span className={isOutOfStock ? 'text-red-500' : 'text-gray-500'}>
            {isOutOfStock ? 'Out' : `${product.stock} left`}
          </span>
        </div>

        {/* Add to Cart */}
        {userType === 'tourist' && !isOutOfStock && (
          <button
            onClick={onAddToCart}
            className="w-full py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100 shadow-sm"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

// Clean Accommodation Card (no Resort badges)
function AccommodationCard({ accommodation, onBookNow }: any) {
  const imageUrl = accommodation.image
    ? (accommodation.image.startsWith('http') ? accommodation.image : `http://localhost:8000${accommodation.image}`)
    : '/assets/default-accommodation.jpg';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all duration-300 group cursor-pointer">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={accommodation.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = '/assets/default-accommodation.jpg'; }}
        />
      </div>
      <div className="p-3">
        <h3 className="text-sm text-gray-900 line-clamp-2 min-h-[40px] leading-snug mb-2 font-medium">
          {accommodation.name}
        </h3>
        <div className="flex items-baseline gap-0.5 mb-2">
          <span className="text-pink-500 text-xs">₱</span>
          <span className="text-pink-500 font-bold text-base">
            {Number(accommodation.price_per_night).toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 ml-1">/night</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">4.8</span>
          <span className="mx-1">|</span>
          <span className="text-green-600">Available</span>
        </div>
        <button
          onClick={onBookNow}
          className="w-full py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
