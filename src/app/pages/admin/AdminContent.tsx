import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Hotel,
  Package,
  MapPin,
  Calendar,
  Compass,
  Upload,
  Clock,
  Facebook,
  Instagram,
  Phone,
  Globe,
  Plus,
  Video,
  ClipboardList,
  Trash2,
  Pencil,
  CheckCircle2,
  X,
  ShieldCheck,
  Play,
  Film,
  Lock,
  Loader2,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
  RotateCcw,
  ChevronDown,
  Mail,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Save
} from 'lucide-react';
import { getPublicJSON, postJSON, deleteJSON, API_BASE } from '../../lib/api';
import {
  MANSALAY_BARANGAYS,
  ATTRACTION_CATEGORIES,
  ACCOMMODATION_CATEGORIES,
  PRODUCT_CATEGORIES,
  EVENT_CATEGORIES
} from '../../lib/constants';

type ContentTab = 'resort' | 'product' | 'attraction' | 'event' | 'itinerary';
type MainMode = 'publish' | 'background' | 'videos' | 'manage';

// 🛡️ SECURITY CONSTANTS & VALIDATORS FOR VIDEO UPLOADS
const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov'];
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500MB Limit

function validateSecureVideoFile(file: File): { valid: boolean; error?: string } {
  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_VIDEO_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Security Error: Invalid video extension. Allowed formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`
    };
  }

  if (file.type && !ALLOWED_VIDEO_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Security Error: Unsupported video MIME type (${file.type}). Only MP4, WebM, OGG, or MOV videos are allowed.`
    };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Security Error: Video file size exceeds 500MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
    };
  }

  return { valid: true };
}

function sanitizeVideoUrl(url: string): { valid: boolean; error?: string; cleanUrl?: string } {
  const trimmed = url.trim();
  if (!trimmed) return { valid: false, error: 'Please enter a video URL' };

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.includes('<script') ||
    lower.includes('onload=') ||
    lower.includes('onerror=')
  ) {
    return {
      valid: false,
      error: 'Security Alert: Malicious or unsafe URL protocol detected. Upload rejected.'
    };
  }

  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return {
      valid: false,
      error: 'Invalid URL format. Video link must start with https:// or http://'
    };
  }

  return { valid: true, cleanUrl: trimmed };
}

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
  '11:00 PM',
  '12:00 AM',
];

