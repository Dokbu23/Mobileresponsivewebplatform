import { useEffect, useMemo, useState, useRef } from 'react';
import { 
  Store, 
  Package, 
  TrendingUp, 
  Eye, 
  Heart, 
  FileText, 
  BarChart2, 
  Plus, 
  Image as ImageIcon, 
  MapPin, 
  Clock, 
  Send, 
  Trash2, 
  ChevronDown, 
  ExternalLink, 
  Share2, 
  Video, 
  X, 
  Bookmark, 
  Lock, 
  Sparkles, 
  CheckCircle2,
  Film,
  Play,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { Link } from 'react-router';
import { getJSON, getPublicJSON, postJSON, deleteJSON, getStorageUrl } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { SubscriptionPaymentModal } from '../../components/SubscriptionPaymentModal';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

const OPEN_TIME_OPTIONS = [
  '6:00 AM',
  '6:30 AM',
  '7:00 AM',
  '7:30 AM',
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  'Open 24 Hours',
];

const CLOSE_TIME_OPTIONS = [
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
];

// 🛡️ Video Upload Validation & Utilities (Matching Admin Content)
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500MB Limit

function validateSecureVideoFile(file: File): { valid: boolean; error?: string } {
  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_VIDEO_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Invalid video extension. Allowed formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`,
    };
  }
  if (file.type && !ALLOWED_VIDEO_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported video MIME type (${file.type}). Only MP4, WebM, OGG, or MOV videos are allowed.`,
    };
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video file size exceeds 500MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }
  return { valid: true };
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return null;
}

interface EnterprisePost {
  id: string | number;
  type: 'product' | 'update' | string;
  title?: string;
  content: string;
  image?: string;
  video?: string;
  video_url?: string;
  product_name?: string;
  productName?: string;
  price?: string;
  category?: string;
  seller_name?: string;
  sellerName?: string;
  location?: string;
  business_hours?: string;
  businessHours?: string;
  stock?: string;
  tags?: string[];
  likes: number;
  saves: number;
  created_at?: string;
  createdAt?: string;
}

