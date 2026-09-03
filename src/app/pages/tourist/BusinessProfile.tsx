import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import {
  Hotel, Store, MapPin, Phone, Mail, Star,
  ArrowLeft, Package, Search, CreditCard,
  MessageCircle, Heart,
  CheckCircle, ShoppingBag, ExternalLink,
  Pencil, Upload, X, Image as ImageIcon, Loader2,
  Ticket, Tag, Copy, Check, Plus, MessageSquare,
  Bookmark, Share2, ThumbsUp, Send, Bed, Waves,
  Compass, Palmtree, Megaphone, Calendar, FileText, Clock, Video
} from 'lucide-react';
import { getPublicJSON, getAuthToken, API_BASE, recordView } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { showUnsaveConfirmDialog } from '../../lib/sweetAlert';
import { LocationPicker } from '../../components/LocationPicker';

import { MANSALAY_BARANGAYS } from '../../lib/constants';


interface BusinessOwner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  facebook_link?: string;
  facebook?: string;
  instagram_link?: string;
  instagram?: string;
  address?: string;
  barangay?: string;
  latitude?: number | string;
  longitude?: number | string;
  description?: string;
  payment_details?: any[];
  created_at?: string;
  last_active_at?: string;
  store_name?: string;
  store_description?: string;
  store_logo?: string;
  store_banner?: string;
  store_is_setup?: boolean;
  resort_name?: string;
  resort_description?: string;
  resort_logo?: string;
  resort_banner?: string;
  resort_images?: string[];
  resort_amenities?: string[];
  resort_facilities?: string;
  resort_policies?: string;
  resort_is_setup?: boolean;
  video_tour?: string;
  video?: string;
}

interface PromoCodeItem {
  id: number;
  code: string;
  description?: string;
  type: 'percent' | 'fixed';
  value: number;
  min_amount?: number;
  expires_at?: string;
}

interface BusinessProfileData {
  owner: BusinessOwner;
  accommodations?: any[];
  products?: any[];
  promo_codes?: PromoCodeItem[];
  is_registered: boolean;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return null;
}

const mockStoresList: Record<string, {
  name: string;
  description: string;
  barangay: string;
  phone: string;
  email: string;
  banner: string;
  logo: string;
  products: any[];
  payment_details: any[];
}> = {
  wati: {
    name: 'AWATI Enterprise (Association of Women Artisans)',
    description: 'Official association of indigenous Mangyan women artisans in Mansalay. We handcraft authentic Hanunuo woven baskets, beaded jewelry, banig mats, and cultural souvenirs using sustainable forest materials.',
    barangay: 'Brgy. Poblacion',
    phone: '0917-889-2341',
    email: 'awati.women@mansalay.gov.ph',
    banner: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=300&q=80',
    payment_details: [
      { type: 'GCash', name: 'AWATI Enterprise', account_number: '0917-889-2341', account_name: 'Maria Santos' },
      { type: 'Cash on Delivery', name: 'COD Available', account_number: 'Pay upon delivery', account_name: 'Mansalay Express Delivery' },
      { type: 'Maya', name: 'Maya Wallet', account_number: '0917-889-2341', account_name: 'AWATI Artisans' }
    ],
    products: [
      {
        id: 'prod-1',
        name: 'AWATI Traditional Hanunuo Woven Basket',
        category: 'Handicraft',
        badge: 'AWATI Featured',
        price: 250,
        stock: 15,
        rating: 4.9,
        likes: 312,
        image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?auto=format&fit=crop&w=800&q=80',
        description: 'Handwoven by the indigenous Mangyan women artisans of AWATI using traditional rattan and Nito weaving techniques. Durable, sustainable, and culturally authentic.'
      },
      {
        id: 'prod-2-jewel',
        name: 'Mangyan Beaded Jewelry Set',
        category: 'Handicraft',
        badge: 'Top Rated',
        price: 180,
        stock: 24,
        rating: 4.8,
        likes: 267,
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
        description: 'Intricate beaded necklaces, bracelets, and earrings crafted by Mangyan artisans using traditional color patterns and symbols.'
      },
      {
        id: 'prod-3-banig',
        name: 'Pandan Woven Banig Mat',
        category: 'Handicraft',
        badge: 'Fan Favorite',
        price: 350,
        stock: 10,
        rating: 4.7,
        likes: 189,
        image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
        description: 'Traditional Filipino banig woven from dried pandan leaves. Lightweight, durable, and naturally cooling.'
      }
    ]
  },
  pasalubong: {
    name: 'Mansalay Community Pasalubong Center',
    description: 'Official LGU-supported community pasalubong hub showcasing fresh native delicacies, wild mountain honey, coconut tuba vinegar, and local snacks directly sourced from micro-enterprises across Mansalay.',
    barangay: 'Brgy. Poblacion (Municipal Compound)',
    phone: '0920-551-9082',
    email: 'pasalubong@mansalay.gov.ph',
    banner: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=300&q=80',
    payment_details: [
      { type: 'GCash', name: 'Pasalubong Center GCash', account_number: '0920-551-9082', account_name: 'Mansalay LGU Enterprise' },
      { type: 'Cash on Delivery', name: 'COD Available', account_number: 'Pay upon delivery', account_name: 'Mansalay Express' }
    ],
    products: [
      {
        id: 'prod-2-pasalubong',
        name: 'Mansalay Pasalubong Sampler Box',
        category: 'Pasalubong',
        badge: 'Pasalubong Center',
        price: 380,
        stock: 25,
        rating: 4.9,
        likes: 450,
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
        description: 'Curated gift set featuring native delicacies, wild forest honey, and banana chips directly sourced from local micro-enterprises across Mansalay.'
      },
      {
        id: 'prod-5',
        name: 'Kakanin Sampler Pack',
        category: 'Local Delicacies',
        badge: 'Fan Favorite',
        price: 150,
        stock: 30,
        rating: 4.9,
        likes: 412,
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
        description: 'Assorted native rice cakes including suman, biko, and sapin-sapin made fresh daily using local coconut milk.'
      },
      {
        id: 'prod-6',
        name: 'Coconut Vinegar (Sukang Tuba)',
        category: 'Pasalubong',
        badge: 'Local Favorite',
        price: 90,
        stock: 40,
        rating: 4.8,
        likes: 298,
        image: 'https://images.unsplash.com/photo-1563865436874-9aef32095fad?auto=format&fit=crop&w=800&q=80',
        description: 'Naturally fermented coconut sap vinegar infused with local chili peppers and garlic. Perfect dip for fried dishes.'
      }
    ]
  },
  honey: {
    name: 'Mangyan Honey Gatherers',
    description: 'Pure, raw wild honey harvested sustainably by indigenous Mangyan gatherers from the pristine mountain forests of Mansalay Highlands.',
    barangay: 'Brgy. Budburan',
    phone: '0917-445-6677',
    email: 'wildhoney@mansalay.com',
    banner: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=300&q=80',
    payment_details: [
      { type: 'GCash', name: 'Mangyan Honey GCash', account_number: '0917-445-6677', account_name: 'Juan Dela Cruz' },
      { type: 'Cash on Delivery', name: 'COD Available', account_number: 'Pay on delivery', account_name: 'Local Courier' }
    ],
    products: [
      {
        id: 'prod-7',
        name: 'Wild Forest Honey (500ml)',
        category: 'Pasalubong',
        badge: 'Top Rated',
        price: 280,
        stock: 20,
        rating: 4.9,
        likes: 512,
        image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=800&q=80',
        description: 'Pure, raw wild honey harvested sustainably from the mountain forests of Mansalay Highlands.'
      }
    ]
  },
  eco: {
    name: 'Mansalay Eco Crafters',
    description: 'Eco-friendly bamboo, coconut shell, and wooden tableware crafted by local artisans in Mansalay. Sustainable, organic, and reusable.',
    barangay: 'Brgy. Poblacion',
    phone: '0922-334-5566',
    email: 'ecocrafters@mansalay.com',
    banner: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=300&q=80',
    payment_details: [
      { type: 'GCash', name: 'Eco Crafters GCash', account_number: '0922-334-5566', account_name: 'Mansalay Eco Crafters' }
    ],
    products: [
      {
        id: 'prod-4',
        name: 'Bamboo Tableware Set',
        category: 'Handicraft',
        badge: 'Local Favorite',
        price: 320,
        stock: 18,
        rating: 4.6,
        likes: 143,
        image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
        description: 'Eco-friendly bamboo plates, cups, and utensil sets crafted by local artisans. Sustainable, reusable, and organic.'
      }
    ]
  },
  fish: {
    name: 'Mansalay Coastal Fishermen',
    description: 'Coastal fishermen co-op offering fresh smoked fish (tinapa), dried seafood, and savory coastal products from the waters of Mansalay Bay.',
    barangay: 'Brgy. Manaul',
    phone: '0929-334-1188',
    email: 'coastal.fishers@mansalay.com',
    banner: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80',
    payment_details: [
      { type: 'GCash', name: 'Fishermen Co-op GCash', account_number: '0929-334-1188', account_name: 'Mansalay Fishermen Association' },
      { type: 'Cash on Delivery', name: 'COD Available', account_number: 'Pay on delivery', account_name: 'Mansalay Coastal Express' }
    ],
    products: [
      {
        id: 'prod-8',
        name: 'Dried Smoked Fish (Tinapa)',
        category: 'Seafood Products',
        badge: 'Best Seller',
        price: 160,
        stock: 35,
        rating: 4.7,
        likes: 220,
        image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
        description: 'Freshly caught coastal fish smoked naturally using rice husks. Rich aroma and authentic savory flavor.'
      }
    ]
  }
};

