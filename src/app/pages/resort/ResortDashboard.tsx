import { useEffect, useMemo, useState, useRef } from 'react';
import { 
  Hotel, 
  Eye, 
  Heart, 
  Bookmark,
  Star,
  Building2,
  FileText, 
  Plus, 
  Image as ImageIcon, 
  MapPin, 
  Clock, 
  Send, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  ExternalLink, 
  Share2, 
  Sparkles,
  Bed,
  Waves,
  Compass,
  Palmtree,
  Megaphone,
  Tag,
  DollarSign,
  Phone,
  Mail,
  Facebook,
  Instagram,
  CheckCircle2,
  X,
  Edit,
  Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { getJSON, getPublicJSON, postJSON, putJSON, deleteJSON, getStorageUrl, API_BASE, getAuthToken } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { SubscriptionPaymentModal } from '../../components/SubscriptionPaymentModal';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

interface ResortPost {
  id: string | number;
  type: string;
  title?: string;
  content: string;
  image?: string;
  product_name?: string;
  price?: string;
  category?: string;
  seller_name?: string;
  location?: string;
  business_hours?: string;
  stock?: string;
  tags?: string[];
  likes: number;
  saves: number;
  created_at?: string;
}

export function ResortDashboard() {
  const navigate = useNavigate();
  const { currentUser, getWishlistCount, wishlistCounts } = useApp();
  const [resortProfile, setResortProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  // Active tab state: 'posts' | 'social'
  const [activeTab, setActiveTab] = useState<'posts' | 'social'>('posts');

  // Posts Feed state (from real database)
  const [posts, setPosts] = useState<ResortPost[]>([]);

  // Create Post Form State
  const [postType, setPostType] = useState<string>('promotion');
  const [postContent, setPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);

  // Post form fields
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [stock, setStock] = useState('');
  const [promoNote, setPromoNote] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Social links form state
  const [socialForm, setSocialForm] = useState({
    facebook_link: '',
    instagram_link: '',
    phone: '',
    address: '',
    barangay: 'Coastal Road',
  });
  const [savingSocial, setSavingSocial] = useState(false);

  // Post Type Options
  const postTypes = [
    { key: 'promotion', label: 'Promotion', icon: Tag, color: 'bg-pink-50 text-pink-600 border-pink-200' },
    { key: 'rooms', label: 'Rooms', icon: Bed, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { key: 'amenities', label: 'Amenities', icon: Waves, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { key: 'activities', label: 'Activities', icon: Compass, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { key: 'beach_views', label: 'Beach Views', icon: Palmtree, color: 'bg-rose-50 text-rose-600 border-rose-200' },
    { key: 'announcement', label: 'Announcement', icon: Megaphone, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];

  // Check for subscription verification
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

  // Real-time Database Stats
  const [dbStats, setDbStats] = useState<{
    total_views: number;
    views_growth: string;
    wishlist_saves: number;
    saves_growth: string;
    avg_rating: string;
    rating_growth: string;
    active_rooms: number;
    total_posts: number;
    posts_this_month: number;
  } | null>(null);

  // Fetch real-time statistics from backend
  const fetchStats = async () => {
    try {
      const res = await getJSON('/resort-stats');
      if (res?.success && res?.stats) {
        setDbStats(res.stats);
      }
    } catch {
      // Fallback to local computation
    }
  };

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

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const profile = await getJSON('/resort-profile');
        setResortProfile(profile);
        if (profile) {
          if (profile.address || profile.barangay) {
            setLocation(profile.address ? `${profile.address}, Mansalay` : `${profile.barangay}, Mansalay`);
          } else {
            setLocation('Coastal Road, Mansalay');
          }
          setSocialForm({
            facebook_link: profile.facebook_link || '',
            instagram_link: profile.instagram_link || '',
            phone: profile.phone || '',
            address: profile.address || '',
            barangay: profile.barangay || 'Coastal Road',
          });
        }
      } catch {
        setLocation('Coastal Road, Mansalay');
      }

      await Promise.all([fetchPosts(), fetchStats()]);
      setLoading(false);
    })();
  }, []);

  const handlePaymentSubmitted = async () => {
    try {
      const statusResponse = await getJSON('/subscription/status');
      setSubscriptionStatus(statusResponse);
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    }
  };

  // Image Selection Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setPostImageFile(file);
      setPostImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setPostImageFile(null);
    setPostImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Tags Handlers
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Submit New Post Handler
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();

    const isSubscriptionPaid = subscriptionStatus?.subscription_status === 'paid' || subscriptionStatus?.subscription_status === 'active';

    if (!isSubscriptionPaid) {
      if (subscriptionStatus?.subscription_status === 'pending') {
        Swal.fire({
          icon: 'info',
          title: 'Payment Verification in Progress',
          text: 'Your subscription receipt is currently under review by admin. You will gain full access to publish posts and add rooms once verified.',
          confirmButtonColor: '#ec4899',
        });
      } else {
        setShowSubscriptionModal(true);
      }
      return;
    }

    if (!postContent.trim()) {
      toast.error('Please write a caption for your post');
      return;
    }

    if (!location.trim()) {
      toast.error('Specific location is required');
      return;
    }

    setIsSubmittingPost(true);

    try {
      const token = getAuthToken();
      const formData = new FormData();

      formData.append('type', postType);
      formData.append('content', postContent.trim());
      formData.append('location', location.trim());

      const resortName = resortProfile?.resort_name || currentUser?.resort_name || currentUser?.name || 'Resort';
      formData.append('seller_name', resortName);

      if (price.trim()) formData.append('price', price.trim());
      if (businessHours.trim()) formData.append('business_hours', businessHours.trim());
      if (stock.trim()) formData.append('stock', stock.trim());
      
      const allTags = [...tags];
      if (promoNote.trim()) {
        allTags.push(promoNote.trim());
      }
      if (allTags.length > 0) {
        formData.append('tags', JSON.stringify(allTags));
      }

      if (postImageFile) {
        formData.append('image', postImageFile);
      }

      const res = await fetch(`${API_BASE}/api/enterprise-posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to publish post');
      }

      toast.success('Post published successfully!');

      // Reset form
      setPostContent('');
      setPrice('');
      setBusinessHours('');
      setStock('');
      setPromoNote('');
      setTags([]);
      setTagInput('');
      handleRemoveImage();
      setShowMoreDetails(false);

      // Refresh post feed and real-time stats
      await Promise.all([fetchPosts(), fetchStats()]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish post');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Delete Post Handler
  const handleDeletePost = async (postId: string | number) => {
    const result = await Swal.fire({
      title: 'Delete Post?',
      text: 'Are you sure you want to delete this post? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
    });

    if (result.isConfirmed) {
      try {
        await deleteJSON(`/enterprise-posts/${postId}`);
        toast.success('Post deleted successfully');
        setPosts(prev => prev.filter(p => p.id !== postId));
        fetchStats();
      } catch {
        toast.error('Failed to delete post');
      }
    }
  };

  // Like Post Handler
  const handleLikePost = async (postId: string | number) => {
    // Optimistic UI update
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p)));
    try {
      await postJSON(`/enterprise-posts/${postId}/like`, {});
      fetchStats();
    } catch {
      // Revert if error
    }
  };

  // Save Post Handler
  const handleSavePost = async (postId: string | number) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, saves: (p.saves || 0) + 1 } : p)));
    try {
      await postJSON(`/enterprise-posts/${postId}/save`, {});
      toast.success('Saved to wishlist!');
      fetchStats();
    } catch {
      // Revert if error
    }
  };

  // Save Social Links
  const handleSaveSocial = async () => {
    setSavingSocial(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/resort-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(socialForm),
      });

      if (!res.ok) {
        throw new Error('Failed to update social links');
      }

      toast.success('Social links & contact info updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save social links');
    } finally {
      setSavingSocial(false);
    }
  };

  // Relative time helper
  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const now = new Date();
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper to get category badge style
  const getBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'beach_views':
      case 'beach views':
        return { label: 'Beach Views', bg: 'bg-rose-500 text-white' };
      case 'promotion':
        return { label: 'Promotion', bg: 'bg-pink-500 text-white' };
      case 'rooms':
        return { label: 'Rooms', bg: 'bg-purple-600 text-white' };
      case 'amenities':
        return { label: 'Amenities', bg: 'bg-cyan-600 text-white' };
      case 'activities':
        return { label: 'Activities', bg: 'bg-emerald-600 text-white' };
      case 'announcement':
        return { label: 'Announcement', bg: 'bg-amber-500 text-white' };
      default:
        return { label: type.charAt(0).toUpperCase() + type.slice(1), bg: 'bg-pink-500 text-white' };
    }
  };

  const totalViews = useMemo(() => {
    const postViews = posts.reduce((sum, p) => sum + ((p.likes || 0) * 5 + (p.saves || 0) * 8), 0);
    return postViews;
  }, [posts]);

  const totalSaves = useMemo(() => {
    const postSaves = posts.reduce((sum, p) => sum + (p.saves || 0), 0);
    const resortSaves = currentUser?.id ? getWishlistCount(currentUser.id, 'accommodation', 0) : 0;
    return postSaves + resortSaves;
  }, [posts, currentUser?.id, wishlistCounts, getWishlistCount]);

  const totalPostsCount = useMemo(() => {
    return posts.length;
  }, [posts]);

  const resortDisplayName = resortProfile?.resort_name || currentUser?.resort_name || currentUser?.name || 'MB Hiraya Beach Resort';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-pink-100 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading resort dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onPaymentSubmitted={handlePaymentSubmitted}
        userRole="resort"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Resort Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your resort's presence on Discover Mansalay</p>
        </div>
        <Link
          to={`/business/resort/${currentUser?.id || ''}?manage=true`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-medium shadow-sm transition-all hover:shadow"
        >
          <Edit className="h-4 w-4" />
          Edit Profile
        </Link>
      </div>

      {/* Subscription Status Alert if unpaid/pending */}
      {subscriptionStatus && subscriptionStatus.subscription_status !== 'paid' && (
        <div className={`border-2 rounded-2xl p-4 ${
          subscriptionStatus.subscription_status === 'pending' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className={`font-semibold text-sm mb-0.5 ${
                subscriptionStatus.subscription_status === 'pending' ? 'text-yellow-900' : 'text-orange-900'
              }`}>
                {subscriptionStatus.subscription_status === 'pending' 
                  ? '⏳ Payment Pending Verification' 
                  : '🔒 Subscription Required'}
              </h3>
              <p className={`text-xs ${
                subscriptionStatus.subscription_status === 'pending' ? 'text-yellow-700' : 'text-orange-700'
              }`}>
                {subscriptionStatus.subscription_status === 'pending'
                  ? 'Your payment is being reviewed by admin. You\'ll get full access once verified.'
                  : `Subscribe now for ₱${(subscriptionStatus.subscription_amount ?? 50).toLocaleString()}/year to unlock all features.`}
              </p>
            </div>
            {subscriptionStatus.subscription_status === 'unpaid' && (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-pink-500 text-white text-xs font-semibold rounded-xl hover:bg-pink-600 transition-colors whitespace-nowrap shadow-sm"
              >
                Subscribe Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Views */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
            <Eye className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(dbStats?.total_views ?? totalViews).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Views</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-1">
            ↗ {dbStats?.views_growth || '0%'}
          </div>
        </div>

        {/* Wishlist Saves */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center mb-3">
            <Heart className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(dbStats?.wishlist_saves ?? totalSaves).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Wishlist Saves</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-1">
            ↗ {dbStats?.saves_growth || '0%'}
          </div>
        </div>

        {/* Active Rooms / Stays */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Bed className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {dbStats?.active_rooms ?? (resortProfile?.rooms?.length || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active Rooms/Stays</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-1">Listed</div>
        </div>

        {/* Total Posts */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <FileText className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {dbStats?.total_posts ?? posts.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Posts</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-1">
            ↗ +{dbStats?.posts_this_month ?? (posts.length || 0)}
          </div>
        </div>
      </div>

      {/* Create New Post Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
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
                ? 'Admin is currently verifying your subscription payment. Once approved, you will have full access to publish posts, add rooms, and showcase your resort.'
                : 'Subscribe now to unlock posting, room management, and public resort showcase features on Discover Mansalay.'}
            </p>
            {subscriptionStatus.subscription_status === 'unpaid' && (
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Subscribe Now to Unlock
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-pink-500 stroke-[2.5]" />
          <h2 className="text-base font-bold text-gray-900">Create New Post</h2>
        </div>

        <form onSubmit={handlePublishPost} className="space-y-4">
          {/* Post Type Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {postTypes.map(t => {
              const Icon = t.icon;
              const isSelected = postType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPostType(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Photo Upload Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            {postImagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 max-h-72 group">
                <img
                  src={postImagePreview}
                  alt="Post preview"
                  className="w-full h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-pink-300 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-pink-50/20"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-2 text-gray-400">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-gray-700">Click to upload photo</p>
                <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG up to 10MB</p>
              </div>
            )}
          </div>

          {/* Caption Textarea */}
          <div>
            <textarea
              rows={3}
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder="Write a caption for your post..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-sm placeholder:text-gray-400 resize-none transition-all"
            />
          </div>

          {/* Auto-filled Resort Name Banner */}
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <span>{resortProfile?.resort_name || currentUser?.resort_name || currentUser?.name || 'MB Hiraya Beach Resort'}</span>
            </div>
            <span className="text-emerald-700 text-xs font-semibold">
              Auto-filled
            </span>
          </div>

          {/* Inputs Row: Location & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <MapPin className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Specific location / street *"
                className="w-full pl-9 pr-16 py-2.5 border border-gray-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-xs"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                Required
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Price (e.g. ₱3,500/night)"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-xs"
              />
            </div>
          </div>

          {/* Show More Details Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 py-1"
            >
              {showMoreDetails ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide additional details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show more details
                </>
              )}
            </button>

            {showMoreDetails && (
              <div className="mt-3 p-4 bg-gray-50/80 rounded-xl border border-gray-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Operating / Check-in Hours
                    </label>
                    <input
                      type="text"
                      value={businessHours}
                      onChange={e => setBusinessHours(e.target.value)}
                      placeholder="e.g. Open daily 6:00 AM - 8:00 PM"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Room Availability / Units
                    </label>
                    <input
                      type="text"
                      value={stock}
                      onChange={e => setStock(e.target.value)}
                      placeholder="e.g. 5 rooms remaining"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Promo Code or Discount Badge
                  </label>
                  <input
                    type="text"
                    value={promoNote}
                    onChange={e => setPromoNote(e.target.value)}
                    placeholder="e.g. 20% OFF — Use code SUMMER20"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Tags & Hashtags
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 px-2.5 py-1 rounded-md text-xs"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-pink-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag and press Enter (e.g. Sunset, Beach, Nature)"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmittingPost}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition-all hover:shadow"
            >
              {isSubmittingPost ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Publish Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            My Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'social'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Share2 className="h-4 w-4" />
            Social Links
          </button>
        </div>
      </div>

      {/* Tab 1: Posts Feed */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-800">No posts yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Create your first post above to showcase your resort rooms, promotions, amenities, and beach views!
              </p>
            </div>
          ) : (
            posts.map(post => {
              const badge = getBadgeStyle(post.type);
              const imageUrl = post.image ? getStorageUrl(post.image) : null;
              const postTags = Array.isArray(post.tags) ? post.tags : [];

              return (
                <div
                  key={post.id}
                  className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all"
                >
                  {/* Post Image with Category Badge */}
                  {imageUrl && (
                    <div className="relative h-64 sm:h-72 w-full bg-gray-100 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={post.content.slice(0, 30)}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Post Body */}
                  <div className="p-5 space-y-3">
                    {!imageUrl && (
                      <div className="inline-block">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    )}

                    {/* Caption */}
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Tag Chips Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {post.location && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          {post.location}
                        </span>
                      )}

                      {post.price && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">
                          <DollarSign className="h-3 w-3 text-emerald-600" />
                          {post.price}
                        </span>
                      )}

                      {post.business_hours && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-100">
                          <Clock className="h-3 w-3 text-blue-500" />
                          {post.business_hours}
                        </span>
                      )}

                      {post.stock && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs border border-purple-100">
                          <Bed className="h-3 w-3 text-purple-600" />
                          {post.stock}
                        </span>
                      )}
                    </div>

                    {/* Hashtags */}
                    {postTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {postTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer / Interaction Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-pink-600 transition-colors font-medium cursor-pointer"
                        >
                          <Heart className="h-4 w-4 text-pink-500 hover:scale-110 transition-transform" />
                          <span>{post.likes || 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePost(post.id)}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-pink-600 transition-colors font-medium cursor-pointer"
                        >
                          <Bookmark className="h-4 w-4 text-pink-500 hover:scale-110 transition-transform" />
                          <span>{post.saves || 0} saves</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: post.seller_name || 'Resort Post',
                                text: post.content,
                                url: window.location.href,
                              }).catch(() => {});
                            } else {
                              navigator.clipboard.writeText(window.location.href);
                              toast.success('Post link copied to clipboard!');
                            }
                          }}
                          className="flex items-center gap-1 text-gray-500 hover:text-pink-600 transition-colors cursor-pointer"
                          title="Share post"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                      <span className="text-gray-400 text-[11px]">
                        {getRelativeTime(post.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Social Links */}
      {activeTab === 'social' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Social Media & Contact Information</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Keep your contact and social channels up to date for tourists and guests.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-600" />
                Facebook Page Link
              </label>
              <input
                type="url"
                value={socialForm.facebook_link}
                onChange={e => setSocialForm({ ...socialForm, facebook_link: e.target.value })}
                placeholder="https://facebook.com/your-resort"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5 text-pink-600" />
                Instagram Link
              </label>
              <input
                type="url"
                value={socialForm.instagram_link}
                onChange={e => setSocialForm({ ...socialForm, instagram_link: e.target.value })}
                placeholder="https://instagram.com/your-resort"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                Contact Phone / Hotline
              </label>
              <input
                type="text"
                value={socialForm.phone}
                onChange={e => setSocialForm({ ...socialForm, phone: e.target.value })}
                placeholder="0912 345 6789"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                Barangay / Street Location
              </label>
              <input
                type="text"
                value={socialForm.address}
                onChange={e => setSocialForm({ ...socialForm, address: e.target.value })}
                placeholder="e.g. Coastal Road, Barangay Manaul"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={handleSaveSocial}
              disabled={savingSocial}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              {savingSocial ? 'Saving...' : 'Save Social Links'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