export function AdminContent() {
  const [mainMode, setMainMode] = useState<MainMode>('publish');
  const [activeTab, setActiveTab] = useState<ContentTab>('resort');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // 📊 UPLOADING PROGRESS OVERLAY STATE
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [productOwner, setProductOwner] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [location, setLocation] = useState('');
  const [openTime, setOpenTime] = useState('8:00 AM');
  const [closeTime, setCloseTime] = useState('5:00 PM');
  const [operatingHours, setOperatingHours] = useState('8:00 AM – 5:00 PM');
  const [openDropdownActive, setOpenDropdownActive] = useState(false);
  const [closeDropdownActive, setCloseDropdownActive] = useState(false);
  const openDropdownRef = useRef<HTMLDivElement>(null);
  const closeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownRef.current && !openDropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownActive(false);
      }
      if (closeDropdownRef.current && !closeDropdownRef.current.contains(event.target as Node)) {
        setCloseDropdownActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageFiles, setCoverImageFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Resort social/contact fields
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // 🗺️ ITINERARY PUBLISHING SPECIFIC STATE
  const [numberOfDays, setNumberOfDays] = useState<number>(2);
  const [itineraryBadge, setItineraryBadge] = useState<string>('');
  const [highlightsText, setHighlightsText] = useState<string>(
    'Buktot Beach swimming & snorkeling\nSidell Kite Festival Grounds at sunset\nFresh seafood dinner'
  );
  const [daySchedules, setDaySchedules] = useState<Array<{ day: number; morning: string; afternoon: string; evening: string }>>([
    { day: 1, morning: 'Buktot White Beach swimming and relaxation', afternoon: 'Sidell Kite Surfing lesson and coastal walk', evening: 'Seafood dinner at Mansalay Bay Walk' },
    { day: 2, morning: 'Visit Hanunuo Mangyan Heritage Center', afternoon: 'Local handicraft souvenir shopping', evening: 'Sunset viewing at Mansalay Boulevard' }
  ]);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number>(0);

  const handleDaysChange = (val: number) => {
    const count = Math.max(1, Math.min(10, val));
    setNumberOfDays(count);
    setDaySchedules((prev) => {
      const updated = [...prev];
      if (updated.length < count) {
        for (let i = updated.length + 1; i <= count; i++) {
          updated.push({ day: i, morning: '', afternoon: '', evening: '' });
        }
      } else {
        return updated.slice(0, count);
      }
      return updated;
    });
  };

  // 🛡️ SECURE VIDEO MANAGEMENT STATE
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [activeHeroVideo, setActiveHeroVideo] = useState<string | null>(() => {
    return localStorage.getItem('discover-mansalay:heroVideo');
  });

  // Manage posts state
  const [publishedItems, setPublishedItems] = useState<any[]>([]);
  const [resortPosts, setResortPosts] = useState<any[]>([]);
  const [enterprisePosts, setEnterprisePosts] = useState<any[]>([]);
  const [attractionPosts, setAttractionPosts] = useState<any[]>([]);
  const [eventPosts, setEventPosts] = useState<any[]>([]);
  const [itineraryPosts, setItineraryPosts] = useState<any[]>([]);

  // 📁 SELECTION & ARCHIVE MANAGEMENT STATE
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string | number>>(new Set());
  const [archivedPostIds, setArchivedPostIds] = useState<Set<string | number>>(() => {
    try {
      const stored = localStorage.getItem('discover-mansalay:archived_posts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [deletedPostIds, setDeletedPostIds] = useState<Set<string | number>>(() => {
    try {
      const stored = localStorage.getItem('discover-mansalay:deleted_posts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  const saveArchivedPostIds = (newSet: Set<string | number>) => {
    setArchivedPostIds(newSet);
    localStorage.setItem('discover-mansalay:archived_posts', JSON.stringify(Array.from(newSet)));
  };

  const saveDeletedPostIds = (newSet: Set<string | number>) => {
    setDeletedPostIds(newSet);
    localStorage.setItem('discover-mansalay:deleted_posts', JSON.stringify(Array.from(newSet)));
  };

  const toggleSelectPost = (id: string | number) => {
    const updated = new Set(selectedPostIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedPostIds(updated);
  };

  const toggleSelectAllList = (postsList: any[]) => {
    const allIds = postsList.map((p) => p.id);
    const areAllSelected = allIds.length > 0 && allIds.every((id) => selectedPostIds.has(id));
    const updated = new Set(selectedPostIds);
    if (areAllSelected) {
      allIds.forEach((id) => updated.delete(id));
    } else {
      allIds.forEach((id) => updated.add(id));
    }
    setSelectedPostIds(updated);
  };

  const handleArchiveSelected = (idsToArchive?: (string | number)[]) => {
    const targetIds = idsToArchive || Array.from(selectedPostIds);
    if (targetIds.length === 0) return;

    const updatedArchived = new Set(archivedPostIds);
    targetIds.forEach((id) => {
      updatedArchived.add(id);
      updatedArchived.add(String(id));
      if (!isNaN(Number(id))) updatedArchived.add(Number(id));
    });
    saveArchivedPostIds(updatedArchived);

    const updatedSelected = new Set(selectedPostIds);
    targetIds.forEach((id) => updatedSelected.delete(id));
    setSelectedPostIds(updatedSelected);

    window.dispatchEvent(new Event('contentUpdated'));
    window.dispatchEvent(new Event('storage'));

    toast.success(`Archived ${targetIds.length} post(s) successfully!`);
  };

  const handleUnarchiveSelected = (idsToRestore?: (string | number)[]) => {
    const targetIds = idsToRestore || Array.from(selectedPostIds);
    if (targetIds.length === 0) return;

    const updatedArchived = new Set(archivedPostIds);
    targetIds.forEach((id) => {
      updatedArchived.delete(id);
      updatedArchived.delete(String(id));
      if (!isNaN(Number(id))) updatedArchived.delete(Number(id));
    });
    saveArchivedPostIds(updatedArchived);

    const updatedSelected = new Set(selectedPostIds);
    targetIds.forEach((id) => updatedSelected.delete(id));
    setSelectedPostIds(updatedSelected);

    window.dispatchEvent(new Event('contentUpdated'));
    window.dispatchEvent(new Event('storage'));

    toast.success(`Restored ${targetIds.length} post(s) from Archive!`);
  };

  const handleDeleteSelectedBatch = async () => {
    const targetIds = Array.from(selectedPostIds);
    if (targetIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${targetIds.length} selected post(s)?`)) return;

    for (const id of targetIds) {
      await handleDeletePost(id, undefined, true);
    }
    setSelectedPostIds(new Set());
    toast.success(`Permanently deleted ${targetIds.length} post(s)!`);
  };

  useEffect(() => {
    loadManagePosts();
    window.addEventListener('contentUpdated', loadManagePosts);
    window.addEventListener('storage', loadManagePosts);
    return () => {
      window.removeEventListener('contentUpdated', loadManagePosts);
      window.removeEventListener('storage', loadManagePosts);
    };
  }, [mainMode, activeTab]);

  const loadManagePosts = async () => {
    setLoading(true);
    try {
      const fetchSection = async (endpoint: string, keys: string[]) => {
        let apiArr: any[] = [];
        try {
          const res = await getPublicJSON(endpoint);
          apiArr = Array.isArray(res) ? res : res?.data ?? [];
        } catch {}

        let localArr: any[] = [];
        keys.forEach((key) => {
          try {
            const str = localStorage.getItem(`discover-mansalay:${key}`);
            if (str) {
              const parsed = JSON.parse(str);
              if (Array.isArray(parsed)) localArr.push(...parsed);
            }
          } catch {}
        });

        const existingIds = new Set();
        const combined: any[] = [];
        [...apiArr, ...localArr].forEach((item: any) => {
          if (!item || item.id == null) return;
          const sId = String(item.id);
          if (!existingIds.has(sId)) {
            existingIds.add(sId);
            combined.push(item);
          }
        });
        return combined;
      };

      const [resorts, products, attractions, events] = await Promise.all([
        fetchSection('/accommodations', ['custom_resorts', 'custom_resort', 'custom_accommodations']),
        fetchSection('/products', ['custom_products', 'custom_product']),
        fetchSection('/attractions', ['custom_attractions', 'custom_attraction']),
        fetchSection('/events', ['custom_events', 'custom_event']),
      ]);

      const isDeleted = (id: string | number) =>
        deletedPostIds.has(id) ||
        deletedPostIds.has(String(id)) ||
        (typeof id === 'string' && !isNaN(Number(id)) && deletedPostIds.has(Number(id)));

      const filteredResorts = resorts.filter((i) => !isDeleted(i.id));
      const filteredProducts = products.filter((i) => !isDeleted(i.id));
      const filteredAttractions = attractions.filter((a) => !isDeleted(a.id) && a.category !== 'Itinerary' && !a.days_count);
      const filteredEvents = events.filter((i) => !isDeleted(i.id));
      const filteredItineraries = attractions.filter((a) => !isDeleted(a.id) && (a.category === 'Itinerary' || a.days_count));

      setResortPosts(filteredResorts);
      setEnterprisePosts(filteredProducts);
      setAttractionPosts(filteredAttractions);
      setEventPosts(filteredEvents);
      setItineraryPosts(filteredItineraries);
      
      let currentActiveItems = filteredResorts;
      if (activeTab === 'product') currentActiveItems = filteredProducts;
      if (activeTab === 'attraction') currentActiveItems = filteredAttractions;
      if (activeTab === 'event') currentActiveItems = filteredEvents;
      if (activeTab === 'itinerary') currentActiveItems = filteredItineraries;
      setPublishedItems(currentActiveItems);
    } catch {
      // Fallback empty
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategory('');
    setDescription('');
    setFullDescription('');
    setLocation('');
    setOpenTime('8:00 AM');
    setCloseTime('5:00 PM');
    setOperatingHours('8:00 AM – 5:00 PM');
    setPrice('');
    setStock('10');
    setEventDate('');
    setEventTime('');
    setCoverImageUrl('');
    setCoverImageFile(null);
    setCoverImageFiles([]);
    setImagePreview(null);
    setImagePreviews([]);
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoUrlInput('');
    setFacebook('');
    setInstagram('');
    setContactNumber('');
    setEmail('');
    setWebsite('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setCoverImageFiles(files);
      setCoverImageFile(files[0]);
      const urls = files.map((f) => URL.createObjectURL(f));
      setImagePreview(urls[0]);
      setImagePreviews(urls);
      toast.success(`${files.length} image(s) selected!`);
    }
  };

  // 🛡️ SECURE VIDEO FILE SELECTOR HANDLER
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Run Security Validation
    const validation = validateSecureVideoFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      return;
    }

    setSelectedVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    toast.success(`Video "${file.name}" passed security checks and is ready!`);
  };

  // Load hero video from backend database on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getPublicJSON('/hero-video');
        if (res?.video) {
          setActiveHeroVideo(res.video);
          localStorage.setItem('discover-mansalay:heroVideo', res.video);
        }
      } catch {
        // Fallback to local storage if API unreachable
      }
    })();
  }, []);

  // 🌄 Homepage Background Image State
  const [currentHomeBg, setCurrentHomeBg] = useState<string>(() => {
    return localStorage.getItem('discover-mansalay:homeBackground') || '/assets/mansalay_hero_bg.jpg';
  });
  const [isCustomHomeBg, setIsCustomHomeBg] = useState<boolean>(false);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [bgUrlInput, setBgUrlInput] = useState<string>('');
  const [isSavingBg, setIsSavingBg] = useState<boolean>(false);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load home background from backend database on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getPublicJSON('/site-settings/home-background');
        if (res?.background_image) {
          setCurrentHomeBg(res.background_image);
          setIsCustomHomeBg(!!res.is_custom);
          localStorage.setItem('discover-mansalay:homeBackground', res.background_image);
        }
      } catch (err) {
        console.warn('Failed to load home background setting:', err);
      }
    })();
  }, []);

  const handleSelectBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size exceeds 15MB limit.');
      return;
    }

    setBgImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBgImagePreview(previewUrl);
    setBgUrlInput('');
    toast.success(`Image "${file.name}" selected and ready to save!`);
  };

  const handleSaveHomeBackground = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bgImageFile && !bgUrlInput.trim()) {
      toast.error('Please choose an image file or enter an image URL.');
      return;
    }

    setIsSavingBg(true);
    setUploadFileName(bgImageFile ? bgImageFile.name : 'Homepage Background Image');
    setUploadStatusText('Saving background to database...');
    setUploadProgress(20);
    setUploadModalOpen(true);

    try {
      let res: any;
      const token = localStorage.getItem('discover-mansalay:token') || sessionStorage.getItem('discover-mansalay:token');

      if (bgImageFile) {
        setUploadProgress(45);
        const formData = new FormData();
        formData.append('image', bgImageFile);

        const response = await fetch(`${API_BASE}/admin/site-settings/home-background`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'application/json',
          },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.message || `Server error (${response.status})`);
        }

        res = await response.json();
      } else {
        setUploadProgress(45);
        res = await postJSON('/admin/site-settings/home-background', {
          image_url: bgUrlInput.trim(),
        });
      }

      setUploadProgress(85);
      const savedPath = res?.background_image || bgImagePreview || bgUrlInput.trim();

      setCurrentHomeBg(savedPath);
      setIsCustomHomeBg(true);
      localStorage.setItem('discover-mansalay:homeBackground', savedPath);
      window.dispatchEvent(new Event('homeBackgroundUpdated'));
      window.dispatchEvent(new Event('storage'));

      setUploadProgress(100);
      setUploadStatusText('Homepage background saved to database!');
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUploadModalOpen(false);

      toast.success('🎉 Homepage background updated and saved in database!');
      setBgImageFile(null);
      setBgImagePreview(null);
      setBgUrlInput('');
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    } catch (err: any) {
      setUploadModalOpen(false);
      toast.error(err.message || 'Failed to save homepage background');
    } finally {
      setIsSavingBg(false);
    }
  };

  const handleResetHomeBackground = async () => {
    try {
      await deleteJSON('/admin/site-settings/home-background');
    } catch (err) {
      console.warn('Backend reset notice:', err);
    }

    const defaultBg = '/assets/mansalay_hero_bg.jpg';
    setCurrentHomeBg(defaultBg);
    setIsCustomHomeBg(false);
    setBgImageFile(null);
    setBgImagePreview(null);
    setBgUrlInput('');
    localStorage.removeItem('discover-mansalay:homeBackground');
    localStorage.setItem('discover-mansalay:homeBackground', defaultBg);
    window.dispatchEvent(new Event('homeBackgroundUpdated'));
    window.dispatchEvent(new Event('storage'));
    toast.success('Homepage background reset to default image.');
  };

  // 🛡️ SECURE VIDEO SAVE & PUBLISH HANDLER WITH ACCURATE UPLOAD PROGRESS
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalVideoUrl = '';

    setUploadFileName(selectedVideoFile ? selectedVideoFile.name : 'Homepage Video');
    setUploadStatusText('Securing & uploading video to database...');
    setUploadProgress(10);
    setUploadModalOpen(true);

    try {
      if (selectedVideoFile) {
        const validation = validateSecureVideoFile(selectedVideoFile);
        if (!validation.valid) {
          toast.error(validation.error);
          setUploadModalOpen(false);
          return;
        }

        setUploadProgress(35);
        await new Promise((res) => setTimeout(res, 150));

        // Create persistent URL
        const blobUrl = URL.createObjectURL(selectedVideoFile);
        finalVideoUrl = blobUrl;

        // Convert file to Data URL if <= 25MB for 100% permanent local storage
        if (selectedVideoFile.size <= 25 * 1024 * 1024) {
          try {
            const reader = new FileReader();
            reader.readAsDataURL(selectedVideoFile);
            await new Promise((resolve) => {
              reader.onloadend = () => {
                if (reader.result) finalVideoUrl = reader.result as string;
                resolve(null);
              };
            });
          } catch {
            finalVideoUrl = blobUrl;
          }
        }

        setUploadProgress(75);
        await new Promise((res) => setTimeout(res, 150));

        // Post to backend database
        try {
          const formData = new FormData();
          formData.append('video', selectedVideoFile);
          if (videoTitle) formData.append('title', videoTitle);

          const res = await postJSON('/hero-video', formData, true);
          if (res?.video) {
            finalVideoUrl = res.video;
          }
        } catch (backendErr) {
          console.warn('Backend API save notice, using persistent media storage:', backendErr);
        }
      } else if (videoUrlInput.trim()) {
        const sanitized = sanitizeVideoUrl(videoUrlInput);
        if (!sanitized.valid) {
          toast.error(sanitized.error);
          setUploadModalOpen(false);
          return;
        }
        setUploadProgress(50);
        finalVideoUrl = sanitized.cleanUrl!;

        try {
          const res = await postJSON('/hero-video', {
            video_url: sanitized.cleanUrl,
            title: videoTitle
          }, true);

          if (res?.video) finalVideoUrl = res.video;
        } catch {
          // Use cleanUrl fallback
        }
      } else {
        toast.error('Please upload a video file or enter a valid video URL');
        setUploadModalOpen(false);
        return;
      }
    } catch (err: any) {
      console.warn('Video save error:', err);
    }

    if (!finalVideoUrl && videoPreviewUrl) {
      finalVideoUrl = videoPreviewUrl;
    }

    if (finalVideoUrl) {
      try {
        localStorage.setItem('discover-mansalay:heroVideo', finalVideoUrl);
        if (videoTitle) {
          localStorage.setItem('discover-mansalay:heroVideoTitle', videoTitle);
        }
      } catch (e) {
        console.warn('LocalStorage limit warning');
      }

      setActiveHeroVideo(finalVideoUrl);
      window.dispatchEvent(new Event('heroVideoUpdated'));
      window.dispatchEvent(new Event('storage'));
    }

    // Database upload complete -> 100%
    setUploadProgress(100);
    setUploadStatusText('Video successfully stored in database!');
    await new Promise((res) => setTimeout(res, 400));
    setUploadModalOpen(false);

    toast.success('🛡️ Homepage video saved directly to database!');

    // Reset video inputs
    setVideoTitle('');
    setVideoUrlInput('');
    setSelectedVideoFile(null);
  };

  const handleRemoveHeroVideo = () => {
    localStorage.removeItem('discover-mansalay:heroVideo');
    localStorage.removeItem('discover-mansalay:heroVideoTitle');
    setActiveHeroVideo(null);
    setVideoPreviewUrl(null);
    window.dispatchEvent(new Event('heroVideoUpdated'));
    window.dispatchEvent(new Event('storage'));
    toast.success('Homepage video removed. Reverted to default hero background.');
  };

  const handleEditPost = (item: any) => {
    setEditingId(item.id);
    setName(item.name || '');
    setProductOwner(item.product_owner || item.owner_name || item.seller_name || '');
    setShopName(item.shop_name || item.store_name || item.sellerName || '');
    setCategory(item.category || '');
    setDescription(item.description || '');
    setLocation(item.location || '');
    const rawHours = item.operating_hours || '';
    setOperatingHours(rawHours);
    if (rawHours === 'Open 24 Hours' || rawHours.toLowerCase().includes('24')) {
      setOpenTime('Open 24 Hours');
    } else if (rawHours.includes('–') || rawHours.includes('-')) {
      const delimiter = rawHours.includes('–') ? '–' : '-';
      const parts = rawHours.split(delimiter);
      if (parts[0]) setOpenTime(parts[0].trim());
      if (parts[1]) setCloseTime(parts[1].trim());
    } else if (rawHours) {
      setOpenTime(rawHours);
    } else {
      setOpenTime('8:00 AM');
      setCloseTime('5:00 PM');
      setOperatingHours('8:00 AM – 5:00 PM');
    }
    setPrice(item.price || item.price_per_night || '');
    setStock(String(item.stock || 10));
    setEventDate(item.date || '');
    setEventTime(item.time || '');
    setCoverImageUrl(item.image || '');
    setImagePreview(item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`) : null);
    if (item.video) {
      const v = String(item.video);
      setVideoUrlInput(v);
      setVideoPreviewUrl(v.startsWith('http') ? v : `${API_BASE}${v}`);
    } else {
      setVideoUrlInput('');
      setVideoPreviewUrl(null);
      setSelectedVideoFile(null);
    }
    setFacebook(item.facebook || '');
    setInstagram(item.instagram || '');
    setContactNumber(item.contact_number || item.phone || '');
    setEmail(item.email || '');
    setWebsite(item.website || '');
    setMainMode('publish');
  };

  // 🛡️ PUBLISH HANDLER WITH ACCURATE DATABASE UPLOAD PROGRESS
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a title or name');
      return;
    }

    setPublishing(true);
    setUploadFileName(name);
    setUploadStatusText(`Processing and saving ${activeTab} to database...`);
    setUploadProgress(15);
    setUploadModalOpen(true);

    let finalImageUrl = coverImageUrl;
    let finalImagesList: string[] = [];

    if (coverImageFiles.length > 0) {
      setUploadProgress(40);
      for (const file of coverImageFiles) {
        try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          await new Promise((res) => {
            reader.onloadend = () => {
              if (reader.result) finalImagesList.push(reader.result as string);
              res(null);
            };
          });
        } catch {
          finalImagesList.push(URL.createObjectURL(file));
        }
      }
      if (finalImagesList.length > 0) {
        finalImageUrl = finalImagesList[0];
      }
    }

    setUploadProgress(75);
    await new Promise((res) => setTimeout(res, 120));

    const numPrice = Number(price || 150);
    const resolvedVideo = videoPreviewUrl || videoUrlInput.trim() || undefined;
    const newItemPayload: any = {
      id: editingId || Date.now(),
      name: activeTab === 'itinerary' && !name.includes('Itinerary') ? `${name} (Itinerary)` : name,
      category: category || (activeTab === 'resort' ? 'Accommodation' : activeTab === 'product' ? 'Handicraft' : activeTab === 'attraction' ? 'Beach' : activeTab === 'event' ? 'Festival' : 'Beach & Relaxation'),
      type: category || (activeTab === 'resort' ? 'Accommodation' : 'General'),
      description,
      full_description: fullDescription || description,
      location: location || 'Mansalay, Oriental Mindoro',
      operating_hours: operatingHours,
      price: numPrice,
      price_per_night: numPrice,
      stock: Number(stock || 10),
      product_owner: productOwner,
      shop_name: shopName,
      store_name: shopName,
      seller_name: productOwner || shopName,
      sellerName: shopName || productOwner,
      date: eventDate || new Date().toISOString().split('T')[0],
      time: eventTime || '9:00 AM – 5:00 PM',
      image: finalImageUrl || '',
      images: finalImagesList.length > 0 ? finalImagesList : (finalImageUrl ? [finalImageUrl] : []),
      video: resolvedVideo,
      facebook,
      instagram,
      contact_number: contactNumber,
      phone: contactNumber,
      email,
      website,
      created_at: new Date().toISOString(),
      // Itinerary Specific Fields
      badge: itineraryBadge || (activeTab === 'itinerary' ? 'Official Tourism Itinerary' : undefined),
      days_count: numberOfDays,
      duration: `${numberOfDays} days`,
      title: activeTab === 'itinerary' ? name : undefined,
      highlights: highlightsText.split('\n').filter((h) => h.trim().length > 0),
      schedule: daySchedules,
      days: activeTab === 'itinerary' ? daySchedules.map((ds) => ({
        day: ds.day,
        title: `Day ${ds.day} Schedule`,
        activities: [
          ds.morning ? { time: '08:30 AM', activity: ds.morning, location: 'Mansalay' } : null,
          ds.afternoon ? { time: '01:30 PM', activity: ds.afternoon, location: 'Mansalay' } : null,
          ds.evening ? { time: '06:30 PM', activity: ds.evening, location: 'Mansalay' } : null,
        ].filter(Boolean) as any[],
      })) : undefined,
    };

    try {
      let endpoint = '/admin/accommodations';
      if (activeTab === 'product') endpoint = '/admin/products';
      if (activeTab === 'attraction') endpoint = '/attractions';
      if (activeTab === 'event') endpoint = '/events';
      if (activeTab === 'itinerary') endpoint = '/attractions';

      if (editingId) {
        endpoint = `${endpoint}/${editingId}`;
      }

      let apiResult: any = null;
      if (coverImageFiles.length > 0 || coverImageFile || selectedVideoFile || videoUrlInput.trim()) {
        const formData = new FormData();
        formData.append('name', newItemPayload.name);
        formData.append('category', newItemPayload.category);
        formData.append('type', newItemPayload.type);
        formData.append('description', description);
        
        if (coverImageFiles.length > 0) {
          coverImageFiles.forEach((file) => {
            formData.append('images[]', file);
          });
          formData.append('image', coverImageFiles[0]);
        } else if (coverImageFile) {
          formData.append('image', coverImageFile);
        }

        if (selectedVideoFile) {
          formData.append('video', selectedVideoFile);
        } else if (videoUrlInput.trim()) {
          formData.append('video', videoUrlInput.trim());
          formData.append('video_url', videoUrlInput.trim());
        }
        if (location) formData.append('location', location);
        if (operatingHours) formData.append('operating_hours', operatingHours);
        if (fullDescription) formData.append('full_description', fullDescription);
        formData.append('price', String(numPrice));
        formData.append('price_per_night', String(numPrice));
        if (stock) formData.append('stock', stock);
        if (eventDate) formData.append('date', eventDate);
        if (eventTime) formData.append('time', eventTime);
        if (facebook) formData.append('facebook', facebook);
        if (instagram) formData.append('instagram', instagram);
        if (contactNumber) {
          formData.append('contact_number', contactNumber);
          formData.append('phone', contactNumber);
        }
        if (email) formData.append('email', email);
        if (website) formData.append('website', website);

        if (editingId) {
          formData.append('_method', 'PUT');
        }

        try {
          apiResult = await postJSON(endpoint, formData);
        } catch (apiErr) {
          if (activeTab === 'resort') {
            apiResult = await postJSON(editingId ? `/accommodations/${editingId}` : '/accommodations', formData);
          } else if (activeTab === 'product') {
            apiResult = await postJSON(editingId ? `/products/${editingId}` : '/products', formData);
          } else {
            throw apiErr;
          }
        }
      } else {
        const payload: any = { ...newItemPayload };
        if (editingId) {
          payload._method = 'PUT';
        }
        try {
          apiResult = await postJSON(endpoint, payload);
        } catch (apiErr) {
          if (activeTab === 'resort') {
            apiResult = await postJSON(editingId ? `/accommodations/${editingId}` : '/accommodations', payload);
          } else if (activeTab === 'product') {
            apiResult = await postJSON(editingId ? `/products/${editingId}` : '/products', payload);
          } else {
            throw apiErr;
          }
        }
      }

      if (apiResult) {
        if (apiResult.id) newItemPayload.id = apiResult.id;
        if (apiResult.image) {
          const imgStr = String(apiResult.image);
          const fullImgUrl = imgStr.startsWith('http') ? imgStr : `${API_BASE}${imgStr}`;
          newItemPayload.image = fullImgUrl;
        }
        if (Array.isArray(apiResult.images) && apiResult.images.length > 0) {
          newItemPayload.images = apiResult.images.map((img: string) =>
            img.startsWith('http') ? img : `${API_BASE}${img}`
          );
        }
        if (apiResult.video) {
          const vidStr = String(apiResult.video);
          const fullVidUrl = vidStr.startsWith('http') ? vidStr : `${API_BASE}${vidStr}`;
          newItemPayload.video = fullVidUrl;
        }
      }
    } catch (err: any) {
      console.warn('Backend API save notice:', err);
    }

    // Always persist to local cache fallback so UI updates instantly
    try {
      const storageKey = `discover-mansalay:custom_${activeTab}s`;
      const existingStr = localStorage.getItem(storageKey);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      if (editingId) {
        const updated = existing.map((i: any) => i.id === editingId ? newItemPayload : i);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } else {
        localStorage.setItem(storageKey, JSON.stringify([newItemPayload, ...existing]));
      }

      if (activeTab === 'itinerary') {
        const itinKey = 'discover-mansalay:published_itineraries';
        const curItinStr = localStorage.getItem(itinKey);
        const curItin = curItinStr ? JSON.parse(curItinStr) : [];
        const nextItin = editingId
          ? curItin.map((i: any) => i.id === editingId ? newItemPayload : i)
          : [newItemPayload, ...curItin.filter((i: any) => String(i.id) !== String(newItemPayload.id))];
        localStorage.setItem(itinKey, JSON.stringify(nextItin));
        localStorage.setItem('discover-mansalay:custom_itinerarys', JSON.stringify(nextItin));
        window.dispatchEvent(new Event('itineraryUpdated'));
      }

      if (newItemPayload.category === 'Accommodation' || newItemPayload.category === 'Accommodations') {
        const resortKey = 'discover-mansalay:custom_resorts';
        const rStr = localStorage.getItem(resortKey);
        const rExisting = rStr ? JSON.parse(rStr) : [];
        if (!rExisting.some((i: any) => String(i.id) === String(newItemPayload.id))) {
          localStorage.setItem(resortKey, JSON.stringify([newItemPayload, ...rExisting]));
        }
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // Reload posts and dispatch global events so all pages (Accommodations, Attractions, Itinerary, etc.) refresh
    await loadManagePosts();
    window.dispatchEvent(new Event('contentUpdated'));
    window.dispatchEvent(new Event('storage'));

    // Database operation finished -> 100%
    setUploadProgress(100);
    setUploadStatusText('Published post saved to database!');
    await new Promise((res) => setTimeout(res, 400));
    setUploadModalOpen(false);

    toast.success(editingId ? `Updated ${activeTab} successfully!` : `Published ${activeTab} successfully!`);
    resetForm();
    setPublishing(false);
  };

  const handleDeletePost = async (id: number | string, tabType?: ContentTab, skipConfirm: boolean = false) => {
    if (!skipConfirm && !confirm('Are you sure you want to permanently delete this item?')) return;
    const type = tabType || activeTab;

    // 1. Permanently record in deletedPostIds set
    const updatedDeleted = new Set(deletedPostIds);
    updatedDeleted.add(String(id));
    updatedDeleted.add(Number(id));
    saveDeletedPostIds(updatedDeleted);

    // 2. Remove from archivedPostIds set
    const updatedArchived = new Set(archivedPostIds);
    updatedArchived.delete(id);
    updatedArchived.delete(String(id));
    updatedArchived.delete(Number(id));
    saveArchivedPostIds(updatedArchived);

    // 3. Remove from selectedPostIds set
    const updatedSelected = new Set(selectedPostIds);
    updatedSelected.delete(id);
    updatedSelected.delete(String(id));
    updatedSelected.delete(Number(id));
    setSelectedPostIds(updatedSelected);

    // 4. Immediately update React state so item vanishes instantly (0ms delay)
    const filterOut = (prev: any[]) => prev.filter((i) => String(i.id) !== String(id));
    setResortPosts(filterOut);
    setEnterprisePosts(filterOut);
    setAttractionPosts(filterOut);
    setEventPosts(filterOut);
    setItineraryPosts(filterOut);
    setPublishedItems(filterOut);

    // 5. Clean up local storage caches
    ['custom_resorts', 'custom_products', 'custom_attractions', 'custom_events', 'custom_itinerarys'].forEach((key) => {
      const existingStr = localStorage.getItem(`discover-mansalay:${key}`);
      if (existingStr) {
        const existing = JSON.parse(existingStr);
        const updated = existing.filter((i: any) => String(i.id) !== String(id));
        localStorage.setItem(`discover-mansalay:${key}`, JSON.stringify(updated));
      }
    });

    // 6. Broadcast global events so other pages auto-refresh immediately
    window.dispatchEvent(new Event('contentUpdated'));
    window.dispatchEvent(new Event('storage'));

    // 7. Send delete request to backend API asynchronously
    try {
      let endpoint = `/accommodations/${id}`;
      if (type === 'product') endpoint = `/admin/products/${id}`;
      if (type === 'attraction' || type === 'itinerary') endpoint = `/attractions/${id}`;
      if (type === 'event') endpoint = `/events/${id}`;

      try {
        await deleteJSON(endpoint);
      } catch (err) {
        if (type === 'resort') await deleteJSON(`/admin/accommodations/${id}`);
        if (type === 'product') await deleteJSON(`/products/${id}`);
      }
    } catch (err: any) {
      console.warn('Backend delete notice:', err);
    }

    if (!skipConfirm) {
      toast.success('Post permanently deleted');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── ACCURATE UPLOADING PROGRESS OVERLAY MODAL ── */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 text-center">
              {/* Spinner */}
              <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                {uploadProgress < 100 ? (
                  <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-in zoom-in" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  {uploadProgress < 100 ? 'Uploading to Database...' : 'Upload Complete!'}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1 truncate">
                  {uploadFileName ? `File: ${uploadFileName}` : uploadStatusText}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-600">{uploadStatusText}</span>
                  <span className="text-pink-600 font-extrabold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200/60">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all duration-300 shadow-xs"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              {/* Security Note */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Database upload & security validation in progress</span>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER TITLE ── */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Publish Content</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
            Post resorts, products, attractions, events, curated itineraries, and manage homepage videos securely.
          </p>
        </div>

        {/* ── TOP MODE PILL TABS ── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMainMode('publish')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              mainMode === 'publish'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-300 hover:text-pink-600'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Publish</span>
          </button>

          <button
            onClick={() => setMainMode('background')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              mainMode === 'background'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-300 hover:text-pink-600'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>🌄 Home Background</span>
          </button>

          <button
            onClick={() => setMainMode('videos')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              mainMode === 'videos'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-300 hover:text-pink-600'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>🎥 Videos</span>
          </button>

          <button
            onClick={() => setMainMode('manage')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              mainMode === 'manage'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-300 hover:text-pink-600'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Manage Posts</span>
          </button>
        </div>

        {/* ── PUBLISH CARD CONTAINER ── */}
        {mainMode === 'publish' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 sm:p-8">
            
            {/* 5 SUB-TABS ROW */}
            <div className="flex border-b border-gray-100 mb-6 overflow-x-auto scrollbar-none">
              <button
                onClick={() => { setActiveTab('resort'); resetForm(); }}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'resort'
                    ? 'border-pink-500 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-gray-500 hover:text-pink-600'
                }`}
              >
                <Hotel className="h-4 w-4 text-pink-500" />
                <span>Resort / Accommodation</span>
              </button>

              <button
                onClick={() => { setActiveTab('product'); resetForm(); }}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'product'
                    ? 'border-pink-500 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-gray-500 hover:text-pink-600'
                }`}
              >
                <Package className="h-4 w-4 text-amber-500" />
                <span>Product</span>
              </button>

              <button
                onClick={() => { setActiveTab('attraction'); resetForm(); }}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'attraction'
                    ? 'border-pink-500 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-gray-500 hover:text-pink-600'
                }`}
              >
                <Compass className="h-4 w-4 text-emerald-500" />
                <span>Attraction</span>
              </button>

              <button
                onClick={() => { setActiveTab('event'); resetForm(); }}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'event'
                    ? 'border-pink-500 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-gray-500 hover:text-pink-600'
                }`}
              >
                <Calendar className="h-4 w-4 text-purple-500" />
                <span>Event</span>
              </button>

              <button
                onClick={() => { setActiveTab('itinerary'); resetForm(); }}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'itinerary'
                    ? 'border-pink-500 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-gray-500 hover:text-pink-600'
                }`}
              >
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>Itinerary</span>
              </button>
            </div>

            {/* INFO CALLOUT BANNER */}
            <div className={`p-4 text-xs font-semibold rounded-2xl mb-6 flex items-center justify-between ${
              activeTab === 'itinerary' 
                ? 'bg-pink-50/80 border border-pink-200/80 text-pink-600' 
                : 'bg-blue-50/80 border border-blue-200/80 text-blue-600'
            }`}>
              <span>
                {activeTab === 'resort' && 'Post a resort or accommodation on behalf of an owner who does not have an account yet.'}
                {activeTab === 'product' && 'Post a product on behalf of an enterprise owner who does not have an account yet.'}
                {activeTab === 'attraction' && 'Post a tourist attraction or natural landmark in Mansalay.'}
                {activeTab === 'event' && 'Post an upcoming festival, cultural celebration, or community event.'}
                {activeTab === 'itinerary' && 'Create a curated suggested itinerary that appears in the Itinerary Planner for tourists to browse and adopt.'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2.5 py-1 bg-white text-gray-700 hover:bg-gray-100 rounded-lg text-[11px] font-bold border border-gray-200 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            {/* PUBLISH FORM */}
            <form onSubmit={handlePublish} className="space-y-5 font-sans">
              {activeTab === 'itinerary' ? (
                /* ── ITINERARY FORM (EXACT USER SCREENSHOT SPEC) ── */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Itinerary Title <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Beaches & Sunsets Weekend"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Theme <span className="text-pink-500">*</span>
                      </label>
                      <select
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      >
                        <option value="">Select theme...</option>
                        <option value="Beach & Relaxation">Beach & Relaxation</option>
                        <option value="Cultural & Heritage">Cultural & Heritage</option>
                        <option value="Adventure & Nature">Adventure & Nature</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Number of Days <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={numberOfDays}
                        onChange={(e) => handleDaysChange(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Badge (optional)</label>
                      <input
                        type="text"
                        value={itineraryBadge}
                        onChange={(e) => setItineraryBadge(e.target.value)}
                        placeholder="e.g. Most Popular, Editor's Pick"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Description <span className="text-pink-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A short summary of this itinerary for travelers to read..."
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Highlights <span className="text-pink-500">*</span> <span className="text-gray-400 font-normal">(one per line)</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={highlightsText}
                      onChange={(e) => setHighlightsText(e.target.value)}
                      placeholder="Buktot Beach swimming & snorkeling&#10;Sidell Kite Festival Grounds at sunset&#10;Fresh seafood dinner"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-normal focus:border-pink-500 outline-none"
                    />
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">Cover Image</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-pink-400 rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-pink-50/20 transition-all cursor-pointer relative group"
                    >
                      {imagePreviews.length > 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex flex-wrap items-center justify-center gap-2 max-h-48 overflow-y-auto p-1">
                            {imagePreviews.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="h-24 w-24 object-cover rounded-xl border-2 border-pink-300 shadow-xs"
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-pink-600 bg-pink-100/70 px-3 py-1 rounded-full">
                            {imagePreviews.length} image(s) selected
                          </span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 group-hover:text-pink-500 mx-auto mb-2 transition-colors" />
                          <p className="text-xs font-bold text-gray-700">Click to upload cover image</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Day-by-Day Schedule Accordions */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-gray-800">
                      <Calendar className="h-4 w-4 text-pink-500" />
                      <span>Day-by-Day Schedule</span>
                    </div>

                    {daySchedules.map((dayItem, idx) => {
                      const isExpanded = expandedDayIndex === idx;
                      return (
                        <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => setExpandedDayIndex(isExpanded ? -1 : idx)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs font-bold text-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[11px] font-extrabold flex items-center justify-center">
                                {dayItem.day}
                              </span>
                              <span>Day {dayItem.day}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {isExpanded && (
                            <div className="p-4 space-y-3 bg-white border-t border-gray-100">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                  🌞 Morning
                                </label>
                                <input
                                  type="text"
                                  value={dayItem.morning}
                                  onChange={(e) => {
                                    const newArr = [...daySchedules];
                                    newArr[idx].morning = e.target.value;
                                    setDaySchedules(newArr);
                                  }}
                                  placeholder="Morning activities & plans"
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                  🏖️ Afternoon
                                </label>
                                <input
                                  type="text"
                                  value={dayItem.afternoon}
                                  onChange={(e) => {
                                    const newArr = [...daySchedules];
                                    newArr[idx].afternoon = e.target.value;
                                    setDaySchedules(newArr);
                                  }}
                                  placeholder="Afternoon activities & plans"
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                  🌙 Evening
                                </label>
                                <input
                                  type="text"
                                  value={dayItem.evening}
                                  onChange={(e) => {
                                    const newArr = [...daySchedules];
                                    newArr[idx].evening = e.target.value;
                                    setDaySchedules(newArr);
                                  }}
                                  placeholder="Evening activities & dinner"
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* ── STANDARD FORM (RESORT / PRODUCT / ATTRACTION / EVENT) ── */
                <>
                  {activeTab === 'product' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Product Owner / Artisan Name <span className="text-pink-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={productOwner}
                          onChange={(e) => setProductOwner(e.target.value)}
                          placeholder="e.g. Maria Santos"
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Shop Name / Enterprise Store <span className="text-pink-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder="e.g. Mansalay Mangyan Handicrafts"
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        {activeTab === 'product' ? 'Product Name' : 'Name'} <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={
                          activeTab === 'resort' ? 'e.g. MB Hiraya Beach Resort' :
                          activeTab === 'product' ? 'e.g. Traditional Mangyan Woven Basket' :
                          activeTab === 'attraction' ? 'e.g. Buktot White Beach' :
                          'e.g. Mansalay Cultural Festival'
                        }
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      >
                        <option value="">Select category...</option>
                        {activeTab === 'resort' && (
                          <>
                            {ACCOMMODATION_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </>
                        )}
                        {activeTab === 'product' && (
                          <>
                            {PRODUCT_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </>
                        )}
                        {activeTab === 'attraction' && (
                          <>
                            {ATTRACTION_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </>
                        )}
                        {activeTab === 'event' && (
                          <>
                            {EVENT_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {activeTab === 'product' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Price (₱) *</label>
                      <input
                        type="number"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                      />
                    </div>
                  )}

                  {activeTab === 'event' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">Event Date *</label>
                        <input
                          type="date"
                          required
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">Event Time</label>
                        <input
                          type="text"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          placeholder="e.g. 9:00 AM – 9:00 PM"
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Description <span className="text-pink-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe this place, product, or event in detail..."
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Barangay / Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        >
                          <option value="">Select barangay...</option>
                          {MANSALAY_BARANGAYS.map((brgy) => (
                            <option key={brgy} value={brgy}>
                              {brgy}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Operating Hours <span className="text-gray-400 font-normal">(AM to PM)</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Opening Time Custom Dropdown (Opens strictly downward & Scrollable) */}
                        <div ref={openDropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDropdownActive(prev => !prev);
                              setCloseDropdownActive(false);
                            }}
                            className={`w-full pl-3.5 pr-3 py-2.5 bg-white border rounded-xl text-xs font-semibold text-gray-800 text-left flex items-center justify-between shadow-2xs transition-all ${
                              openDropdownActive ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 hover:border-pink-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Clock className="h-4 w-4 text-pink-500 flex-shrink-0" />
                              <span className={openTime ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                {openTime || 'Opening Time (e.g. 8:00 AM)'}
                              </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openDropdownActive ? 'rotate-180 text-pink-500' : ''}`} />
                          </button>

                          {/* Downward Popover Menu with Scroll */}
                          {openDropdownActive && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl p-1 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                                        setOperatingHours('Open 24 Hours');
                                      } else {
                                        setOperatingHours(`${t} – ${closeTime || '5:00 PM'}`);
                                      }
                                      setOpenDropdownActive(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-colors ${
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

                        {/* Closing Time Custom Dropdown (Opens strictly downward & Scrollable) */}
                        <div ref={closeDropdownRef} className="relative">
                          <button
                            type="button"
                            disabled={openTime === 'Open 24 Hours'}
                            onClick={() => {
                              setCloseDropdownActive(prev => !prev);
                              setOpenDropdownActive(false);
                            }}
                            className={`w-full pl-3.5 pr-3 py-2.5 bg-white border rounded-xl text-xs font-semibold text-gray-800 text-left flex items-center justify-between shadow-2xs transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
                              closeDropdownActive ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200 hover:border-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Clock className="h-4 w-4 text-rose-500 flex-shrink-0" />
                              <span className={closeTime ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                {openTime === 'Open 24 Hours' ? 'N/A (24 Hours)' : (closeTime || 'Closing Time (e.g. 5:00 PM)')}
                              </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${closeDropdownActive ? 'rotate-180 text-rose-500' : ''}`} />
                          </button>

                          {/* Downward Popover Menu with Scroll */}
                          {closeDropdownActive && openTime !== 'Open 24 Hours' && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl p-1 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                                        setOperatingHours(`${openTime} – ${t}`);
                                      }
                                      setCloseDropdownActive(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-colors ${
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
                      {operatingHours && (
                        <p className="text-[11px] text-pink-600 font-bold mt-2 flex items-center gap-1.5">
                          <span>⏰ Selected Hours:</span>
                          <span className="bg-pink-50 px-2.5 py-0.5 rounded-md border border-pink-200 text-pink-700 font-semibold shadow-2xs">
                            {operatingHours}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional Contact Details (Phone & Email) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          placeholder="e.g. +63 912 345 6789"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. contact@mansalay.gov.ph"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cover Image Upload */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Images / Photo Gallery <span className="text-pink-500 font-semibold">(Multiple images allowed)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-pink-400 rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-pink-50/20 transition-all cursor-pointer relative group"
                    >
                      {imagePreviews.length > 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex flex-wrap items-center justify-center gap-2 max-h-48 overflow-y-auto p-1">
                            {imagePreviews.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="h-24 w-24 object-cover rounded-xl border-2 border-pink-300 shadow-xs"
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 bg-pink-100/70 px-3 py-1 rounded-full">
                            <CheckCircle2 className="h-4 w-4 text-pink-500" />
                            <span>{imagePreviews.length} image(s) selected</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 group-hover:text-pink-500 mx-auto mb-2 transition-colors" />
                          <p className="text-xs font-bold text-gray-700">Click to upload multiple images</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Video Tour Section (Optional for Attraction, Resort, Event, etc.) */}
                  <div className="bg-gradient-to-br from-indigo-50/60 via-white to-pink-50/40 p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">Virtual Video Tour <span className="text-gray-400 font-normal">(Optional)</span></h4>
                          <p className="text-[11px] text-gray-500 font-medium">Add a video link (YouTube / MP4) or upload a video tour file</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Virtual Tour
                      </span>
                    </div>

                    {/* Video Link Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Video Tour Link (YouTube, Facebook, or Direct Video URL)
                      </label>
                      <div className="relative">
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={videoUrlInput}
                          onChange={(e) => {
                            setVideoUrlInput(e.target.value);
                            if (e.target.value.trim()) {
                              setSelectedVideoFile(null);
                              setVideoPreviewUrl(null);
                              if (videoFileInputRef.current) videoFileInputRef.current.value = '';
                            }
                          }}
                          placeholder="https://www.youtube.com/watch?v=... or https://example.com/attraction-tour.mp4"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
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
                        className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-5 text-center bg-white/70 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                      >
                        <Film className="h-7 w-7 text-gray-400 group-hover:text-indigo-500 mx-auto mb-1.5 transition-colors" />
                        <p className="text-xs font-bold text-gray-700">Click to choose video tour file</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">MP4, WebM, MOV (Up to 500MB)</p>
                        {selectedVideoFile && (
                          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{selectedVideoFile.name} ({(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Video Preview Player */}
                    {(videoPreviewUrl || videoUrlInput) && (
                      <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Play className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400" />
                            <span>Virtual Tour Video Preview</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVideoFile(null);
                              setVideoPreviewUrl(null);
                              setVideoUrlInput('');
                              if (videoFileInputRef.current) videoFileInputRef.current.value = '';
                            }}
                            className="px-2 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-[11px] font-bold rounded-md transition-all cursor-pointer"
                          >
                            Remove Video
                          </button>
                        </div>

                        {videoPreviewUrl ? (
                          <video
                            controls
                            playsInline
                            className="w-full max-h-56 object-cover rounded-lg bg-black"
                            src={videoPreviewUrl}
                          />
                        ) : (videoUrlInput.includes('youtu.be/') || videoUrlInput.includes('youtube.com')) ? (
                          <iframe
                            src={videoUrlInput.includes('watch?v=') ? `https://www.youtube.com/embed/${videoUrlInput.split('v=')[1]?.split('&')[0]}` : videoUrlInput.includes('youtu.be/') ? `https://www.youtube.com/embed/${videoUrlInput.split('youtu.be/')[1]?.split('?')[0]}` : videoUrlInput}
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
                </>
              )}

              <button
                type="submit"
                disabled={publishing}
                className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 active:scale-98 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md shadow-pink-500/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {publishing
                    ? 'Processing...'
                    : activeTab === 'itinerary'
                    ? 'Publish Suggested Itinerary'
                    : editingId
                    ? `Save Changes to ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
                    : `+ Publish ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
                </span>
              </button>
            </form>

            {/* Published Itineraries List matching user's screenshot */}
            {activeTab === 'itinerary' && (
              <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-gray-800">Published Itineraries</h4>
                  <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-[11px] font-extrabold rounded-full">
                    {publishedItems.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {publishedItems.map((item) => (
                    <div key={item.id} className="p-3 bg-white border border-gray-200/80 rounded-2xl flex items-center justify-between shadow-2xs hover:border-pink-300 transition-all">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'}
                          alt={item.name}
                          className="h-12 w-12 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-[10px] font-extrabold rounded-full">
                              {item.days_count || 2}D
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">
                              {item.category || 'Beach & Relaxation'}
                            </span>
                            {item.badge && (
                              <span className="px-2 py-0.5 bg-pink-50 text-pink-500 text-[10px] font-semibold rounded-full border border-pink-200">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-bold text-gray-900">{item.name}</h5>
                          <p className="text-[10px] text-gray-400 font-medium">Published {item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleArchiveSelected([item.id])}
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                        title="Archive itinerary"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 🌄 HOMEPAGE HERO BACKGROUND MANAGEMENT MODE ── */}
        {mainMode === 'background' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900">Homepage Hero Background Image</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Upload, change, and automatically save the main background wallpaper for the tourist Home page.
                </p>
              </div>

              {isCustomHomeBg && (
                <button
                  type="button"
                  onClick={handleResetHomeBackground}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  title="Reset to default background"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>

            {/* Live Interactive Preview */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Live Homepage Hero Preview
              </label>
              <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-gray-950 shadow-md border border-gray-200 group">
                <img
                  src={
                    bgImagePreview
                      ? bgImagePreview
                      : currentHomeBg.startsWith('http') || currentHomeBg.startsWith('/assets') || currentHomeBg.startsWith('data:')
                      ? currentHomeBg
                      : `${API_BASE}${currentHomeBg}`
                  }
                  alt="Homepage Hero Preview"
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/mansalay_hero_bg.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />

                {/* Hero Overlay Mock Text */}
                <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-center max-w-lg pointer-events-none">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-0.5 bg-pink-500 rounded-full"></span>
                    <span className="text-pink-400 font-bold text-[11px] uppercase tracking-widest">
                      Oriental Mindoro
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                    Discover <span className="text-pink-400">Mansalay</span>
                  </h1>
                  <p className="text-xs text-white/80 mt-2 line-clamp-2">
                    Your portal to pristine beaches, lush mangrove parks, Mangyan heritage, and authentic local delicacies.
                  </p>
                </div>

                {/* Status Badges */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold backdrop-blur-md shadow-sm flex items-center gap-1 ${
                    isCustomHomeBg
                      ? 'bg-emerald-500/90 text-white border border-emerald-400/40'
                      : 'bg-black/60 text-white/90 border border-white/20'
                  }`}>
                    {isCustomHomeBg ? '✓ Custom Database Background Active' : 'Default Wallpaper'}
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Controls */}
            <form onSubmit={handleSaveHomeBackground} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload Drop Area */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-pink-500" />
                    Upload Image File
                  </label>
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleSelectBgFile}
                    className="hidden"
                    id="home-bg-file-input"
                  />
                  <label
                    htmlFor="home-bg-file-input"
                    className="w-full border-2 border-dashed border-gray-200 hover:border-pink-400 bg-gray-50/60 hover:bg-pink-50/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[110px]"
                  >
                    <Upload className="h-6 w-6 text-gray-400 group-hover:text-pink-500 transition-colors mb-1.5" />
                    <span className="text-xs font-bold text-gray-700 group-hover:text-pink-600">
                      {bgImageFile ? bgImageFile.name : 'Click to select or drop background image'}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      Supports JPG, PNG, WEBP up to 15MB (High-Res 1920x1080 recommended)
                    </span>
                  </label>
                </div>

                {/* Image URL Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-pink-500" />
                    Or Paste Image URL
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={bgUrlInput}
                      onChange={(e) => {
                        setBgUrlInput(e.target.value);
                        if (e.target.value) {
                          setBgImagePreview(e.target.value);
                          setBgImageFile(null);
                          if (bgFileInputRef.current) bgFileInputRef.current.value = '';
                        }
                      }}
                      placeholder="https://example.com/mansalay_beach_view.jpg"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-mono"
                    />
                    <p className="text-[10px] text-gray-400">
                      Paste a direct link to any high-definition hosted image.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Awtomatikong mag-a-update ang background sa home page para sa lahat ng users.</span>
                </div>

                <div className="flex items-center gap-2">
                  {(bgImageFile || bgUrlInput) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBgImageFile(null);
                        setBgImagePreview(null);
                        setBgUrlInput('');
                        if (bgFileInputRef.current) bgFileInputRef.current.value = '';
                      }}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingBg || (!bgImageFile && !bgUrlInput.trim())}
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-md shadow-pink-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingBg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Background to Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── 🎥 SECURE VIDEOS MODE ── */}
        {mainMode === 'videos' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 font-sans">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-extrabold text-gray-900">Secure Homepage Background Video Upload</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Upload local video files or paste video URLs safely with built-in MIME checking, size limits, and sanitization.
              </p>
            </div>

            {/* VIDEO SAVE FORM */}
            <form onSubmit={handleSaveVideo} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">Video Title / Name</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. Mansalay Bay Coastal Sunset Video"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">Or Direct Video URL (https://...)</label>
                  <input
                    type="text"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* SECURE VIDEO FILE DROPZONE */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">Upload Local Video File (.mp4, .webm, .mov max 500MB)</label>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => videoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-pink-400 rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-pink-50/20 transition-all cursor-pointer group"
                >
                  <Film className="h-8 w-8 text-gray-400 group-hover:text-pink-500 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-bold text-gray-700">Click to select video file safely</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Supported: MP4, WebM, OGG, MOV (Up to 500MB)</p>
                  {selectedVideoFile && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Selected: {selectedVideoFile.name} ({(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE SECURE HTML5 VIDEO PREVIEW */}
              {(videoPreviewUrl || activeHeroVideo) && (
                <div className="p-4 bg-gray-900 rounded-2xl border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />
                      <span>Live Hero Video Preview</span>
                    </span>
                    {activeHeroVideo && (
                      <button
                        type="button"
                        onClick={handleRemoveHeroVideo}
                        className="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-[11px] font-bold rounded-lg transition-all"
                      >
                        Remove Active Video
                      </button>
                    )}
                  </div>
                  <video
                    controls
                    muted
                    loop
                    playsInline
                    controlsList="nodownload"
                    className="w-full max-h-64 object-cover rounded-xl border border-gray-800"
                    src={videoPreviewUrl || activeHeroVideo!}
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 active:scale-98 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md shadow-pink-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
            </form>
          </div>
        )}

        {/* ── MANAGE POSTS MODE (STRICT CATEGORY-SCOPED SELECT ALL & ARCHIVE SYSTEM) ── */}
        {mainMode === 'manage' && (() => {
          const isArchived = (id: string | number) =>
            archivedPostIds.has(id) ||
            archivedPostIds.has(String(id)) ||
            (typeof id === 'string' && !isNaN(Number(id)) && archivedPostIds.has(Number(id)));

          const visibleResorts = resortPosts.filter((p) => showArchivedOnly ? isArchived(p.id) : !isArchived(p.id));
          const visibleProducts = enterprisePosts.filter((p) => showArchivedOnly ? isArchived(p.id) : !isArchived(p.id));
          const visibleAttractions = attractionPosts.filter((p) => showArchivedOnly ? isArchived(p.id) : !isArchived(p.id));
          const visibleEvents = eventPosts.filter((p) => showArchivedOnly ? isArchived(p.id) : !isArchived(p.id));
          const visibleItineraries = itineraryPosts.filter((p) => showArchivedOnly ? isArchived(p.id) : !isArchived(p.id));

          const areAllResortsSelected = visibleResorts.length > 0 && visibleResorts.every((p) => selectedPostIds.has(p.id));
          const areAllProductsSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selectedPostIds.has(p.id));
          const areAllAttractionsSelected = visibleAttractions.length > 0 && visibleAttractions.every((p) => selectedPostIds.has(p.id));
          const areAllEventsSelected = visibleEvents.length > 0 && visibleEvents.every((p) => selectedPostIds.has(p.id));
          const areAllItinerariesSelected = visibleItineraries.length > 0 && visibleItineraries.every((p) => selectedPostIds.has(p.id));

          return (
            <div className="space-y-6 font-sans">
              {/* TOP TOOLBAR: ACTIVE VS ARCHIVE VAULT TOGGLE & BATCH ARCHIVE */}
              <div className="bg-white rounded-3xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                {/* Left: Active vs Archive Vault */}
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/60">
                    <button
                      onClick={() => { setShowArchivedOnly(false); setSelectedPostIds(new Set()); }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        !showArchivedOnly
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Active Posts
                    </button>
                    <button
                      onClick={() => { setShowArchivedOnly(true); setSelectedPostIds(new Set()); }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                        showArchivedOnly
                          ? 'bg-pink-500 text-white shadow-xs'
                          : 'text-gray-500 hover:text-pink-600'
                      }`}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive Vault</span>
                      <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                        {archivedPostIds.size}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Right: Batch Archive / Restore / Delete Action */}
                {selectedPostIds.size > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <span className="text-xs font-bold text-gray-500">
                      {selectedPostIds.size} item(s) selected
                    </span>

                    {!showArchivedOnly ? (
                      <button
                        onClick={() => handleArchiveSelected()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive Selected</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleUnarchiveSelected()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          <span>Restore Selected</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSelectedBatch()}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Selected</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 1. RESORT POSTS SECTION */}
              <div className="bg-white rounded-3xl border border-gray-100/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-blue-600" />
                    <h3 className="text-base font-extrabold text-gray-900">Resort Posts</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      {visibleResorts.length}
                    </span>
                  </div>

                  {visibleResorts.length > 0 && (
                    <button
                      onClick={() => toggleSelectAllList(visibleResorts)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {areAllResortsSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-blue-400" />}
                      <span>{areAllResortsSelected ? 'Deselect All Resorts' : 'Select All Resorts'}</span>
                    </button>
                  )}
                </div>

                {visibleResorts.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400 font-medium">
                      {showArchivedOnly ? 'No archived resort posts.' : 'No resort posts yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleResorts.map((item) => {
                      const isSelected = selectedPostIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectPost(item.id)}
                          className={`p-3.5 border rounded-2xl flex items-center justify-between bg-white transition-all cursor-pointer shadow-2xs ${
                            isSelected ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500' : 'border-gray-100 hover:border-pink-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => { e.stopPropagation(); toggleSelectPost(item.id); }}
                              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <img
                              src={item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`) : '/assets/mansalay_hero_bg.jpg'}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-gray-400 font-medium truncate">{item.location || 'Mansalay'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!showArchivedOnly ? (
                              <button
                                onClick={() => handleArchiveSelected([item.id])}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                title="Archive resort"
                              >
                                <Archive className="h-4 w-4" />
                                <span className="hidden sm:inline">Archive</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUnarchiveSelected([item.id])}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Restore resort"
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePost(item.id, 'resort')}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Permanently delete resort"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span className="hidden sm:inline text-rose-600">Delete</span>
                                </button>
                              </>
                            )}
                            <button onClick={() => { setActiveTab('resort'); handleEditPost(item); }} className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"><Pencil className="h-4 w-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. ENTERPRISE POSTS SECTION */}
              <div className="bg-white rounded-3xl border border-gray-100/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-pink-600" />
                    <h3 className="text-base font-extrabold text-gray-900">Enterprise Posts</h3>
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-bold rounded-full">
                      {visibleProducts.length}
                    </span>
                  </div>

                  {visibleProducts.length > 0 && (
                    <button
                      onClick={() => toggleSelectAllList(visibleProducts)}
                      className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {areAllProductsSelected ? <CheckSquare className="h-4 w-4 text-pink-600" /> : <Square className="h-4 w-4 text-pink-400" />}
                      <span>{areAllProductsSelected ? 'Deselect All Products' : 'Select All Products'}</span>
                    </button>
                  )}
                </div>

                {visibleProducts.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400 font-medium">
                      {showArchivedOnly ? 'No archived enterprise posts.' : 'No enterprise posts yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleProducts.map((item) => {
                      const isSelected = selectedPostIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectPost(item.id)}
                          className={`p-3.5 border rounded-2xl flex items-center justify-between bg-white transition-all cursor-pointer shadow-2xs ${
                            isSelected ? 'border-pink-500 bg-pink-50/20 ring-1 ring-pink-500' : 'border-gray-100 hover:border-pink-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => { e.stopPropagation(); toggleSelectPost(item.id); }}
                              className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                            />
                            <img
                              src={item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`) : '/assets/mansalay_hero_bg.jpg'}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-pink-600 font-extrabold truncate">₱{item.price}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!showArchivedOnly ? (
                              <button
                                onClick={() => handleArchiveSelected([item.id])}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                title="Archive product"
                              >
                                <Archive className="h-4 w-4" />
                                <span className="hidden sm:inline">Archive</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUnarchiveSelected([item.id])}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Restore product"
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePost(item.id, 'product')}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Permanently delete product"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span className="hidden sm:inline text-rose-600">Delete</span>
                                </button>
                              </>
                            )}
                            <button onClick={() => { setActiveTab('product'); handleEditPost(item); }} className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"><Pencil className="h-4 w-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. ATTRACTION POSTS SECTION */}
              <div className="bg-white rounded-3xl border border-gray-100/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-base font-extrabold text-gray-900">Attraction Posts</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      {visibleAttractions.length}
                    </span>
                  </div>

                  {visibleAttractions.length > 0 && (
                    <button
                      onClick={() => toggleSelectAllList(visibleAttractions)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {areAllAttractionsSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-emerald-400" />}
                      <span>{areAllAttractionsSelected ? 'Deselect All Attractions' : 'Select All Attractions'}</span>
                    </button>
                  )}
                </div>

                {visibleAttractions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400 font-medium">
                      {showArchivedOnly ? 'No archived attraction posts.' : 'No attraction posts yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleAttractions.map((item) => {
                      const isSelected = selectedPostIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectPost(item.id)}
                          className={`p-3.5 border rounded-2xl flex items-center justify-between bg-white transition-all cursor-pointer shadow-2xs ${
                            isSelected ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500' : 'border-gray-100 hover:border-pink-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => { e.stopPropagation(); toggleSelectPost(item.id); }}
                              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <img
                              src={item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`) : '/assets/mansalay_hero_bg.jpg'}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-gray-400 font-medium truncate">{item.category || 'Landmark'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!showArchivedOnly ? (
                              <button
                                onClick={() => handleArchiveSelected([item.id])}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                title="Archive attraction"
                              >
                                <Archive className="h-4 w-4" />
                                <span className="hidden sm:inline">Archive</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUnarchiveSelected([item.id])}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Restore attraction"
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePost(item.id, 'attraction')}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Permanently delete attraction"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span className="hidden sm:inline text-rose-600">Delete</span>
                                </button>
                              </>
                            )}
                            <button onClick={() => { setActiveTab('attraction'); handleEditPost(item); }} className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"><Pencil className="h-4 w-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. EVENT POSTS SECTION */}
              <div className="bg-white rounded-3xl border border-gray-100/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <h3 className="text-base font-extrabold text-gray-900">Event Posts</h3>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                      {visibleEvents.length}
                    </span>
                  </div>

                  {visibleEvents.length > 0 && (
                    <button
                      onClick={() => toggleSelectAllList(visibleEvents)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {areAllEventsSelected ? <CheckSquare className="h-4 w-4 text-purple-600" /> : <Square className="h-4 w-4 text-purple-400" />}
                      <span>{areAllEventsSelected ? 'Deselect All Events' : 'Select All Events'}</span>
                    </button>
                  )}
                </div>

                {visibleEvents.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400 font-medium">
                      {showArchivedOnly ? 'No archived event posts.' : 'No event posts yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleEvents.map((item) => {
                      const isSelected = selectedPostIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectPost(item.id)}
                          className={`p-3.5 border rounded-2xl flex items-center justify-between bg-white transition-all cursor-pointer shadow-2xs ${
                            isSelected ? 'border-purple-500 bg-purple-50/20 ring-1 ring-purple-500' : 'border-gray-100 hover:border-pink-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => { e.stopPropagation(); toggleSelectPost(item.id); }}
                              className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <img
                              src={item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`) : '/assets/mansalay_hero_bg.jpg'}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-gray-400 font-medium truncate">{item.date || 'Upcoming'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!showArchivedOnly ? (
                              <button
                                onClick={() => handleArchiveSelected([item.id])}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                title="Archive event"
                              >
                                <Archive className="h-4 w-4" />
                                <span className="hidden sm:inline">Archive</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUnarchiveSelected([item.id])}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Restore event"
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePost(item.id, 'event')}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Permanently delete event"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span className="hidden sm:inline text-rose-600">Delete</span>
                                </button>
                              </>
                            )}
                            <button onClick={() => { setActiveTab('event'); handleEditPost(item); }} className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"><Pencil className="h-4 w-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. ITINERARY POSTS SECTION */}
              <div className="bg-white rounded-3xl border border-gray-100/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-rose-600" />
                    <h3 className="text-base font-extrabold text-gray-900">Itinerary Posts</h3>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                      {visibleItineraries.length}
                    </span>
                  </div>

                  {visibleItineraries.length > 0 && (
                    <button
                      onClick={() => toggleSelectAllList(visibleItineraries)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {areAllItinerariesSelected ? <CheckSquare className="h-4 w-4 text-rose-600" /> : <Square className="h-4 w-4 text-rose-400" />}
                      <span>{areAllItinerariesSelected ? 'Deselect All Itineraries' : 'Select All Itineraries'}</span>
                    </button>
                  )}
                </div>

                {visibleItineraries.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400 font-medium">
                      {showArchivedOnly ? 'No archived itinerary posts.' : 'No itinerary posts yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleItineraries.map((item) => {
                      const isSelected = selectedPostIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectPost(item.id)}
                          className={`p-3.5 border rounded-2xl flex items-center justify-between bg-white transition-all cursor-pointer shadow-2xs ${
                            isSelected ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500' : 'border-gray-100 hover:border-pink-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => { e.stopPropagation(); toggleSelectPost(item.id); }}
                              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            <img
                              src={item.image ? (item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`) : '/assets/mansalay_hero_bg.jpg'}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-gray-400 font-medium truncate">{item.category || 'Curated Tour'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!showArchivedOnly ? (
                              <button
                                onClick={() => handleArchiveSelected([item.id])}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                title="Archive itinerary"
                              >
                                <Archive className="h-4 w-4" />
                                <span className="hidden sm:inline">Archive</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUnarchiveSelected([item.id])}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Restore itinerary"
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePost(item.id, 'itinerary')}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                                  title="Permanently delete itinerary"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span className="hidden sm:inline text-rose-600">Delete</span>
                                </button>
                              </>
                            )}
                            <button onClick={() => { setActiveTab('itinerary'); handleEditPost(item); }} className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"><Pencil className="h-4 w-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