function createFallbackBusinessProfile(rawId: string): BusinessProfileData | null {
  const decoded = decodeURIComponent(rawId).toLowerCase().trim();

  let storeKey: string | null = null;
  if (decoded === 'pasalubong' || decoded === 'delicacies' || decoded === 'community pasalubong') storeKey = 'pasalubong';
  else if (decoded === 'honey' || decoded === 'wild honey') storeKey = 'honey';
  else if (decoded === 'eco' || decoded === 'bamboo' || decoded === 'eco crafters') storeKey = 'eco';
  else if (decoded === 'fish' || decoded === 'tinapa' || decoded === 'coastal fishermen') storeKey = 'fish';
  else if (decoded === 'wati' || decoded === 'awati' || decoded === 'mangyan artisans') storeKey = 'wati';

  if (!storeKey || !mockStoresList[storeKey]) {
    return null;
  }

  const mock = mockStoresList[storeKey];
  return {
    is_registered: true,
    owner: {
      id: 999,
      name: mock.name,
      email: mock.email,
      phone: mock.phone,
      address: `${mock.barangay}, Mansalay, Oriental Mindoro`,
      barangay: mock.barangay,
      description: mock.description,
      store_name: mock.name,
      store_description: mock.description,
      store_logo: mock.logo,
      store_banner: mock.banner,
      store_is_setup: true,
      created_at: '2023-01-15T00:00:00.000Z',
      payment_details: mock.payment_details,
    },
    products: mock.products,
    accommodations: [],
  };
}