export function EnterpriseDashboard() {
  const { currentUser, getWishlistCount, wishlistCounts } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'posts' | 'products' | 'social'>('posts');

  // Posts Feed state (from real database)
  const [posts, setPosts] = useState<EnterprisePost[]>([]);

  // Create Post Form State
  const [postType, setPostType] = useState<'product' | 'update'>('product');
  const [postContent, setPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);

  // Video Tour upload & link state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Product details
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [location, setLocation] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [openDropdownActive, setOpenDropdownActive] = useState(false);
  const [closeDropdownActive, setCloseDropdownActive] = useState(false);
  const openDropdownRef = useRef<HTMLDivElement | null>(null);
  const closeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [stock, setStock] = useState('');

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateSecureVideoFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid video file');
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreview(objectUrl);
    setVideoUrlInput('');
    toast.success(`Video "${file.name}" is ready!`);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoUrlInput('');
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdownRef.current && !openDropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownActive(false);
      }
      if (closeDropdownRef.current && !closeDropdownRef.current.contains(event.target as Node)) {
        setCloseDropdownActive(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check for subscription verification and show congratulations
  useEffect(() => {
    if (previousStatus === 'pending' && subscriptionStatus?.subscription_status === 'paid') {
      Swal.fire({
        title: 'Congratulations!',
        html: 'Your payment has been verified!<br/>You now have full access to all features.',
        icon: 'success',
        confirmButtonText: 'Start Managing',
        customClass: {
          popup: 'swal-success-popup'
        }
      });
    }
    if (subscriptionStatus) {
      setPreviousStatus(subscriptionStatus.subscription_status);
    }
  }, [subscriptionStatus, previousStatus]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const statusResponse = await getJSON('/subscription/status');
        setSubscriptionStatus(statusResponse);
        
        if (statusResponse.subscription_status !== 'paid' && statusResponse.subscription_status !== 'active') {
          setShowSubscriptionModal(true);
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      }
    };

    checkSubscriptionStatus();
    const interval = setInterval(checkSubscriptionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real posts from backend
  const fetchPosts = async () => {
    try {
      const res = await getJSON('/enterprise-posts');
      if (Array.isArray(res)) {
        setPosts(res);
      }
    } catch {
      try {
        const publicRes = await getPublicJSON('/enterprise-posts');
        if (Array.isArray(publicRes)) {
          setPosts(publicRes);
        }
      } catch (err) {
        console.error('Failed to load posts:', err);
      }
    }
  };

  useEffect(() => {
    (async () => {
      try {
        let fetchedProducts: any[] = [];
        try {
          const res = await getJSON('/products');
          if (Array.isArray(res)) {
            fetchedProducts = res;
          }
        } catch {}

        if (fetchedProducts.length === 0) {
          const publicRes = await getPublicJSON('/products');
          if (Array.isArray(publicRes)) {
            fetchedProducts = currentUser?.id
              ? publicRes.filter((product: any) => Number(product.user_id ?? product.userId) === Number(currentUser.id))
              : publicRes;
          }
        }
        setProducts(fetchedProducts);
      } catch {
        setProducts([]);
      }

      try {
        const profile = await getJSON('/enterprise-profile');
        setStoreProfile(profile);
        if (profile?.store_name && !sellerName) {
          setSellerName(profile.store_name);
        }
        if (profile?.barangay && !location) {
          setLocation(profile.address ? `${profile.address}, ${profile.barangay}` : profile.barangay);
        }
      } catch {
        // Fallback profile
      }

      await fetchPosts();
      setLoading(false);
    })();
  }, [currentUser?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags((prev) => [...prev, cleanTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    const isSubscriptionPaid = subscriptionStatus?.subscription_status === 'paid' || subscriptionStatus?.subscription_status === 'active';

    if (!isSubscriptionPaid) {
      if (subscriptionStatus?.subscription_status === 'pending') {
        Swal.fire({
          icon: 'info',
          title: 'Payment Verification in Progress',
          text: 'Your subscription receipt is currently under review by admin. You will gain full access to post and showcase products once verified.',
          confirmButtonColor: '#ec4899',
        });
      } else {
        setShowSubscriptionModal(true);
      }
      return;
    }

    if (!postContent.trim() && !productName.trim() && !videoFile && !videoUrlInput.trim()) {
      toast.error('Please write some content or upload a video / image for the post.');
      return;
    }

    if (postType === 'product' && !location.trim()) {
      toast.error('Where to buy (street / barangay) is required.');
      return;
    }

    setIsSubmittingPost(true);

    try {
      const formData = new FormData();
      formData.append('type', postType);
      
      const defaultContent = 
        postType === 'update'
          ? (videoFile || videoUrlInput ? 'Virtual Video Tour & Updates from Mansalay!' : 'Store updates and announcements from Mansalay!')
          : `Featuring ${productName || 'our products'} at Mansalay!`;

      formData.append('content', postContent.trim() || defaultContent);
      
      if (postType === 'product') {
        if (productName.trim()) formData.append('product_name', productName.trim());
        if (price.trim()) formData.append('price', price.trim());
        if (category.trim()) formData.append('category', category.trim());
        if (sellerName.trim() || storeProfile?.store_name || currentUser?.name) {
          formData.append('seller_name', sellerName.trim() || storeProfile?.store_name || currentUser?.name || '');
        }
        if (location.trim()) formData.append('location', location.trim());
        if (businessHours.trim()) formData.append('business_hours', businessHours.trim());
        if (stock.trim()) formData.append('stock', stock.trim());
      } else if (postType === 'update') {
        formData.append('location', storeProfile?.barangay ? `${storeProfile.address ? storeProfile.address + ', ' : ''}${storeProfile.barangay}` : 'Mansalay, Oriental Mindoro');
        formData.append('seller_name', storeProfile?.store_name || currentUser?.name || 'Mansalay Enterprise');

        // Video file or link for Virtual Tour / Update
        if (videoFile) {
          formData.append('video', videoFile);
        } else if (videoUrlInput.trim()) {
          formData.append('video_url', videoUrlInput.trim());
        }
      }

      const computedTags = tags.length > 0
        ? tags
        : postType === 'update'
        ? (videoFile || videoUrlInput ? ['VirtualTour', 'Video', 'Mansalay'] : ['Update', 'Mansalay'])
        : [category || 'Handicraft', 'Product', 'Mansalay'].filter(Boolean);

      formData.append('tags', JSON.stringify(computedTags));

      if (postImageFile) {
        formData.append('image', postImageFile);
      } else if (postImagePreview && postImagePreview.startsWith('http')) {
        formData.append('image_url', postImagePreview);
      } else if (products.length > 0 && products[0]?.image) {
        formData.append('image_url', products[0].image);
      }

      const created = await postJSON('/enterprise-posts', formData);

      // Prepend or refetch posts
      if (created && created.id) {
        setPosts((prev) => [created, ...prev]);
      } else {
        await fetchPosts();
      }

      // Refetch products to immediately update 'My Products' tab and stats
      try {
        const prodData = await getJSON('/products');
        const rawProds = Array.isArray(prodData) ? prodData : [];
        const myProds = currentUser?.id
          ? rawProds.filter((p: any) => Number(p.user_id ?? p.userId) === currentUser.id)
          : rawProds;
        setProducts(myProds);
      } catch {
        // ignore
      }

      // Reset form
      setPostContent('');
      setProductName('');
      setPrice('');
      setStock('');
      setBusinessHours('');
      setOpenTime('');
      setCloseTime('');
      setTags([]);
      setTagInput('');
      setPostImageFile(null);
      setPostImagePreview(null);
      handleRemoveVideo();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Post published successfully to database!');
      setActiveTab('posts');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      toast.error(err?.message || 'Failed to publish post');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId: string | number) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p))
    );

    try {
      await postJSON(`/enterprise-posts/${postId}/like`, {});
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleSavePost = async (postId: string | number) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saves: (p.saves || 0) + 1 } : p))
    );
    toast.success('Saved to wishlist/bookmarks!');

    try {
      await postJSON(`/enterprise-posts/${postId}/save`, {});
    } catch (err) {
      console.error('Failed to save post:', err);
    }
  };

  const handleDeletePost = (postId: string | number) => {
    Swal.fire({
      title: 'Delete Post?',
      text: 'Are you sure you want to remove this post from the database?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ec4899',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteJSON(`/enterprise-posts/${postId}`);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
          toast.success('Post removed from database.');
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete post.');
        }
      }
    });
  };

  const handlePaymentSubmitted = async () => {
    try {
      const statusResponse = await getJSON('/subscription/status');
      setSubscriptionStatus(statusResponse);
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    }
  };

  // Helper to format date
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
      return 'Just now';
    } catch {
      return dateStr;
    }
  };

  // Merge database products with any product-type posts to ensure any published product listing immediately appears
  const allProducts = useMemo(() => {
    const list = [...products];
    const existingNames = new Set(list.map((p) => String(p.name).toLowerCase().trim()));

    posts
      .filter((post) => post.type === 'product' || post.product_name)
      .forEach((post) => {
        const pName = String(post.product_name || post.content || '').trim();
        const pKey = pName.toLowerCase();
        if (pName && !existingNames.has(pKey)) {
          existingNames.add(pKey);
          list.push({
            id: `post_${post.id}`,
            name: pName,
            category: post.category || 'Handicraft',
            price: post.price ? (typeof post.price === 'string' ? parseFloat(post.price.replace(/[^0-9.]/g, '')) || 0 : post.price) : 0,
            stock: post.stock ? (typeof post.stock === 'string' ? parseInt(post.stock.replace(/[^0-9]/g, '')) || 10 : post.stock) : 10,
            image: post.image || (post.images && post.images[0]) || '',
            user_id: post.user_id,
            description: post.content,
            likes: post.likes || 0,
          });
        }
      });

    return list;
  }, [products, posts]);

  // Dynamic wishlist trends based on real products and live wishlist saves
  const wishlistTrends = useMemo(() => {
    if (allProducts.length === 0) return [];

    const scored = allProducts.map((p) => {
      const count = getWishlistCount(p.id, 'product', p.likes || 0);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        count: count,
      };
    }).sort((a, b) => b.count - a.count);

    const maxScore = Math.max(1, scored[0]?.count || 1);
    return scored.slice(0, 5).map((item) => ({
      ...item,
      percentage: item.count > 0 ? Math.min(100, Math.round((item.count / maxScore) * 100)) : 0,
    }));
  }, [allProducts, wishlistCounts, getWishlistCount]);

  // Compute total real wishlist saves for this enterprise's catalog & posts
  const totalWishlistSaves = useMemo(() => {
    const postSaves = posts.reduce((a, b) => a + Number(b.saves || 0), 0);
    const productSaves = allProducts.reduce((acc, p) => acc + getWishlistCount(p.id, 'product', p.likes || 0), 0);
    return productSaves + postSaves;
  }, [allProducts, posts, wishlistCounts, getWishlistCount]);

  // Real store and product views from database + real-time visitor tracking
  const totalViews = useMemo(() => {
    const localCountsStr = typeof window !== 'undefined' ? localStorage.getItem('discover-mansalay:view_counts') : null;
    const localCounts = localCountsStr ? JSON.parse(localCountsStr) : {};

    let total = 0;
    // 1. Store profile views
    if (currentUser?.id) {
      const storeViewDB = Number(storeProfile?.view_count || currentUser?.view_count || 0);
      const storeViewLocal = Number(localCounts[`view_count_enterprise_${currentUser.id}`] || 0);
      total += Math.max(storeViewDB, storeViewLocal);
    }

    // 2. Products views
    allProducts.forEach((p) => {
      const prodViewDB = Number(p.view_count || p.views || 0);
      const prodViewLocal = Number(localCounts[`view_count_product_${p.id}`] || 0);
      total += Math.max(prodViewDB, prodViewLocal);
    });

    return total;
  }, [currentUser?.id, storeProfile?.view_count, currentUser?.view_count, allProducts]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border border-pink-100 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 font-medium">Loading real enterprise dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6 text-gray-800">
      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onPaymentSubmitted={handlePaymentSubmitted}
        userRole="enterprise"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Enterprise Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your business presence on Discover Mansalay
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/enterprise/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ec4899] hover:bg-[#db2777] text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0"
          >
            <Store className="w-4 h-4" />
            Business Profile
          </Link>
        </div>
      </div>

      {/* Subscription Status Banner if pending / unpaid */}
      {subscriptionStatus && subscriptionStatus.subscription_status !== 'paid' && (
        <div className={`border rounded-2xl p-4.5 ${
          subscriptionStatus.subscription_status === 'pending' 
            ? 'bg-amber-50 border-amber-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className={`font-semibold text-sm mb-0.5 ${
                subscriptionStatus.subscription_status === 'pending' 
                  ? 'text-amber-900' 
                  : 'text-orange-900'
              }`}>
                {subscriptionStatus.subscription_status === 'pending' 
                  ? '⏳ Payment Pending Verification' 
                  : '🔒 Subscription Required'}
              </h3>
              <p className={`text-xs ${
                subscriptionStatus.subscription_status === 'pending' 
                  ? 'text-amber-700' 
                  : 'text-orange-700'
              }`}>
                {subscriptionStatus.subscription_status === 'pending'
                  ? 'Your payment is being reviewed by admin. You will get verified full business showcase access shortly.'
                  : `Subscribe now for ₱${(subscriptionStatus.subscription_amount ?? 50).toLocaleString()}/year to verify your store presence.`}
              </p>
            </div>
            {subscriptionStatus.subscription_status === 'unpaid' && (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-[#ec4899] text-white text-xs font-semibold rounded-xl hover:bg-[#db2777] transition-colors whitespace-nowrap shadow-sm"
              >
                Subscribe Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Real Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat 1: Views */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-3">
            <Eye className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {totalViews.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Shop & Product Views</div>
          <div className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {totalViews > 0 ? `+${totalViews}` : '+0'}
          </div>
        </div>

        {/* Stat 2: Wishlist Saves */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 mb-3">
            <Heart className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {totalWishlistSaves.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Wishlist Saves</div>
          <div className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {totalWishlistSaves > 0 ? `+${totalWishlistSaves}` : '+0'}
          </div>
        </div>

        {/* Stat 3: Products */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-3">
            <Package className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {allProducts.length}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Total Products</div>
          <div className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            +{allProducts.length}
          </div>
        </div>

        {/* Stat 4: Posts */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {posts.length}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Published Posts</div>
          <div className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            +{posts.length}
          </div>
        </div>
      </div>

      {/* Wishlist Trends — Most Saved Products */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-pink-500" />
            <h2 className="text-base font-bold text-gray-900">
              Wishlist Trends — Most Saved Products
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-medium">Ranked by total tourist saves</span>
        </div>

        {wishlistTrends.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700">No products added yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Add products to your store to view real-time wishlist ranking and tourist interest.</p>
            <Link
              to="/enterprise/profile"
              className="inline-flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-pink-500 text-white hover:bg-pink-600 rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Product</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {wishlistTrends.map((item, index) => (
              <div key={item.id || index} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold w-5 text-center text-xs ${
                      index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-700' : 'text-gray-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="text-gray-900 font-bold">{item.name}</span>
                    {item.category && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-pink-500 font-extrabold text-xs">
                    <Heart className="w-3.5 h-3.5 fill-pink-500" />
                    <span>{item.count} {item.count === 1 ? 'save' : 'saves'}</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Section (Saves Real Data to DB) */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] space-y-5 relative overflow-hidden">
        {subscriptionStatus && subscriptionStatus.subscription_status !== 'paid' && subscriptionStatus.subscription_status !== 'active' && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xs ${
              subscriptionStatus.subscription_status === 'pending'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-pink-100 text-pink-600'
            }`}>
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {subscriptionStatus.subscription_status === 'pending'
                ? '⏳ Payment Verification in Progress'
                : '🔒 Feature Locked: Subscription Required'}
            </h3>
            <p className="text-xs text-gray-600 max-w-md mb-4">
              {subscriptionStatus.subscription_status === 'pending'
                ? 'Admin is currently reviewing your payment receipt. Once verified, you will have full access to publish posts, add products, and manage your store showcase.'
                : 'Subscribe now to unlock posting, product catalog management, and local enterprise showcase features on Discover Mansalay.'}
            </p>
            {subscriptionStatus.subscription_status === 'unpaid' && (
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                className="px-5 py-2.5 bg-[#ec4899] hover:bg-[#db2777] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Subscribe Now to Unlock
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-pink-500 stroke-[2.5]" />
          <h2 className="text-base font-bold text-gray-900">Create Post</h2>
        </div>

        {/* Post Type Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPostType('product')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              postType === 'product'
                ? 'bg-[#ec4899] text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Product Listing
          </button>

          <button
            type="button"
            onClick={() => setPostType('update')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              postType === 'update'
                ? 'bg-[#ec4899] text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Virtual Tour / Update
          </button>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-4">
          {/* Upload Photo Dropzone */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {postImagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 max-h-64 bg-black/5 flex items-center justify-center">
                <img 
                  src={postImagePreview} 
                  alt="Post preview" 
                  className="w-full h-56 object-cover" 
                />
                <button
                  type="button"
                  onClick={() => {
                    setPostImageFile(null);
                    setPostImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-pink-300 bg-gray-50/50 hover:bg-pink-50/20 rounded-xl py-10 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-pink-600 transition-all cursor-pointer group"
              >
                <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-pink-500 transition-colors" />
                <span className="text-xs font-medium text-gray-500 group-hover:text-pink-600">Upload photo</span>
              </button>
            )}
          </div>

          {/* Write about your product textarea */}
          <div>
            <textarea
              rows={3}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Write about your product, promotion, or update..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all resize-none"
            />
          </div>

          {/* PRODUCT DETAILS (Only for Product Listing) */}
          {postType === 'product' && (
            <div className="bg-gray-50/70 p-4.5 rounded-xl border border-gray-100 space-y-3.5">
              <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                Product Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Row 1: Product Name & Price */}
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Product name *"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="w-4 h-4 text-gray-500 font-extrabold text-sm absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center select-none pointer-events-none">
                    ₱
                  </div>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Price (e.g. ₱350 – ₱650)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all"
                  />
                </div>

                {/* Row 2: Category & Seller */}
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Category...</option>
                    <option value="Handicraft">Handicraft</option>
                    <option value="Food">Food & Delicacies</option>
                    <option value="Souvenir">Souvenir</option>
                    <option value="Clothing">Traditional Clothing</option>
                    <option value="Agriculture">Agriculture & Honey</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <Store className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="Seller / maker name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all"
                  />
                </div>

                {/* Row 3: Location & Stock */}
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where to buy — street / barangay *"
                    className="w-full pl-10 pr-16 py-2.5 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                    Required
                  </span>
                </div>

                <div className="relative">
                  <Package className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Stock / availability (e.g. In stock, 20 remaining)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all"
                  />
                </div>
              </div>

              {/* Operating / Business Hours Section with Dropdowns */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-gray-600 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-pink-500" />
                  <span>Business / Operating Hours</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opening Time Custom Dropdown */}
                  <div ref={openDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdownActive((prev) => !prev);
                        setCloseDropdownActive(false);
                      }}
                      className={`w-full pl-3.5 pr-3 py-2.5 bg-white border rounded-lg text-xs font-semibold text-gray-800 text-left flex items-center justify-between shadow-2xs transition-all cursor-pointer ${
                        openDropdownActive ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                        <span className={openTime ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                          {openTime || 'Opening Time (e.g. 8:00 AM)'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                          openDropdownActive ? 'rotate-180 text-pink-500' : ''
                        }`}
                      />
                    </button>

                    {/* Downward Popover Menu with Scroll */}
                    {openDropdownActive && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-gray-100 rounded-xl shadow-xl p-1 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="p-1.5 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-gray-100">
                          Select Opening Time
                        </div>
                        <div className="py-1 space-y-0.5">
                          {OPEN_TIME_OPTIONS.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setOpenTime(t);
                                if (t === 'Open 24 Hours') {
                                  setBusinessHours('Open 24 Hours');
                                } else {
                                  setBusinessHours(`${t} – ${closeTime || '5:00 PM'}`);
                                }
                                setOpenDropdownActive(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                openTime === t
                                  ? 'bg-pink-50 text-pink-600 font-extrabold'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-pink-600'
                              }`}
                            >
                              <span>{t}</span>
                              {openTime === t && <CheckCircle2 className="h-3.5 w-3.5 text-pink-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Closing Time Custom Dropdown */}
                  <div ref={closeDropdownRef} className="relative">
                    <button
                      type="button"
                      disabled={openTime === 'Open 24 Hours'}
                      onClick={() => {
                        setCloseDropdownActive((prev) => !prev);
                        setOpenDropdownActive(false);
                      }}
                      className={`w-full pl-3.5 pr-3 py-2.5 bg-white border rounded-lg text-xs font-semibold text-gray-800 text-left flex items-center justify-between shadow-2xs transition-all cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
                        closeDropdownActive ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                        <span className={closeTime ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                          {openTime === 'Open 24 Hours' ? 'N/A (24 Hours)' : closeTime || 'Closing Time (e.g. 5:00 PM)'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                          closeDropdownActive ? 'rotate-180 text-rose-500' : ''
                        }`}
                      />
                    </button>

                    {/* Downward Popover Menu with Scroll */}
                    {closeDropdownActive && openTime !== 'Open 24 Hours' && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-gray-100 rounded-xl shadow-xl p-1 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="p-1.5 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-gray-100">
                          Select Closing Time
                        </div>
                        <div className="py-1 space-y-0.5">
                          {CLOSE_TIME_OPTIONS.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setCloseTime(t);
                                if (openTime && openTime !== 'Open 24 Hours') {
                                  setBusinessHours(`${openTime} – ${t}`);
                                }
                                setCloseDropdownActive(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                closeTime === t
                                  ? 'bg-rose-50 text-rose-600 font-extrabold'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-rose-600'
                              }`}
                            >
                              <span>{t}</span>
                              {closeTime === t && <CheckCircle2 className="h-3.5 w-3.5 text-rose-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule preview badge */}
                {businessHours && (
                  <p className="text-[11px] text-pink-600 font-bold mt-1.5 flex items-center gap-1.5">
                    <span>⏰ Selected Hours:</span>
                    <span className="bg-pink-50 px-2.5 py-0.5 rounded-md border border-pink-200 text-pink-700 font-semibold shadow-2xs">
                      {businessHours}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* VIRTUAL TOUR / VIDEO UPLOAD SECTION (For Virtual Tour / Update) */}
          {postType === 'update' && (
            <div className="bg-gradient-to-br from-pink-50/50 via-white to-purple-50/30 p-4.5 sm:p-5 rounded-2xl border border-pink-100/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-pink-500/10 text-pink-600 rounded-lg">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">Virtual Tour Video Upload</h3>
                    <p className="text-[11px] text-gray-500 font-medium">Upload a video file or paste a video link (YouTube, Facebook, MP4)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Optional Video Tour
                </span>
              </div>

              {/* Video Link Input */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Video Link (YouTube, Facebook, or Direct Video URL)
                </label>
                <div className="relative">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => {
                      setVideoUrlInput(e.target.value);
                      if (e.target.value.trim()) {
                        setVideoFile(null);
                        setVideoPreview(null);
                        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=... or https://example.com/tour.mp4"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">OR Upload Video File</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Secure Video File Dropzone */}
              <div>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => videoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-pink-400 rounded-xl p-5 text-center bg-white/70 hover:bg-pink-50/30 transition-all cursor-pointer group"
                >
                  <Film className="h-7 w-7 text-gray-400 group-hover:text-pink-500 mx-auto mb-1.5 transition-colors" />
                  <p className="text-xs font-bold text-gray-700">Click to choose video file</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium">MP4, WebM, MOV (Up to 500MB)</p>
                  {videoFile && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[11px] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Video Preview Player */}
              {(videoPreview || videoUrlInput) && (
                <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />
                      <span>Video Tour Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="px-2 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-[11px] font-bold rounded-md transition-all cursor-pointer"
                    >
                      Remove Video
                    </button>
                  </div>

                  {videoPreview ? (
                    <video
                      controls
                      playsInline
                      className="w-full max-h-56 object-cover rounded-lg bg-black"
                      src={videoPreview}
                    />
                  ) : getYouTubeEmbedUrl(videoUrlInput) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(videoUrlInput)!}
                      title="YouTube video player"
                      className="w-full aspect-video max-h-56 rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      playsInline
                      className="w-full max-h-56 object-cover rounded-lg bg-black"
                      src={videoUrlInput}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Added Tags Chips (if any) */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-pink-800 transition-colors p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add tag + Enter Input Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="text-gray-400 text-xs absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">🏷️</span>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag + Enter"
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[#ec4899] transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmittingPost}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#ec4899] hover:bg-[#db2777] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmittingPost ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabs Navigation Card & Feed Section */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-gray-100 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`py-4 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'posts'
                ? 'border-[#ec4899] text-[#ec4899]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Posts ({posts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-4 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'border-[#ec4899] text-[#ec4899]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            My Products
            {products.length > 0 && (
              <span className="text-xs bg-pink-100 text-[#ec4899] px-2 py-0.5 rounded-full font-bold">
                {products.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`py-4 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'social'
                ? 'border-[#ec4899] text-[#ec4899]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Social & Links
          </button>
        </div>

        {/* Tab 1: Real Posts Feed */}
        {activeTab === 'posts' && (
          <div className="p-6 space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No posts published yet.</p>
                <p className="text-xs mt-1">Create your first product post using the form above!</p>
              </div>
            ) : (
              posts.map((post) => {
                const imgUrl = post.image ? (post.image.startsWith('http') ? post.image : getStorageUrl(post.image)) : null;
                const videoUrl = post.video ? (post.video.startsWith('http') ? post.video : getStorageUrl(post.video)) : null;
                const ytEmbed = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
                const prodTitle = post.product_name || post.productName;
                const priceText = post.price;
                const categoryText = post.category;
                const locText = post.location;
                const hoursText = post.business_hours || post.businessHours;
                const stockText = post.stock;
                const timeAgo = formatTimeAgo(post.created_at || post.createdAt);
                const tagList = Array.isArray(post.tags) ? post.tags : [];

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)] space-y-4 hover:border-pink-200 transition-all group"
                  >
                    {/* Post Video or Image Media */}
                    {videoUrl ? (
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-80">
                        {ytEmbed ? (
                          <iframe
                            src={ytEmbed}
                            title="Virtual Tour"
                            className="w-full h-full object-cover"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={videoUrl}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-3 left-3 pointer-events-none">
                          <span className="px-3 py-1 bg-pink-600/90 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" />
                            Virtual Video Tour
                          </span>
                        </div>
                      </div>
                    ) : imgUrl ? (
                      <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video sm:aspect-[21/9] max-h-72">
                        <img
                          src={imgUrl}
                          alt={prodTitle || 'Post media'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-[#ec4899] text-white text-[11px] font-bold rounded-full shadow-sm">
                            {post.type === 'product'
                              ? 'Product Listing'
                              : 'Business Update'}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {/* Post Content */}
                    <p className="text-sm text-gray-800 leading-relaxed font-normal">
                      {post.content}
                    </p>

                    {/* Badges / Attribute Chips Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {prodTitle && (
                        <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/60 font-semibold text-xs rounded-full">
                          {prodTitle}
                        </span>
                      )}
                      {priceText && (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold text-xs rounded-full inline-flex items-center gap-1">
                          <span className="font-extrabold text-emerald-600 text-xs">₱</span>
                          {priceText.replace(/^₱\s*/, '')}
                        </span>
                      )}
                      {categoryText && (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-medium rounded-full">
                          {categoryText}
                        </span>
                      )}
                      {locText && (
                        <span className="px-3 py-1 bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium rounded-full inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {locText}
                        </span>
                      )}
                      {hoursText && (
                        <span className="px-3 py-1 bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {hoursText}
                        </span>
                      )}
                      {stockText && (
                        <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200/60 text-xs font-medium rounded-full inline-flex items-center gap-1">
                          <Package className="w-3 h-3 text-purple-600" />
                          {stockText}
                        </span>
                      )}
                    </div>

                    {/* Hashtags / Tag pills */}
                    {tagList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tagList.map((tag: string, tIdx: number) => (
                          <span
                            key={tIdx}
                            className="px-2.5 py-0.5 bg-pink-50/70 border border-pink-200/60 text-pink-600 text-[11px] font-medium rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Bar: Likes, Saves, Timestamp */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-pink-600 transition-colors cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                          <span className="font-semibold text-gray-700">{post.likes || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSavePost(post.id)}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-pink-600 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-4 h-4 text-pink-400" />
                          <span>{post.saves || 0} saves</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span>{timeAgo}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all p-1 cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Real Listed Products */}
        {activeTab === 'products' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Your Listed Products</h3>
                <p className="text-xs text-gray-500">Products currently published in Mansalay directory</p>
              </div>
              <Link
                to="/enterprise/profile"
                className="px-4 py-2 bg-pink-50 text-[#ec4899] hover:bg-pink-100 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Manage in Profile
              </Link>
            </div>

            {allProducts.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">No products added yet.</p>
                <Link
                  to="/enterprise/profile"
                  className="mt-2 inline-block text-xs font-semibold text-[#ec4899] hover:underline"
                >
                  Add your first product &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allProducts.map((product) => {
                  const pImg = product.image ? (product.image.startsWith('http') ? product.image : getStorageUrl(product.image)) : 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=300&auto=format&fit=crop&q=80';
                  return (
                    <div
                      key={product.id}
                      className="p-4 border border-gray-100 rounded-xl flex items-center gap-4 bg-gray-50/40 hover:bg-pink-50/20 hover:border-pink-200 transition-all"
                    >
                      <img
                        src={pImg}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{product.name}</h4>
                        <p className="text-[11px] text-gray-500 truncate">{product.category || 'Handicraft'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-[#ec4899]">
                            ₱{Number(product.price || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full">
                            {Number(product.stock ?? 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Social & Links */}
        {activeTab === 'social' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Business Information & Links</h3>
                <p className="text-xs text-gray-500">Contact details shown to tourists on your public profile</p>
              </div>
              <Link
                to="/enterprise/profile"
                className="px-4 py-2 bg-pink-50 text-[#ec4899] hover:bg-pink-100 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
              >
                Edit Details
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Store Name</div>
                <div className="text-sm font-semibold text-gray-800">
                  {storeProfile?.store_name || currentUser?.name || 'My Mansalay Store'}
                </div>
              </div>

              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Location / Barangay</div>
                <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-pink-500 flex-shrink-0" />
                  {storeProfile?.address ? `${storeProfile.address}, ` : ''}{storeProfile?.barangay || 'Mansalay, Oriental Mindoro'}
                </div>
              </div>

              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Facebook Page</div>
                <div className="text-sm font-semibold text-gray-800">
                  {storeProfile?.facebook_link ? (
                    <a href={storeProfile.facebook_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      {storeProfile.facebook_link}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-gray-400 font-normal text-xs">No Facebook link added</span>
                  )}
                </div>
              </div>

              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Instagram / Social</div>
                <div className="text-sm font-semibold text-gray-800">
                  {storeProfile?.instagram_link ? (
                    <a href={storeProfile.instagram_link} target="_blank" rel="noreferrer" className="text-pink-600 hover:underline flex items-center gap-1">
                      {storeProfile.instagram_link}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-gray-400 font-normal text-xs">No Instagram link added</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
