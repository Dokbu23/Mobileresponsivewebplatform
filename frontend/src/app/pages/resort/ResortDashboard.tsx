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
  Upload,
  MapPin, 
  Clock, 
  Send, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink, 
  Share2, 
  Sparkles,
  Bed,
  Waves,
  Compass,
  Palmtree,
  Megaphone,
  Tag,
  Phone,
  Mail,
  Facebook,
  Instagram,
  CheckCircle2,
  X,
  Edit,
  Lock,
  Video,
  Film,
  Play,
  Sun,
  Sunset,
  Users,
  DollarSign,
  Check,
  Info,
  Minus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { getJSON, getPublicJSON, postJSON, putJSON, deleteJSON, getStorageUrl, API_BASE, getAuthToken } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { SubscriptionPaymentModal } from '../../components/SubscriptionPaymentModal';
import Swal from 'sweetalert2';
import { cleanTags } from '../tourist/BusinessProfile';
import { toast } from 'sonner';

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

interface ResortPost {
  id: string | number;
  type: string;
  title?: string;
  content: string;
  image?: string;
  images?: string[];
  video?: string;
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

// Interactive Gallery for Multi-Image Posts in Feed
function PostImageGallery({ images, badge, title }: { images: string[]; badge: { label: string; bg: string }; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div className="relative h-64 sm:h-80 w-full bg-gray-900 overflow-hidden group">
      <img
        src={currentImage}
        alt={title}
        className="w-full h-full object-cover transition-all duration-300"
      />
      {/* Category Badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      {/* Multiple Images Counter Badge */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}

      {/* Navigation Arrows if > 1 image */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Operating / Standard Hours Options (Matching Admin & Enterprise)
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
  'Check-in: 1:00 PM',
  'Check-in: 2:00 PM',
  'Check-in: 3:00 PM',
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
  '11:00 PM',
  '12:00 AM',
  'Check-out: 11:00 AM (Next Day)',
  'Check-out: 12:00 PM (Next Day)',
  'Check-out: 1:00 PM (Next Day)',
];

// Operating / Check-in Hours Preset Groups for Scrollable Dropdown
const RESORT_TIME_OPTIONS = [
  { category: '🌟 24/7 & Anytime', items: [
    'Open 24/7 (24 Hours Open)',
    '24/7 Check-in Available',
  ]},
  { category: '🏨 Overnight & Check-in / Out', items: [
    'Check-in: 2:00 PM — Check-out: 12:00 PM (Next Day)',
    'Check-in: 1:00 PM — Check-out: 11:00 AM (Next Day)',
    'Check-in: 3:00 PM — Check-out: 1:00 PM (Next Day)',
    'Overnight: 6:00 PM — 6:00 AM (Next Day)',
    'Night Swimming: 6:00 PM — 12:00 AM',
    'Night Swimming: 6:00 PM — 11:00 PM',
  ]},
  { category: '☀️ Day Tour Schedules', items: [
    'Day Tour: 6:00 AM — 6:00 PM',
    'Day Tour: 7:00 AM — 5:00 PM',
    'Day Tour: 8:00 AM — 5:00 PM',
    'Day Tour: 8:00 AM — 6:00 PM',
    'Day Tour: 8:00 AM — 8:00 PM',
  ]},
  { category: '🕒 Daily Operating Schedules', items: [
    'Open Daily: 6:00 AM — 8:00 PM',
    'Open Daily: 6:00 AM — 10:00 PM',
    'Open Daily: 7:00 AM — 7:00 PM',
    'Open Daily: 7:00 AM — 9:00 PM',
    'Open Daily: 8:00 AM — 8:00 PM',
    'Open Daily: 8:00 AM — 9:00 PM',
    'Open Daily: 8:00 AM — 10:00 PM',
    'Monday - Sunday: 8:00 AM — 6:00 PM',
    'Weekends Only: 8:00 AM — 6:00 PM',
  ]},
];

export function ResortDashboard() {
  const navigate = useNavigate();
  const { currentUser, getWishlistCount, wishlistCounts } = useApp();
  const [resortProfile, setResortProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  // Time dropdown open state
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [openDropdownActive, setOpenDropdownActive] = useState(false);
  const [closeDropdownActive, setCloseDropdownActive] = useState(false);
  const openDropdownRef = useRef<HTMLDivElement | null>(null);
  const closeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [timeMode, setTimeMode] = useState<'standard' | 'preset'>('standard');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdownRef.current && !openDropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownActive(false);
      }
      if (closeDropdownRef.current && !closeDropdownRef.current.contains(event.target as Node)) {
        setCloseDropdownActive(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setTimeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active tab state: 'posts' | 'social'
  const [activeTab, setActiveTab] = useState<'posts' | 'social'>('posts');

  // Posts Feed state (from real database)
  const [posts, setPosts] = useState<ResortPost[]>([]);

  // Create Post Form State
  const [postType, setPostType] = useState<string>('rooms');
  const [postContent, setPostContent] = useState('');
  const [postImageFiles, setPostImageFiles] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);

  // Post form fields
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [stock, setStock] = useState('');
  const [promoNote, setPromoNote] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Context-specific form states
  // 1. Rooms & Stays specific
  const [roomTypeName, setRoomTypeName] = useState('');
  const [maxGuests, setMaxGuests] = useState<number>(4);
  const [bedConfig, setBedConfig] = useState<string>('1 King Bed');

  // 2. Amenities specific
  const [amenityTypes, setAmenityTypes] = useState<string[]>(['Pool', 'Wi-Fi']);
  const [amenityAvailability, setAmenityAvailability] = useState<'public' | 'overnight'>('public');
  const [amenityHours, setAmenityHours] = useState('6:00 AM - 10:00 PM');

  // 3. Activities specific
  const [activityName, setActivityName] = useState('');
  const [activityInclusions, setActivityInclusions] = useState('');
  const [activityPricingType, setActivityPricingType] = useState<'free' | 'paid'>('free');

  // 4. Beach Views specific
  const [beachViewLocation, setBeachViewLocation] = useState('From the room balcony');
  const [beachTimeOfDay, setBeachTimeOfDay] = useState<string>('🌅 Sunrise');

  // Common tags state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to toggle a tag on/off
  const handleToggleTag = (tagVal: string) => {
    if (tags.includes(tagVal)) {
      setTags(tags.filter(t => t !== tagVal));
    } else {
      setTags([...tags, tagVal]);
    }
  };

  // Helper to toggle amenity multi-select tag
  const handleToggleAmenityType = (amenity: string) => {
    if (amenityTypes.includes(amenity)) {
      setAmenityTypes(amenityTypes.filter(a => a !== amenity));
    } else {
      setAmenityTypes([...amenityTypes, amenity]);
    }
  };

  // Social links form state
  const [socialForm, setSocialForm] = useState({
    facebook_link: '',
    instagram_link: '',
    phone: '',
    address: '',
    barangay: 'Coastal Road',
  });
  const [savingSocial, setSavingSocial] = useState(false);

  // Post Type Options (Rooms, Amenities, Activities, Beach Views)
  const postTypes = [
    { key: 'rooms', label: 'Rooms & Stays', icon: Bed, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { key: 'amenities', label: 'Amenities', icon: Waves, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { key: 'activities', label: 'Activities', icon: Compass, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { key: 'beach_views', label: 'Beach Views', icon: Palmtree, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  ];

  // Contextual configurations per post form
  const POST_CONTEXTS: Record<string, {
    key: string;
    label: string;
    title: string;
    subtitle: string;
    photoTip: string;
    icon: any;
    themeBorder: string;
    themeBg: string;
    themeText: string;
    placeholder: string;
    priceLabel: string;
    pricePlaceholder: string;
    showPrice: boolean;
    showAvailability: boolean;
    showCheckInOut: boolean;
    showOperatingHours: boolean;
    suggestedTags: string[];
  }> = {
    rooms: {
      key: 'rooms',
      label: 'Rooms & Stays',
      title: 'Rooms & Stays',
      subtitle: 'When this button is active, the goal is to get booking details.',
      photoTip: 'Upload photos of room interior, bed setup, bathroom, and balcony views.',
      icon: Bed,
      themeBorder: 'border-purple-200',
      themeBg: 'bg-purple-50/70',
      themeText: 'text-purple-700',
      placeholder: 'e.g., Relax in our Deluxe Oceanfront Suite featuring panoramic sea views, air conditioning, and complimentary breakfast...',
      priceLabel: 'Rate per night (₱)',
      pricePlaceholder: 'Rate per night (e.g. ₱3,500)',
      showPrice: true,
      showAvailability: true,
      showCheckInOut: true,
      showOperatingHours: false,
      suggestedTags: ['Air-Conditioned', 'Private Bathroom', 'Hot & Cold Shower', 'Balcony / Terrace', 'Free Breakfast', 'Smart TV', 'Ocean View', 'Wi-Fi'],
    },
    amenities: {
      key: 'amenities',
      label: 'Amenities',
      title: 'Amenities',
      subtitle: 'When this button is active, focus on the facility details and rules.',
      photoTip: 'Upload photos of the swimming pool, restaurant, parking area, grill stations, or beach lounge chairs.',
      icon: Waves,
      themeBorder: 'border-cyan-200',
      themeBg: 'bg-cyan-50/70',
      themeText: 'text-cyan-700',
      placeholder: 'e.g., Cool off in our infinity pool or enjoy fresh seaside dining at our open-air restaurant. Free high-speed Wi-Fi is accessible property-wide...',
      priceLabel: 'Entrance Fee / Day Tour Fee (₱)',
      pricePlaceholder: 'Leave blank if free, or e.g. ₱150',
      showPrice: true,
      showAvailability: false,
      showCheckInOut: false,
      showOperatingHours: true,
      suggestedTags: ['Pool', 'Wi-Fi', 'Restaurant', 'Parking', 'Bar', 'Grill & BBQ Area', 'Beach Chairs', 'Pet-friendly', 'Wheelchair accessible'],
    },
    activities: {
      key: 'activities',
      label: 'Activities',
      title: 'Activities',
      subtitle: 'When this button is active, capture the details of the experience.',
      photoTip: 'Upload photos of people kayaking, snorkeling, island hopping, or enjoying a beach bonfire.',
      icon: Compass,
      themeBorder: 'border-emerald-200',
      themeBg: 'bg-emerald-50/70',
      themeText: 'text-emerald-700',
      placeholder: 'e.g., Explore the marine life of Mansalay! We offer guided snorkeling tours daily. Kayaks and paddleboards are free for overnight guests...',
      priceLabel: 'Activity Fee / Rental Rate (₱)',
      pricePlaceholder: 'Activity Fee / Rental Rate (e.g. ₱500/person or ₱1,200/rental)',
      showPrice: true,
      showAvailability: false,
      showCheckInOut: false,
      showOperatingHours: false,
      suggestedTags: ['Guided Snorkeling Tour', 'Kayak Rental', 'Island Hopping', 'Beach Bonfire', 'Beach Volleyball', 'Paddleboarding'],
    },
    beach_views: {
      key: 'beach_views',
      label: 'Beach Views',
      title: 'Beach Views',
      subtitle: 'Since this is purely visual for marketing and aesthetics, keep it simple so owners can post quickly.',
      photoTip: 'Upload high-quality photos of the actual beach, sunrise/sunset shots, or views captured directly from a room window or balcony.',
      icon: Palmtree,
      themeBorder: 'border-rose-200',
      themeBg: 'bg-rose-50/70',
      themeText: 'text-rose-700',
      placeholder: 'e.g., Wake up to this spectacular sunrise over Mansalay bay. This is the actual view from our Beachfront Casitas...',
      priceLabel: '',
      pricePlaceholder: '',
      showPrice: false,
      showAvailability: false,
      showCheckInOut: false,
      showOperatingHours: false,
      suggestedTags: ['From the room balcony', 'Directly on the beach', 'From the restaurant', 'Cliffside viewpoint', 'Sunrise', 'Sunset', 'Daytime'],
    },
  };

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

  // Multi-Image Selection Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 15MB limit`);
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setPostImageFiles(prev => [...prev, ...validFiles]);
    setPostImagePreviews(prev => [...prev, ...validPreviews]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove?: number) => {
    if (typeof indexToRemove === 'number') {
      setPostImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
      setPostImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
    } else {
      setPostImageFiles([]);
      setPostImagePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

    if (!postContent.trim() && postImageFiles.length === 0) {
      toast.error('Please write a caption or upload an image for your post');
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

      // Context-aware Content / Title
      let finalContent = postContent.trim();
      if (postType === 'rooms' && roomTypeName.trim()) {
        finalContent = `${roomTypeName.trim()}${finalContent ? ` — ${finalContent}` : ''}`;
      } else if (postType === 'activities' && activityName.trim()) {
        finalContent = `${activityName.trim()}${finalContent ? ` — ${finalContent}` : ''}`;
      } else if (!finalContent) {
        finalContent = `${POST_CONTEXTS[postType]?.title || 'Resort'} updates and highlights!`;
      }

      formData.append('type', postType);
      formData.append('content', finalContent);
      formData.append('location', location.trim());

      const resortName = resortProfile?.resort_name || currentUser?.resort_name || currentUser?.name || 'Resort';
      formData.append('seller_name', resortName);

      // Context-aware Price
      if (postType === 'beach_views') {
        // No price field for beach scenery (hidden completely)
      } else if (postType === 'activities') {
        if (activityPricingType === 'free') {
          formData.append('price', 'Free for guests');
        } else if (price.trim()) {
          formData.append('price', price.trim());
        }
      } else if (postType === 'amenities') {
        if (price.trim()) {
          formData.append('price', price.trim());
        }
      } else if (price.trim()) {
        formData.append('price', price.trim());
      }

      // Context-aware Hours / Schedule
      if (postType === 'rooms') {
        if (businessHours.trim()) formData.append('business_hours', businessHours.trim());
      } else if (postType === 'amenities') {
        const hours = amenityHours.trim() || businessHours.trim();
        if (hours) formData.append('business_hours', hours);
      } else if (postType === 'activities') {
        if (activityInclusions.trim()) {
          formData.append('business_hours', `Inclusions: ${activityInclusions.trim()}`);
        }
      }

      // Stock / Availability
      if (postType === 'rooms' && stock.trim()) {
        formData.append('stock', stock.trim());
      }

      // Context-aware Tags
      const allTags = [...tags];

      if (postType === 'beach_views') {
        if (beachViewLocation && !allTags.includes(beachViewLocation)) allTags.push(beachViewLocation);
        if (beachTimeOfDay && !allTags.includes(beachTimeOfDay)) allTags.push(beachTimeOfDay);
      } else if (postType === 'activities') {
        if (activityName.trim() && !allTags.includes(activityName.trim())) allTags.push(activityName.trim());
        const costTag = activityPricingType === 'free' ? 'Free for guests' : 'Paid Activity';
        if (!allTags.includes(costTag)) allTags.push(costTag);
        if (activityInclusions.trim() && !allTags.includes(`Inclusions: ${activityInclusions.trim()}`)) {
          allTags.push(`Inclusions: ${activityInclusions.trim()}`);
        }
      } else if (postType === 'rooms') {
        if (roomTypeName.trim() && !allTags.includes(roomTypeName.trim())) allTags.push(roomTypeName.trim());
        const guestsTag = `${maxGuests} ${maxGuests === 1 ? 'Guest' : 'Guests'}`;
        if (!allTags.includes(guestsTag)) allTags.push(guestsTag);
        if (bedConfig && !allTags.includes(bedConfig)) allTags.push(bedConfig);
      } else if (postType === 'amenities') {
        amenityTypes.forEach(a => {
          if (!allTags.includes(a)) allTags.push(a);
        });
        const availTag = amenityAvailability === 'public' ? 'Open to public / Day tour' : 'Exclusive for overnight guests';
        if (!allTags.includes(availTag)) allTags.push(availTag);
      }

      if (promoNote.trim() && !allTags.includes(promoNote.trim())) {
        allTags.push(promoNote.trim());
      }

      if (allTags.length > 0) {
        formData.append('tags', JSON.stringify(allTags));
      }

      if (postImageFiles.length > 0) {
        postImageFiles.forEach((file) => {
          formData.append('images[]', file);
        });
        formData.append('image', postImageFiles[0]);
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
      setOpenTime('');
      setCloseTime('');
      setStock('');
      setPromoNote('');
      setRoomTypeName('');
      setMaxGuests(4);
      setBedConfig('1 King Bed');
      setAmenityTypes(['Pool', 'Wi-Fi']);
      setAmenityAvailability('public');
      setAmenityHours('6:00 AM - 10:00 PM');
      setActivityName('');
      setActivityInclusions('');
      setActivityPricingType('free');
      setBeachViewLocation('From the room balcony');
      setBeachTimeOfDay('🌅 Sunrise');
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

        {/* Analytics & Save */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center mb-3">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(dbStats?.wishlist_saves ?? totalSaves).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Analytics & Save</div>
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

          {/* Contextual Form Guidance Header (Auto-adapts to selected post type) */}
          {(() => {
            const currentCtx = POST_CONTEXTS[postType] || POST_CONTEXTS.rooms;
            const ContextIcon = currentCtx.icon;
            return (
              <div className={`p-3.5 rounded-2xl border ${currentCtx.themeBorder} ${currentCtx.themeBg} transition-all flex items-start sm:items-center justify-between gap-3 shadow-2xs`}>
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs flex-shrink-0 ${currentCtx.themeText}`}>
                    <ContextIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${currentCtx.themeText} flex items-center gap-1.5`}>
                      <span>{currentCtx.title}</span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-white/90 shadow-2xs">
                        Custom Form
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                      {currentCtx.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Photo Upload Area (Multiple Images Supported) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Images / Photo Gallery <span className="text-pink-500 font-semibold">(Multiple images allowed)</span>
              </label>
              <span className="text-[11px] text-gray-500 italic hidden sm:inline">
                {POST_CONTEXTS[postType]?.photoTip}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />

            {postImagePreviews.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-pink-500" />
                    <span>Selected Photos ({postImagePreviews.length})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage()}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Multi-Image Thumbnails Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {postImagePreviews.map((previewUrl, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-900 shadow-xs">
                      <img
                        src={previewUrl}
                        alt={`Selected preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/90 text-white p-1 rounded-full backdrop-blur-xs transition-all opacity-90 group-hover:opacity-100 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more tile */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/40 hover:bg-pink-50/80 rounded-xl flex flex-col items-center justify-center p-3 text-pink-600 aspect-square transition-all cursor-pointer group"
                  >
                    <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold">Add More</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-pink-400 rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-pink-50/20 transition-all cursor-pointer relative group"
              >
                <Upload className="h-8 w-8 text-gray-400 group-hover:text-pink-500 mx-auto mb-2 transition-colors" />
                <p className="text-xs font-bold text-gray-700">Click to upload multiple images</p>
                <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                  {POST_CONTEXTS[postType]?.photoTip}
                </p>
              </div>
            )}
          </div>

          {/* Tip to configure Cover Video in My Shop Profile */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 bg-gradient-to-r from-pink-50/70 to-rose-50/50 border border-pink-100 rounded-2xl text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center flex-shrink-0">
                <Video className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-gray-600">
                Gusto mo bang maglagay ng Cover Video para sa iyong resort? I-upload ito sa <strong className="text-gray-900">My Shop Profile</strong>.
              </span>
            </div>
            <Link
              to={`/business/resort/${currentUser?.id ?? ''}?manage=true`}
              className="px-3.5 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold text-[11px] shadow-xs hover:shadow transition-all whitespace-nowrap"
            >
              Open My Shop Profile
            </Link>
          </div>

          {/* Caption Textarea (Contextual Placeholder) */}
          <div>
            <textarea
              rows={3}
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder={POST_CONTEXTS[postType]?.placeholder || 'Write a caption for your post...'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-xs sm:text-sm placeholder:text-gray-400 resize-none transition-all leading-relaxed"
            />
            <p className="text-[10px] text-gray-400 mt-1 italic">
              💡 {POST_CONTEXTS[postType]?.subtitle}
            </p>
          </div>

          {/* Permanent Anchor 1: Auto-filled Resort Name Banner */}
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <span>{resortProfile?.resort_name || currentUser?.resort_name || currentUser?.name || 'MB Hiraya Beach Resort'}</span>
            </div>
            <span className="text-emerald-700 text-xs font-semibold">
              Auto-filled
            </span>
          </div>

          {/* Permanent Anchor 2 & Dynamic Price Row */}
          <div className={`grid grid-cols-1 ${postType !== 'beach_views' ? 'sm:grid-cols-2' : ''} gap-3`}>
            {/* Permanent Anchor 2: Location/Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-pink-500" />
                  Location / Address
                </span>
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded">
                  Required
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Specific location / address (e.g. Don Pedro, Mansalay)"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-xs bg-white"
                />
              </div>
            </div>

            {/* Dynamic Price Field (Customized per form, Hidden completely for Beach Views) */}
            {postType !== 'beach_views' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-pink-500" />
                    {postType === 'rooms'
                      ? 'Rate per night (₱)'
                      : postType === 'amenities'
                      ? 'Entrance Fee / Day Tour Fee (₱)'
                      : 'Activity Fee / Rental Rate (₱)'}
                  </span>
                  {postType === 'amenities' && (
                    <span className="text-[10px] text-gray-400 font-normal italic">Leave blank if free</span>
                  )}
                  {postType === 'activities' && activityPricingType === 'free' && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">Complimentary</span>
                  )}
                </label>

                {postType === 'activities' && activityPricingType === 'free' ? (
                  <div className="px-3.5 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Free for guests (No fee charged)</span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-bold text-xs text-gray-400 select-none">
                      ₱
                    </div>
                    <input
                      type="text"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder={
                        postType === 'rooms'
                          ? 'Rate per night (e.g. ₱3,500)'
                          : postType === 'amenities'
                          ? 'Leave blank if free, or e.g. ₱150'
                          : 'Activity Fee / Rental Rate (e.g. ₱500/person)'
                      }
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-xs bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════
              CONTEXT-SPECIFIC DYNAMIC CONTROLS (Direct in Form)
             ═══════════════════════════════════════════════════ */}

          {/* 1. ROOMS & STAYS DYNAMIC FIELDS */}
          {postType === 'rooms' && (
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-3.5 animate-in fade-in duration-200">
              {/* Room Type / Name (Text Input) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-purple-600" />
                  <span>Room Type / Name (Text Input)</span>
                </label>
                <input
                  type="text"
                  value={roomTypeName}
                  onChange={e => setRoomTypeName(e.target.value)}
                  placeholder='e.g., "Deluxe Oceanfront Suite"'
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Max Guests (Number Counter) & Bed Configuration (Dropdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Max Guests (Number Counter) */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Max Guests (Number Counter)</span>
                  </label>
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMaxGuests(prev => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-gray-900">
                      {maxGuests} {maxGuests === 1 ? 'Guest' : 'Guests'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaxGuests(prev => Math.min(30, prev + 1))}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bed Configuration (Dropdown) */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-purple-600" />
                    <span>Bed Configuration (Dropdown)</span>
                  </label>
                  <select
                    value={bedConfig}
                    onChange={e => setBedConfig(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="1 King Bed">1 King Bed</option>
                    <option value="2 Queen Beds">2 Queen Beds</option>
                    <option value="1 Queen Bed">1 Queen Bed</option>
                    <option value="2 Single Beds">2 Single Beds</option>
                    <option value="1 Double Bed">1 Double Bed</option>
                    <option value="Bunk Beds">Bunk Beds</option>
                    <option value="1 King Bed + 1 Single Bed">1 King Bed + 1 Single Bed</option>
                    <option value="Family Suite (3+ Beds)">Family Suite (3+ Beds)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. AMENITIES DYNAMIC FIELDS */}
          {postType === 'amenities' && (
            <div className="p-4 bg-cyan-50/60 rounded-2xl border border-cyan-200/80 space-y-3.5 animate-in fade-in duration-200">
              {/* Amenity Type (Multi-select tags) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Amenity Type (Multi-select tags)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Pool', 'Wi-Fi', 'Restaurant', 'Parking', 'Bar', 'Grill Station', 'Beach Chairs', 'Kids Playground'].map((item) => {
                    const isSelected = amenityTypes.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleAmenityType(item)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs font-bold'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50'
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-gray-400" />}
                        <span>[{item}]</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability (Toggle switches) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Availability (Toggle switches)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAmenityAvailability('public')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      amenityAvailability === 'public'
                        ? 'bg-white text-cyan-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🏖️ Open to public / Day tour
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmenityAvailability('overnight')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      amenityAvailability === 'overnight'
                        ? 'bg-white text-cyan-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🔒 Exclusive for overnight guests
                  </button>
                </div>
              </div>

              {/* Operating Hours (Text Input) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Operating Hours (Text Input)</span>
                </label>
                <input
                  type="text"
                  value={amenityHours}
                  onChange={e => setAmenityHours(e.target.value)}
                  placeholder='e.g., "6:00 AM - 10:00 PM"'
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-cyan-500 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* 3. ACTIVITIES DYNAMIC FIELDS */}
          {postType === 'activities' && (
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3.5 animate-in fade-in duration-200">
              {/* Activity Name (Text Input) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Activity Name (Text Input)</span>
                </label>
                <input
                  type="text"
                  value={activityName}
                  onChange={e => setActivityName(e.target.value)}
                  placeholder='e.g., "Guided Snorkeling Tour" or "Kayak Rental"'
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Inclusions (Text Input) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Inclusions (Text Input)</span>
                </label>
                <input
                  type="text"
                  value={activityInclusions}
                  onChange={e => setActivityInclusions(e.target.value)}
                  placeholder='e.g., "Includes life vest, paddles, and tour guide"'
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Pricing Type (Toggle switch) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pricing Type (Toggle switch)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setActivityPricingType('free');
                      setPrice('');
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activityPricingType === 'free'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✨ Free for guests
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityPricingType('paid')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activityPricingType === 'paid'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    💳 Paid Activity
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. BEACH VIEWS DYNAMIC FIELDS */}
          {postType === 'beach_views' && (
            <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-3.5 animate-in fade-in duration-200">
              {/* View Location (Dropdown or Tags) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <Palmtree className="w-3.5 h-3.5 text-rose-500" />
                  <span>View Location (Dropdown or Tags) — Where was the photo taken?</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'From the room balcony',
                    'Directly on the beach',
                    'From the restaurant',
                    'Cliffside viewpoint',
                    'Ocean horizon',
                  ].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setBeachViewLocation(loc)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                        beachViewLocation === loc
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs font-bold scale-[1.02]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                    >
                      [{loc}]
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day (Tags) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Time of Day (Tags)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['🌅 Sunrise', '🌇 Sunset', '☀️ Daytime', '🌌 Night / Stargazing'].map((tod) => (
                    <button
                      key={tod}
                      type="button"
                      onClick={() => setBeachTimeOfDay(tod)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                        beachTimeOfDay === tod
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs font-bold scale-[1.02]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                      }`}
                    >
                      {tod}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-rose-100 text-xs text-rose-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>Price field is hidden completely for Beach Views (purely visual for marketing and aesthetics).</span>
              </div>
            </div>
          )}

          {/* Quick Context-Specific Tag Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <Tag className="w-3 h-3 text-pink-500" />
                <span>Quick {POST_CONTEXTS[postType]?.title} Tags <span className="font-normal text-gray-400">(Click to toggle)</span>:</span>
              </label>
              {tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTags([])}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear tags ({tags.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POST_CONTEXTS[postType]?.suggestedTags.map((st) => {
                const isSelected = tags.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleToggleTag(st)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-pink-500 text-white border-pink-500 font-bold shadow-2xs'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-gray-400" />}
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show More Details Accordion (Tailored per form context) */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 py-1 cursor-pointer"
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
              <div className="mt-3 p-4 bg-gray-50/80 rounded-xl border border-gray-100 space-y-3.5">
                
                {/* 1. ROOMS & STAYS: Check-In/Out & Inventory */}
                {postType === 'rooms' && (
                  <>
                    {/* Operating / Business Hours Section */}
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-pink-500" />
                          <span>Check-In & Check-Out Schedule <span className="text-gray-400 font-normal">(Optional)</span></span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTimeMode(timeMode === 'standard' ? 'preset' : 'standard')}
                            className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 transition-colors cursor-pointer"
                          >
                            {timeMode === 'standard' ? 'Switch to Check-In/Out Presets' : 'Switch to Standard AM-PM Hours'}
                          </button>
                          {businessHours && (
                            <button
                              type="button"
                              onClick={() => {
                                setBusinessHours('');
                                setOpenTime('');
                                setCloseTime('');
                              }}
                              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {timeMode === 'standard' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Opening Time Custom Dropdown */}
                          <div ref={openDropdownRef} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownActive((prev) => !prev);
                                setCloseDropdownActive(false);
                              }}
                              className={`w-full pl-3.5 pr-3 py-2.5 bg-white border rounded-xl text-xs font-semibold text-gray-800 text-left flex items-center justify-between shadow-2xs transition-all cursor-pointer ${
                                openDropdownActive ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 hover:border-pink-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Clock className="h-4 w-4 text-pink-500 flex-shrink-0" />
                                <span className={openTime ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                  {openTime || 'Check-in Time (e.g. 2:00 PM)'}
                                </span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                                  openDropdownActive ? 'rotate-180 text-pink-500' : ''
                                }`}
                              />
                            </button>

                            {openDropdownActive && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl p-1 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-1.5 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-gray-100">
                                  Select Check-in Time
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
                                          setBusinessHours(`Check-in: ${t} — Check-out: ${closeTime || '12:00 PM'}`);
                                        }
                                        setOpenDropdownActive(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
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
                              className={`w-full pl-3.5 pr-3 py-2.5 bg-white border rounded-xl text-xs font-semibold text-gray-800 text-left flex items-center justify-between shadow-2xs transition-all cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
                                closeDropdownActive ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200 hover:border-rose-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Clock className="h-4 w-4 text-rose-500 flex-shrink-0" />
                                <span className={closeTime ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                  {openTime === 'Open 24 Hours' ? 'N/A (24 Hours)' : closeTime || 'Check-out Time (e.g. 12:00 PM)'}
                                </span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                                  closeDropdownActive ? 'rotate-180 text-rose-500' : ''
                                }`}
                              />
                            </button>

                            {closeDropdownActive && openTime !== 'Open 24 Hours' && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl p-1 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-1.5 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-gray-100">
                                  Select Check-out Time
                                </div>
                                <div className="py-1 space-y-0.5">
                                  {CLOSE_TIME_OPTIONS.map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => {
                                        setCloseTime(t);
                                        if (openTime && openTime !== 'Open 24 Hours') {
                                          setBusinessHours(`Check-in: ${openTime} — Check-out: ${t}`);
                                        }
                                        setCloseDropdownActive(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
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
                      ) : (
                        /* Resort Check-in/out Presets Dropdown */
                        <div className="relative" ref={timeDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500 flex items-center justify-between text-left transition-all hover:border-pink-300 cursor-pointer shadow-2xs"
                          >
                            <span className={businessHours ? 'text-gray-900 font-bold truncate' : 'text-gray-400'}>
                              {businessHours || 'Select check-in / check-out preset...'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ml-1.5 ${timeDropdownOpen ? 'rotate-180 text-pink-500' : ''}`} />
                          </button>

                          {timeDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                              <div className="max-h-60 overflow-y-auto p-1.5 space-y-2 scrollbar-thin">
                                {RESORT_TIME_OPTIONS.map((group, gIdx) => (
                                  <div key={gIdx} className="space-y-0.5">
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/90 rounded-md">
                                      {group.category}
                                    </div>
                                    {group.items.map((opt, oIdx) => {
                                      const isSelected = businessHours === opt;
                                      return (
                                        <button
                                          key={oIdx}
                                          type="button"
                                          onClick={() => {
                                            setBusinessHours(opt);
                                            setTimeDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                            isSelected
                                              ? 'bg-pink-50 text-pink-700 font-semibold'
                                              : 'hover:bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          <span>{opt}</span>
                                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-pink-600 flex-shrink-0 ml-2" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Preset Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presets:</span>
                        {[
                          'Check-in: 2:00 PM — Check-out: 12:00 PM (Next Day)',
                          'Check-in: 1:00 PM — Check-out: 11:00 AM (Next Day)',
                          'Overnight: 6:00 PM — 6:00 AM',
                          'Open 24 Hours',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setBusinessHours(preset);
                              if (preset === 'Open 24 Hours') {
                                setOpenTime('Open 24 Hours');
                                setCloseTime('');
                              }
                            }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                              businessHours === preset
                                ? 'bg-pink-100/80 border-pink-300 text-pink-700 font-bold'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-pink-50/50 hover:border-pink-200 hover:text-pink-600'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {businessHours && (
                        <p className="text-[11px] text-pink-600 font-bold mt-1 flex items-center gap-1.5">
                          <span>⏰ Selected Schedule:</span>
                          <span className="bg-pink-50 px-2.5 py-0.5 rounded-md border border-pink-200 text-pink-700 font-semibold shadow-2xs">
                            {businessHours}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Room Availability / Units
                        </label>
                        <input
                          type="text"
                          value={stock}
                          onChange={e => setStock(e.target.value)}
                          placeholder="e.g. 5 casitas available"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Guest Capacity
                        </label>
                        <input
                          type="text"
                          value={roomCapacity}
                          onChange={e => setRoomCapacity(e.target.value)}
                          placeholder="e.g. Max 2-4 Guests / 2 Queen Beds"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 2. AMENITIES: Facility Operating Hours */}
                {postType === 'amenities' && (
                  <div className="space-y-2 pt-0.5">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Facility Operating Hours <span className="text-gray-400 font-normal">(e.g. Pool Open 6 AM – 10 PM)</span></span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Open 24 Hours',
                        '6:00 AM – 10:00 PM',
                        '7:00 AM – 9:00 PM',
                        '8:00 AM – 8:00 PM',
                        'Open Daily: 6:00 AM – 8:00 PM',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBusinessHours(preset)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            businessHours === preset
                              ? 'bg-cyan-500 text-white border-cyan-500 font-bold shadow-2xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-cyan-300 hover:bg-cyan-50/40'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={businessHours}
                      onChange={e => setBusinessHours(e.target.value)}
                      placeholder="Custom facility hours (e.g. Pool 6:00 AM – 10:00 PM, Restaurant 7:00 AM – 10:00 PM)"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {/* 3. ACTIVITIES: Schedule / Best Times */}
                {postType === 'activities' && (
                  <div className="space-y-2 pt-0.5">
                    <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Activity Schedule / Recommended Times</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Daily 6:00 AM – 5:00 PM',
                        'Best during High Tide',
                        'Sunrise Guided Tour (5:30 AM)',
                        'Sunset Tour (4:00 PM – 6:00 PM)',
                        'Available upon Guest Request',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setActivitySchedule(preset)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            activitySchedule === preset
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={activitySchedule}
                      onChange={e => setActivitySchedule(e.target.value)}
                      placeholder="e.g. Daily: 6:00 AM – 5:00 PM (Reservation required 1 hr ahead)"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Promo Code or Discount Badge (Clean single input) */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-pink-500" />
                    <span>Promo Code, Discount Badge, or Special Perk <span className="font-normal text-gray-400">(Optional)</span></span>
                  </label>
                  <input
                    type="text"
                    value={promoNote}
                    onChange={e => setPromoNote(e.target.value)}
                    placeholder="e.g. 20% OFF — Use code SUMMER20 or Free Welcome Drinks"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-500"
                  />
                </div>

                {/* Custom Tags & Hashtags Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Custom Tags & Hashtags
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
                          className="hover:text-pink-900 cursor-pointer"
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
                Create your first post above to showcase your resort rooms, amenities, and beach views!
              </p>
            </div>
          ) : (
            posts.map(post => {
              const badge = getBadgeStyle(post.type);
              const postImages: string[] = (() => {
                if (Array.isArray(post.images) && post.images.length > 0) {
                  return post.images.map(img => getStorageUrl(img));
                }
                if (post.image) {
                  return [getStorageUrl(post.image)];
                }
                return [];
              })();
              const videoUrl = post.video ? (post.video.startsWith('http') ? post.video : getStorageUrl(post.video)) : null;
              const ytEmbed = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
              const postTags = cleanTags(post.tags);

              return (
                <div
                  key={post.id}
                  className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all"
                >
                  {/* Post Video or Image with Category Badge */}
                  {videoUrl ? (
                    <div className="relative aspect-video max-h-80 w-full bg-black overflow-hidden">
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
                        <span className="px-3 py-1 bg-indigo-600/90 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" />
                          Virtual Video Tour
                        </span>
                      </div>
                    </div>
                  ) : postImages.length > 0 ? (
                    <PostImageGallery
                      images={postImages}
                      badge={badge}
                      title={post.content.slice(0, 30)}
                    />
                  ) : null}

                  {/* Post Body */}
                  <div className="p-5 space-y-3">
                    {postImages.length === 0 && !videoUrl && (
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
                          <span className="font-extrabold text-emerald-600 text-xs">₱</span>
                          {post.price.replace(/^₱\s*/, '')}
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