export function BusinessProfile() {
  const { type, userId } = useParams<{ type: 'resort' | 'enterprise'; userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, userType, currentUser } = useApp();
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Edit Shop Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    phone: '',
    barangay: 'Barangay I (Poblacion)',
    address: '',
    facebook_link: '',
    instagram_link: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedPromoCode, setCopiedPromoCode] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<'listings' | 'posts'>('listings');
  const [selectedPostCategory, setSelectedPostCategory] = useState<string>('all');
  const [viewingPost, setViewingPost] = useState<any | null>(null);
  const [coverMode, setCoverMode] = useState<'video' | 'photo'>('video');
  const [isCoverMuted, setIsCoverMuted] = useState(true);

  const handleCopyPromo = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPromoCode(code);
    toast.success(`Promo code "${code}" copied to clipboard!`);
    setTimeout(() => {
      setCopiedPromoCode(prev => (prev === code ? null : prev));
    }, 2500);
  };

  const handleLikePost = async (postId: number | string) => {
    try {
      await fetch(`${API_BASE}/api/public/enterprise-posts/${postId}/like`, { method: 'POST' });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
      toast.success('Liked post!');
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleSavePost = async (postId: number | string) => {
    try {
      await fetch(`${API_BASE}/api/public/enterprise-posts/${postId}/save`, { method: 'POST' });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, saves: (p.saves || 0) + 1 } : p));
      toast.success('Saved post!');
    } catch {
      toast.error('Failed to save post');
    }
  };

  useEffect(() => {
    if (!type) return;

    const targetUserId = userId || (currentUser?.id ? String(currentUser.id) : null);
    if (!targetUserId) {
      setLoading(false);
      setError(type === 'resort' ? 'Resort profile is not available.' : 'Shop is not available.');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        recordView(targetUserId, type === 'resort' ? 'resort' : 'enterprise');
        const endpoint = type === 'enterprise'
          ? `/business/enterprise/${targetUserId}`
          : `/business/resort/${targetUserId}`;
        const result = await getPublicJSON(endpoint);
        if (result && result.owner) {
          setData(result);
          setError(null);
        } else {
          const fallback = createFallbackBusinessProfile(targetUserId);
          if (fallback) {
            setData(fallback);
            setError(null);
          } else {
            setError(type === 'resort' ? 'Resort profile is not available or not yet registered.' : 'Shop is not available or not yet registered.');
          }
        }

        // Fetch posts created by this business owner
        try {
          const ownerId = result?.owner?.id || targetUserId;
          const postsRes = await getPublicJSON(`/enterprise-posts?user_id=${ownerId}`);
          if (Array.isArray(postsRes)) {
            setPosts(postsRes);
          }
        } catch {
          // ignore
        }
      } catch {
        const fallback = createFallbackBusinessProfile(targetUserId);
        if (fallback) {
          setData(fallback);
          setError(null);
        } else {
          setError(type === 'resort' ? 'Resort profile is not available or not yet registered.' : 'Shop is not available or not yet registered.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [type, userId, currentUser?.id]);

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
    const isResort = type === 'resort';
    return (
      <div className="min-h-screen bg-gray-50/80 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-5 text-pink-500 shadow-xs">
            {isResort ? <Hotel className="h-10 w-10 text-pink-500" /> : <Store className="h-10 w-10 text-pink-500" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-2">
            {isResort ? 'Resort Profile Not Available' : 'Shop Not Available'}
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {error || (isResort ? 'This resort does not have an active registered profile yet.' : 'This shop does not have an active registered profile yet.')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(isResort ? '/accommodations' : '/products')}
              className="w-full sm:w-auto px-6 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white rounded-full text-xs sm:text-sm font-bold shadow-md shadow-pink-500/25 transition-all"
            >
              {isResort ? 'Explore Stays & Resorts' : 'Explore All Products'}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs sm:text-sm font-semibold transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { owner } = data;
  const isResort = type === 'resort';
  const products = data.products || [];
  const accommodations = data.accommodations || [];
  const items = isResort ? accommodations : products;

  // Display name & info: Accurate resort_name for resort, store_name for enterprise
  const shopName = isResort
    ? (owner.resort_name || owner.name)
    : ((owner.store_name && owner.store_name !== 'default') ? owner.store_name : owner.name);

  const shopDescription = isResort
    ? (owner.resort_description || owner.description)
    : (owner.store_description || owner.description);

  const shopBanner = isResort
    ? (owner.resort_banner || (owner.resort_images && owner.resort_images[0]) || owner.store_banner)
    : owner.store_banner;

  const shopLogo = isResort
    ? (owner.resort_logo || (owner.resort_images && owner.resort_images[0]) || owner.store_logo)
    : owner.store_logo;

  // Check if this shop / resort has an uploaded video tour (from posts or owner profile)
  const videoTourPost = Array.isArray(posts) ? posts.find((p: any) => p.video) : null;
  const videoTourUrl = videoTourPost?.video || owner.video_tour || owner.video;
  const ytCoverEmbed = videoTourUrl ? getYouTubeEmbedUrl(videoTourUrl) : null;

  // Active Now vs time ago logic
  const getActiveStatus = () => {
    const activeAt = owner.last_active_at || owner.created_at;
    if (!activeAt) return { label: 'Active', isNow: false };
    const diffMs = Date.now() - new Date(activeAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return { label: 'Active Now', isNow: true };
    if (diffMins < 60) return { label: `Active ${diffMins}m ago`, isNow: false };
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return { label: `Active ${diffHrs}h ago`, isNow: false };
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return { label: `Active ${diffDays}d ago`, isNow: false };
    return { label: `Active ${Math.floor(diffDays / 7)}w ago`, isNow: false };
  };
  const activeStatus = getActiveStatus();

  const getImageUrl = (img: string) => {
    if (!img) return isResort ? '/assets/default-accommodation.jpg' : '/assets/default-product.jpg';
    return img.startsWith('http') ? img : `${API_BASE}${img}`;
  };

  const totalProducts = items.length;
  const joinedYear = owner.created_at ? new Date(owner.created_at).getFullYear() : new Date().getFullYear();

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

  const isManageMode = searchParams.get('manage') === 'true';
  const isOwner = Boolean(
    isManageMode &&
    currentUser && (
      (userType === 'enterprise' && type === 'enterprise' && (!userId || String(currentUser.id) === String(userId) || String(currentUser.id) === String(owner?.id) || !userId.match(/^\d+$/))) ||
      (userType === 'resort' && type === 'resort' && (!userId || String(currentUser.id) === String(userId) || String(currentUser.id) === String(owner?.id) || !userId.match(/^\d+$/))) ||
      (currentUser.role === type && (String(currentUser.id) === String(userId) || String(currentUser.id) === String(owner?.id)))
    )
  );

  const handleOpenEditModal = () => {
    setEditForm({
      name: isResort ? (owner.resort_name || owner.name || '') : ((owner.store_name && owner.store_name !== 'default') ? owner.store_name : (owner.name || '')),
      description: isResort ? (owner.resort_description || owner.description || '') : (owner.store_description || owner.description || ''),
      phone: owner.phone || '',
      barangay: owner.barangay || 'Barangay I (Poblacion)',
      address: owner.address || '',
      facebook_link: owner.facebook_link || owner.facebook || '',
      instagram_link: owner.instagram_link || owner.instagram || '',
    });
    setLogoFile(null);
    setLogoPreview(null);
    setBannerFile(null);
    setBannerPreview(null);
    const lat = owner.latitude ? Number(owner.latitude) : 12.51507;
    const lng = owner.longitude ? Number(owner.longitude) : 121.42810;
    setStoreLocation({ lat, lng });
    setIsEditModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error(isResort ? 'Resort name is required' : 'Shop / Business name is required');
      return;
    }

    setIsSaving(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();

      if (isResort) {
        formData.append('resort_name', editForm.name.trim());
        formData.append('resort_description', editForm.description.trim());
        formData.append('phone', editForm.phone.trim());
        formData.append('barangay', editForm.barangay);
        formData.append('address', editForm.address.trim());
        formData.append('facebook_link', editForm.facebook_link.trim());
        formData.append('instagram_link', editForm.instagram_link.trim());
        if (storeLocation?.lat && storeLocation?.lng) {
          formData.append('latitude', String(storeLocation.lat));
          formData.append('longitude', String(storeLocation.lng));
        }
        if (logoFile) formData.append('logo', logoFile);
        if (bannerFile) formData.append('banner', bannerFile);
        formData.append('_method', 'PUT');

        const res = await fetch(`${API_BASE}/api/resort-profile`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || 'Failed to update resort profile');
        }

        const updated = await res.json();
        toast.success('Resort profile updated successfully!');

        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            owner: {
              ...prev.owner,
              resort_name: editForm.name.trim(),
              resort_description: editForm.description.trim(),
              phone: editForm.phone.trim(),
              barangay: editForm.barangay,
              address: editForm.address.trim(),
              facebook_link: editForm.facebook_link.trim(),
              instagram_link: editForm.instagram_link.trim(),
              latitude: storeLocation?.lat ?? prev.owner.latitude,
              longitude: storeLocation?.lng ?? prev.owner.longitude,
              resort_logo: updated?.logo || updated?.resort_logo || prev.owner.resort_logo,
              resort_banner: updated?.banner || updated?.resort_banner || prev.owner.resort_banner,
            }
          };
        });
      } else {
        formData.append('store_name', editForm.name.trim());
        formData.append('store_description', editForm.description.trim());
        formData.append('phone', editForm.phone.trim());
        formData.append('barangay', editForm.barangay);
        formData.append('address', editForm.address.trim());
        formData.append('facebook_link', editForm.facebook_link.trim());
        formData.append('instagram_link', editForm.instagram_link.trim());
        if (storeLocation?.lat && storeLocation?.lng) {
          formData.append('latitude', String(storeLocation.lat));
          formData.append('longitude', String(storeLocation.lng));
        }
        if (logoFile) formData.append('logo', logoFile);
        if (bannerFile) formData.append('banner', bannerFile);
        formData.append('_method', 'PUT');

        const res = await fetch(`${API_BASE}/api/enterprise-profile`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || 'Failed to update store profile');
        }

        const updated = await res.json();
        toast.success('Shop profile updated successfully!');

        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            owner: {
              ...prev.owner,
              store_name: editForm.name.trim(),
              store_description: editForm.description.trim(),
              phone: editForm.phone.trim(),
              barangay: editForm.barangay,
              address: editForm.address.trim(),
              facebook_link: editForm.facebook_link.trim(),
              instagram_link: editForm.instagram_link.trim(),
              latitude: storeLocation?.lat ?? prev.owner.latitude,
              longitude: storeLocation?.lng ?? prev.owner.longitude,
              store_logo: updated?.store_logo || updated?.logo || prev.owner.store_logo,
              store_banner: updated?.store_banner || updated?.banner || prev.owner.store_banner,
            }
          };
        });
      }

      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? (isResort ? 'Unfollowed resort' : 'Unfollowed shop') : (isResort ? 'Following resort!' : 'Following shop!'));
  };

  const handleChat = () => {
    if (!getAuthToken()) {
      toast.error('Please login to chat with the host');
      navigate('/select-role');
      return;
    }
    setChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Back Button */}
        <button
          onClick={() => isResort ? navigate('/accommodations') : navigate('/products')}
          className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors mb-3 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {isResort ? 'Back to Stays & Resorts' : 'Back to Products'}
        </button>

        {/* 🌟 SHOP / RESORT HEADER BANNER - Enhanced with Virtual Video Tour */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Banner Area */}
          <div className="relative h-44 sm:h-64 md:h-72 lg:h-80 overflow-hidden bg-black">
            {videoTourUrl && coverMode === 'video' ? (
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                {ytCoverEmbed ? (
                  <iframe
                    src={`${ytCoverEmbed}?autoplay=1&mute=1&loop=1&playsinline=1`}
                    title="Virtual Video Tour"
                    className="w-full h-full object-cover pointer-events-auto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={getImageUrl(videoTourUrl)}
                    autoPlay
                    muted={isCoverMuted}
                    loop
                    playsInline
                    controls
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Virtual Tour Overlay Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                  <span className="px-3 py-1 bg-pink-600/90 text-white text-[11px] font-extrabold rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-pink-400/30">
                    <Video className="w-3.5 h-3.5" />
                    Virtual Video Tour Active
                  </span>
                </div>
              </div>
            ) : shopBanner ? (
              <img
                src={getImageUrl(shopBanner)}
                alt={`${shopName} banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 via-rose-500 to-teal-500 opacity-90" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

            {/* Switch between Video Tour and Photo Cover if both exist */}
            {videoTourUrl && shopBanner && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/20 z-10">
                <button
                  type="button"
                  onClick={() => setCoverMode('video')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    coverMode === 'video'
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Video className="w-3 h-3" />
                  <span>Video Tour</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode('photo')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    coverMode === 'photo'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Photo</span>
                </button>
              </div>
            )}

            {isOwner && (
              <button
                onClick={handleOpenEditModal}
                className="absolute top-3 right-3 px-3.5 py-1.5 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 shadow-md transition-all z-10 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Cover</span>
              </button>
            )}
          </div>

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo / Avatar */}
                <div className="relative -mt-12 md:-mt-14">
                  {shopLogo ? (
                    <img
                      src={getImageUrl(shopLogo)}
                      alt={shopName}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-xl ring-4 ring-white border-2 border-pink-100 bg-white"
                    />
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white">
                      {isResort
                        ? <Hotel className="h-10 w-10 text-white" />
                        : <Store className="h-10 w-10 text-white" />
                      }
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  {isOwner && (
                    <button
                      onClick={handleOpenEditModal}
                      className="absolute -top-1 -right-1 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-all z-10"
                      title="Edit Logo"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Shop / Resort Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                      {shopName}
                    </h1>
                    <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                      ✓ Verified
                    </span>
                    {isResort && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                        🏨 Resort & Stays
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                    {/* Active Now indicator */}
                    {activeStatus.isNow ? (
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Now
                      </span>
                    ) : (
                      <span className="text-gray-400">{activeStatus.label}</span>
                    )}
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-pink-500" />
                      {[owner.barangay, 'Mansalay, Oriental Mindoro'].filter(Boolean).join(', ')}
                    </span>
                  </p>
                  {shopDescription && (
                    <div className="text-xs md:text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed text-justify space-y-2" style={{ textAlign: 'justify' }}>
                      {shopDescription
                        .replace(/<br\s*[\/]?>/gi, '\n')
                        .split(/\r?\n+/)
                        .map((p: string) => p.trim())
                        .filter((p: string) => p.length > 0)
                        .map((para: string, idx: number) => (
                          <p key={idx} className="text-justify leading-relaxed" style={{ textAlign: 'justify' }}>
                            {para}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Shop Profile Button with Pencil */}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenEditModal}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white rounded-full text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-1.5 transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit {isResort ? 'Resort' : 'Shop'} Profile</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Connect Bar */}
          <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-pink-500" />
              <span>Contact & Connect</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Call Phone Button */}
              <a
                href={`tel:${(owner.phone || '0917-123-4567').replace(/[^0-9+]/g, '')}`}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                title="Call Phone Number"
              >
                <Phone className="h-3.5 w-3.5 fill-white" />
                <span>{owner.phone || '0917-123-4567'}</span>
              </a>

              {/* Facebook Button */}
              <a
                href={owner.facebook_link || owner.facebook || 'https://facebook.com/DiscoverMansalayOfficial'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                title="Visit Facebook Page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Facebook</span>
              </a>

              {/* Instagram Button */}
              <a
                href={owner.instagram_link || owner.instagram || 'https://instagram.com/discover_mansalay'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                title="Visit Instagram Profile"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          {/* Business Stats */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <div className="px-3 py-3 text-center">
              <div className="text-base md:text-lg font-bold text-pink-500">{totalProducts}</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">{isResort ? 'Rooms' : 'Products'}</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-base md:text-lg font-bold text-pink-500">100%</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Response</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-base md:text-lg font-bold text-pink-500">{joinedYear}</div>
              <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">Joined</div>
            </div>
          </div>
        </div>

        {/* 🌟 PROFILE NAVIGATION TABS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveProfileTab('listings')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeProfileTab === 'listings'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isResort ? <Hotel className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
              <span>{isResort ? 'Rooms & Stays' : 'All Products'}</span>
              {items.length > 0 && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
                  activeProfileTab === 'listings' ? 'bg-white text-pink-600' : 'bg-pink-100 text-pink-700'
                }`}>
                  {items.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveProfileTab('posts')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeProfileTab === 'posts'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Posts & Updates</span>
              {posts.length > 0 && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
                  activeProfileTab === 'posts' ? 'bg-white text-pink-600' : 'bg-pink-100 text-pink-700'
                }`}>
                  {posts.length}
                </span>
              )}
            </button>
          </div>

          {isOwner && (
            <Link
              to={isResort ? '/resort/dashboard' : '/enterprise/dashboard'}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 whitespace-nowrap ml-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Post</span>
            </Link>
          )}
        </div>

        {/* ── TAB 1: LISTINGS (ROOMS / PRODUCTS) ── */}
        {activeProfileTab === 'listings' && (
          <>
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

            {/* 🏷️ ACTIVE VOUCHERS / PROMO CODES */}
            {data?.promo_codes && data.promo_codes.length > 0 && (
              <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-2xl p-4 sm:p-5 mb-4 text-white shadow-md shadow-pink-500/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xs">
                      <Ticket className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-wide uppercase">
                        Available Shop Vouchers & Promo Discounts
                      </h3>
                      <p className="text-[11px] text-white/90 font-medium">Use these exclusive promo codes at checkout for instant discounts!</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-bold">
                    {data.promo_codes.length} Active {data.promo_codes.length === 1 ? 'Voucher' : 'Vouchers'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.promo_codes.map((promo) => {
                    const discountText = promo.type === 'percent' ? `${promo.value}% OFF` : `₱${Number(promo.value).toLocaleString()} OFF`;
                    const isCopied = copiedPromoCode === promo.code;

                    return (
                      <div
                        key={promo.id}
                        className="bg-white rounded-xl p-3.5 text-gray-800 shadow-sm border border-white/50 flex items-center justify-between gap-3 relative overflow-hidden group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 font-extrabold text-xs rounded-md">
                              {discountText}
                            </span>
                            {promo.min_amount && promo.min_amount > 0 ? (
                              <span className="text-[10px] text-gray-500 font-medium truncate">
                                Min. ₱{Number(promo.min_amount).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                          <div className="font-mono font-bold text-sm tracking-wider text-gray-900">
                            {promo.code}
                          </div>
                          {promo.description && (
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {promo.description}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyPromo(promo.code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 active:scale-95 ${
                            isCopied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90 shadow-xs'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🔍 SEARCH BAR */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={isResort ? "Search rooms in this resort..." : "Search products in this shop..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm bg-gray-50 outline-none"
                />
              </div>
            </div>

            {/* 📦 PRODUCTS / ROOMS GRID */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800 tracking-widest">
                  {selectedCategory === 'all' 
                    ? (isResort ? 'ALL ROOMS & COTTAGES' : 'ALL PRODUCTS')
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
                      <p className="text-gray-500">No rooms or cottages added yet by this resort.</p>
                      {isOwner && (
                        <Link
                          to="/resort/profile"
                          className="mt-3 inline-block px-4 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold"
                        >
                          + Add Rooms in Room Management
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                      {filteredAccommodations.map((accommodation: any) => (
                        <AccommodationCard
                          key={accommodation.id}
                          accommodation={accommodation}
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
                      {isOwner && (
                        <Link
                          to="/enterprise/profile"
                          className="mt-3 inline-block px-4 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold"
                        >
                          + Add Products in Product Management
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                      {filteredProducts.map((product: any) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          userType={userType}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {/* ── TAB 2: POSTS & UPDATES FEED ── */}
        {activeProfileTab === 'posts' && (
          <div className="space-y-4">
            {/* Category Filter Chips */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(type === 'resort'
                  ? [
                      { key: 'all', label: 'All Posts' },
                      { key: 'rooms', label: '🛏️ Rooms' },
                      { key: 'amenities', label: '🌊 Amenities' },
                      { key: 'activities', label: '🧭 Activities' },
                      { key: 'beach_views', label: '🌴 Beach Views' },
                    ]
                  : [
                      { key: 'all', label: 'All Posts' },
                      { key: 'promotion', label: '🏷️ Promotion' },
                      { key: 'products', label: '📦 Products' },
                      { key: 'announcement', label: '📢 Announcement' },
                    ]
                ).map((cat) => {
                  const count = cat.key === 'all'
                    ? posts.length
                    : posts.filter(p => p.type === cat.key).length;
                  const isSelected = selectedPostCategory === cat.key;

                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedPostCategory(cat.key)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-pink-500 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Posts Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
                  {isOwner 
                    ? 'You have not created any posts or updates yet. Create announcements, room highlights, or promotions from your dashboard.' 
                    : 'This host has not published any posts or promotional updates yet.'}
                </p>
                {isOwner && (
                  <Link
                    to={isResort ? '/resort/dashboard' : '/enterprise/dashboard'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Your First Post</span>
                  </Link>
                )}
              </div>
            ) : (
              (() => {
                const filteredPosts = posts.filter(post => {
                  if (selectedPostCategory === 'all') return true;
                  return post.type === selectedPostCategory;
                });

                if (filteredPosts.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                      <p className="text-xs text-gray-500 font-medium">No posts in this category.</p>
                      <button
                        onClick={() => setSelectedPostCategory('all')}
                        className="mt-2 text-xs font-bold text-pink-500 hover:underline"
                      >
                        View All Posts
                      </button>
                    </div>
                  );
                }

                const postTypeLabelMap: Record<string, string> = {
                  promotion: '🏷️ Promotion',
                  rooms: '🛏️ Rooms',
                  amenities: '🌊 Amenities',
                  activities: '🧭 Activities',
                  beach_views: '🌴 Beach Views',
                  announcement: '📢 Announcement',
                };

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPosts.map((post) => {
                      const postTypeLabel = postTypeLabelMap[post.type] || '📢 Announcement';

                      const formattedDate = post.created_at
                        ? new Date(post.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Recent';

                      return (
                        <div
                          key={post.id}
                          onClick={() => setViewingPost(post)}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-pink-200 transition-all flex flex-col justify-between cursor-pointer group"
                        >
                          {/* Post Header */}
                          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={getImageUrl(shopLogo || '')}
                                alt={shopName}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-gray-900 leading-tight group-hover:text-pink-600 transition-colors">{shopName}</h4>
                                  <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium mt-0.5">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span>{formattedDate}</span>
                                </div>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-extrabold rounded-full">
                              {postTypeLabel}
                            </span>
                          </div>

                          {/* Post Content */}
                          <div className="p-4 space-y-3 flex-1">
                            <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-line leading-relaxed line-clamp-4">
                              {post.content}
                            </p>

                            {/* Optional Product / Price Badge */}
                            {post.price && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                                <span>Price: {post.price}</span>
                              </div>
                            )}

                            {/* Post Video or Image */}
                            {post.video ? (
                              <div className="rounded-xl overflow-hidden bg-black border border-gray-100 aspect-video max-h-72 relative">
                                {getYouTubeEmbedUrl(post.video) ? (
                                  <iframe
                                    src={getYouTubeEmbedUrl(post.video)!}
                                    title="Virtual Tour Video"
                                    className="w-full h-full object-cover"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video
                                    src={getImageUrl(post.video)}
                                    controls
                                    playsInline
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ) : post.image ? (
                              <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-100 max-h-72 relative">
                                <img
                                  src={getImageUrl(post.image)}
                                  alt="Post"
                                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                                  onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                                />
                                {Array.isArray(post.images) && post.images.length > 1 && (
                                  <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                                    📸 +{post.images.length - 1} photos
                                  </span>
                                )}
                              </div>
                            ) : null}

                            {/* Tags */}
                            {Array.isArray(post.tags) && post.tags.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {post.tags.map((tag: string, tidx: number) => (
                                  <span
                                    key={tidx}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-md"
                                  >
                                    #{tag.replace(/^#/, '')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Post Footer Actions */}
                          <div
                            className="px-4 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleLikePost(post.id)}
                                className="flex items-center gap-1 hover:text-pink-600 active:scale-95 transition-all font-semibold cursor-pointer"
                              >
                                <Heart className="h-4 w-4 text-pink-500 fill-pink-50" />
                                <span>{post.likes || 0} Likes</span>
                              </button>

                              <button
                                onClick={() => handleSavePost(post.id)}
                                className="flex items-center gap-1 hover:text-purple-600 active:scale-95 transition-all font-semibold cursor-pointer"
                              >
                                <Bookmark className="h-4 w-4 text-purple-500 fill-purple-50" />
                                <span>{post.saves || 0} Saves</span>
                              </button>
                            </div>

                            <button
                              onClick={() => setViewingPost(post)}
                              className="text-[11px] text-pink-500 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <span>View Full Post</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* 📍 SHOP LOCATION & CONTACT INFO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Shop Location & Interactive Map Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    {isResort ? 'Resort Location & Landmark' : 'Shop Location & Landmark'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {[owner.address, owner.barangay, 'Mansalay, Oriental Mindoro'].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={handleOpenEditModal}
                  className="px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Pin
                </button>
              )}
            </div>

            {/* Map Display */}
            <div className="rounded-xl overflow-hidden border border-gray-200 mt-2">
              <LocationPicker
                initialLat={owner.latitude ? Number(owner.latitude) : 12.51507}
                initialLng={owner.longitude ? Number(owner.longitude) : 121.42810}
                onLocationSelect={() => {}}
                height="190px"
              />
            </div>
            
            {owner.address && (
              <div className="mt-3 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                <span className="font-bold text-gray-700">Landmark / Directions:</span>
                <span className="text-gray-600">{owner.address}</span>
              </div>
            )}
          </div>

          {/* 📞 CONTACT INFO */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
                CONTACT INFORMATION
              </h3>
              <div className="space-y-3">
                {owner.email && (
                  <a href={`mailto:${owner.email}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-all">
                    <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-pink-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Email Address</div>
                      <div className="text-xs text-gray-800 truncate font-semibold">{owner.email}</div>
                    </div>
                  </a>
                )}
                {owner.phone && (
                  <a href={`tel:${owner.phone}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-all">
                    <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4 text-pink-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Contact Phone</div>
                      <div className="text-xs text-gray-800 font-semibold">{owner.phone}</div>
                    </div>
                  </a>
                )}
                {owner.facebook_link && (
                  <a href={owner.facebook_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Facebook Page</div>
                      <div className="text-xs text-blue-600 font-semibold truncate">Visit Facebook</div>
                    </div>
                  </a>
                )}
                {owner.instagram_link && (
                  <a href={owner.instagram_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-all">
                    <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="h-4 w-4 text-pink-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Instagram</div>
                      <div className="text-xs text-pink-600 font-semibold truncate">Visit Instagram</div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: VIEW FULL POST DETAIL ── */}
      {viewingPost && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setViewingPost(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <img
                  src={getImageUrl(shopLogo || '')}
                  alt={shopName}
                  className="w-11 h-11 rounded-full object-cover border border-gray-200"
                  onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-extrabold text-gray-900 leading-tight">{shopName}</h4>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {viewingPost.created_at
                        ? new Date(viewingPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-pink-50 text-pink-600 text-xs font-bold rounded-full">
                  {{
                    promotion: '🏷️ Promotion',
                    rooms: '🛏️ Rooms',
                    amenities: '🌊 Amenities',
                    activities: '🧭 Activities',
                    beach_views: '🌴 Beach Views',
                    announcement: '📢 Announcement',
                  }[viewingPost.type as string] || '📢 Announcement'}
                </span>
                <button
                  onClick={() => setViewingPost(null)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {viewingPost.content}
              </p>

              {viewingPost.price && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-extrabold border border-emerald-200">
                  <span>Price / Rate: {viewingPost.price}</span>
                </div>
              )}

              {viewingPost.video ? (
                <div className="rounded-2xl overflow-hidden bg-black border border-gray-100 aspect-video max-h-[380px] relative">
                  {getYouTubeEmbedUrl(viewingPost.video) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(viewingPost.video)!}
                      title="Virtual Tour Video"
                      className="w-full h-full object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={getImageUrl(viewingPost.video)}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ) : (Array.isArray(viewingPost.images) && viewingPost.images.length > 1) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Photos ({viewingPost.images.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 max-h-[440px] overflow-y-auto">
                    {viewingPost.images.map((imgUrl: string, imgIdx: number) => (
                      <div key={imgIdx} className="rounded-xl overflow-hidden bg-gray-100 border border-gray-100 aspect-video">
                        <img
                          src={getImageUrl(imgUrl)}
                          alt={`Post Photo ${imgIdx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : viewingPost.image ? (
                <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                  <img
                    src={getImageUrl(viewingPost.image)}
                    alt="Post Full View"
                    className="w-full h-auto max-h-[380px] object-cover"
                    onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                  />
                </div>
              ) : null}

              {Array.isArray(viewingPost.tags) && viewingPost.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  {viewingPost.tags.map((t: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">
                      #{t.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLikePost(viewingPost.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
                  <span>{viewingPost.likes || 0} Likes</span>
                </button>

                <button
                  onClick={() => handleSavePost(viewingPost.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Bookmark className="h-4 w-4 fill-purple-500 text-purple-500" />
                  <span>{viewingPost.saves || 0} Saves</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setViewingPost(null);
                    handleChat();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Inquire / Message Host</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT SHOP / RESORT PROFILE ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-xs">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                    Edit {isResort ? 'Resort' : 'Shop'} Profile
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Update your public store details, cover banner, logo, and contact info</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors shadow-xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Cover Banner Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Cover Banner Image
                </label>
                <div className="relative h-32 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 hover:border-pink-300 transition-colors flex items-center justify-center">
                  {bannerPreview || shopBanner ? (
                    <img
                      src={bannerPreview || getImageUrl(shopBanner || '')}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500 font-medium">Upload Cover Banner</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/35 hover:bg-black/45 text-white flex items-center justify-center gap-2 text-xs font-bold cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                    <Upload className="h-4 w-4" />
                    <span>Change Cover Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Logo / Profile Picture Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {isResort ? 'Resort Logo / Picture' : 'Store Logo / Profile Picture'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-pink-200 flex-shrink-0">
                    {logoPreview || shopLogo ? (
                      <img
                        src={logoPreview || getImageUrl(shopLogo || '')}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-pink-50 flex items-center justify-center text-pink-500">
                        {isResort ? <Hotel className="h-8 w-8" /> : <Store className="h-8 w-8" />}
                      </div>
                    )}
                  </div>
                  <label className="px-4 py-2 border border-pink-200 text-pink-600 hover:bg-pink-50 rounded-full text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shop / Resort Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isResort ? 'Resort Name *' : 'Shop / Business Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-pink-500 focus:bg-white"
                    placeholder="e.g. AWATI Souvenir Shop"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-pink-500 focus:bg-white"
                    placeholder="0917-xxx-xxxx"
                  />
                </div>

                {/* Barangay */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Barangay Location
                  </label>
                  <select
                    value={editForm.barangay}
                    onChange={(e) => setEditForm(prev => ({ ...prev, barangay: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-pink-500 focus:bg-white"
                  >
                    {MANSALAY_BARANGAYS.map((brgy) => (
                      <option key={brgy} value={brgy}>{brgy}</option>
                    ))}
                  </select>
                </div>

                {/* Specific Address / Landmark */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Street Address / Landmark (e.g. Near Public Market / Town Plaza)
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-pink-500 focus:bg-white"
                    placeholder="e.g. Coastal Road, Sitio Centro, Near Mansalay Town Plaza"
                  />
                </div>

                {/* Map Location & Landmark Pinning */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-pink-500" />
                      Pin Exact Location on Mansalay Map
                    </label>
                    <span className="text-[11px] text-pink-500 font-medium">Click on map to place pin</span>
                  </div>
                  <div className="rounded-2xl overflow-hidden border-2 border-pink-200 shadow-xs mb-2">
                    <LocationPicker
                      initialLat={storeLocation?.lat || 12.51507}
                      initialLng={storeLocation?.lng || 121.42810}
                      onLocationSelect={(lat, lng) => setStoreLocation({ lat, lng })}
                      height="200px"
                    />
                  </div>
                  {storeLocation && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Pinned Coordinates: {storeLocation.lat.toFixed(5)}, {storeLocation.lng.toFixed(5)}
                    </div>
                  )}
                </div>

                {/* Facebook Link */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Facebook Page / Profile Link
                  </label>
                  <input
                    type="text"
                    value={editForm.facebook_link}
                    onChange={(e) => setEditForm(prev => ({ ...prev, facebook_link: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-pink-500 focus:bg-white"
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                {/* Instagram Link */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Instagram Profile Link
                  </label>
                  <input
                    type="text"
                    value={editForm.instagram_link}
                    onChange={(e) => setEditForm(prev => ({ ...prev, instagram_link: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-pink-500 focus:bg-white"
                    placeholder="https://instagram.com/yourprofile"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    About / Description
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-pink-500 focus:bg-white resize-none"
                    placeholder="Describe your shop, specialty products, or business history..."
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white rounded-full text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Clean Product Card
function ProductCard({ product }: any) {
  const { isInWishlist, addToWishlist, removeFromWishlist, getWishlistCount, userType } = useApp();
  const imageUrl = product.image
    ? (product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`)
    : '/assets/default-product.jpg';

  const isSaved = isInWishlist(product.id, 'product');
  const count = getWishlistCount(product.id, 'product', product.likes || 0);

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      const confirmed = await showUnsaveConfirmDialog(product.name);
      if (confirmed) {
        removeFromWishlist(product.id, 'product', product.name);
      }
    } else {
      addToWishlist({
        id: product.id,
        type: 'product',
        title: product.name,
        image: product.image,
        category: product.category,
        price: product.price,
        likes: product.likes,
      } as any);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all duration-300 group cursor-pointer flex flex-col justify-between">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = '/assets/default-product.jpg'; }}
        />
        {Array.isArray(product.images) && product.images.length > 1 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
            <span>📷 {product.images.length}</span>
          </div>
        )}
        {userType !== 'admin' && userType !== 'resort' && userType !== 'enterprise' && (
          <button
            onClick={toggleSave}
            className="absolute top-2 right-2 w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
            title="Save to wishlist"
          >
            <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
          </button>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
          <span>{count}</span>
        </div>
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
      </div>
    </div>
  );
}

// Clean Accommodation Card
function AccommodationCard({ accommodation }: any) {
  const { isInWishlist, addToWishlist, removeFromWishlist, getWishlistCount, userType } = useApp();
  const imageUrl = accommodation.image
    ? (accommodation.image.startsWith('http') ? accommodation.image : `${API_BASE}${accommodation.image}`)
    : '/assets/default-accommodation.jpg';

  const price = Number(accommodation.price_per_night || accommodation.price || 0);
  const isSaved = isInWishlist(accommodation.id, 'accommodation');
  const count = getWishlistCount(accommodation.id, 'accommodation', accommodation.likes || 0);

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      const confirmed = await showUnsaveConfirmDialog(accommodation.name);
      if (confirmed) {
        removeFromWishlist(accommodation.id, 'accommodation', accommodation.name);
      }
    } else {
      addToWishlist({
        id: accommodation.id,
        type: 'accommodation',
        title: accommodation.name,
        image: accommodation.image,
        price: price,
        likes: accommodation.likes,
      } as any);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all duration-300 group cursor-pointer flex flex-col justify-between">
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        <img
          src={imageUrl}
          alt={accommodation.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = '/assets/default-accommodation.jpg'; }}
        />
        {accommodation.type && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-md">
            {accommodation.type}
          </span>
        )}
        {userType !== 'admin' && userType !== 'resort' && userType !== 'enterprise' && (
          <button
            onClick={toggleSave}
            className="absolute top-2 right-2 w-7 h-7 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
            title="Save to wishlist"
          >
            <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
          </button>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
          <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
          <span>{count}</span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm text-gray-900 line-clamp-2 min-h-[36px] leading-snug mb-1 font-bold">
            {accommodation.name}
          </h3>
          {accommodation.capacity ? (
            <div className="text-[11px] text-gray-500 mb-2">
              👥 Max {accommodation.capacity} Guests
            </div>
          ) : null}
        </div>
        {price > 0 && (
          <div className="text-pink-600 font-extrabold text-sm">
            ₱{price.toLocaleString()}
            <span className="text-[10px] font-normal text-gray-400"> / night</span>
          </div>
        )}
      </div>
    </div>
  );
}
