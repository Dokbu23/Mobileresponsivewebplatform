import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  Compass,
  MapPin,
  Sparkles,
  Printer,
  X,
  Check,
  ChevronRight,
  Upload,
  User,
  ExternalLink,
  ShieldCheck,
  Navigation,
  Layers,
  ArrowRight,
  RotateCcw,
  Tag,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useApp } from '../../context/AppContext';
import {
  getJSON,
  getPublicJSON,
  postJSON,
  putJSON,
  deleteJSON,
  formatImageUrl,
  API_BASE,
  cleanItineraryTitle
} from '../../lib/api';
import { showDeleteConfirmDialog } from '../../lib/sweetAlert';

export interface ActivityItem {
  time: string;
  activity: string;
  location: string;
  notes?: string;
}

export interface DailyPlan {
  day: number;
  title: string;
  activities: ActivityItem[];
}

export interface CreatorInfo {
  id: number;
  name: string;
  email?: string | null;
  role: string;
}

export interface OfficialItinerary {
  id: number;
  title: string;
  name: string;
  category: string;
  main_category?: string;
  duration: string;
  days_count: number;
  badge?: string;
  location?: string;
  description: string;
  full_description?: string;
  image: string;
  images?: string[];
  status: 'published' | 'draft' | 'archived';
  published_date: string;
  created_at?: string;
  updated_at?: string;
  creator?: CreatorInfo;
  user_id?: number | null;
  is_my_itinerary?: boolean;
  days: DailyPlan[];
  highlights: string[];
  activities_count: number;
  schedule_summary: string;
}

const ITINERARY_CATEGORIES = [
  'Beach & Coastal Tour',
  'Cultural & Heritage Experience',
  'Island Discovery',
  'Eco-Tourism & Nature',
  'Adventure & Mountain Trek',
  'Weekend Getaway',
  'Family Holiday',
  'Custom Adventure'
];

export function ManageItineraries() {
  const navigate = useNavigate();
  const { currentUser, userType, setIsAdmin } = useApp();

  const isAdmin =
    currentUser?.role === 'admin' ||
    userType === 'admin' ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('discover-mansalay:isAdmin') === 'true' ||
      localStorage.getItem('discover-mansalay:userType') === 'admin'
    ));

  // Redirect if unauthorized
  useEffect(() => {
    if (!isAdmin && typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('discover-mansalay:userType');
      if (storedRole !== 'admin') {
        toast.error('Unauthorized access. Admin privileges required.');
        navigate('/login', { replace: true });
      }
    }
  }, [isAdmin, navigate]);

  // Main data state
  const [itineraries, setItineraries] = useState<OfficialItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Database stats state
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    my_count: 0
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [viewScope, setViewScope] = useState<'all' | 'my'>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<OfficialItinerary | null>(null);

  // Form State (used for both Create & Edit)
  const [formId, setFormId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Beach & Coastal Tour');
  const [formDurationDays, setFormDurationDays] = useState(2);
  const [formLocation, setFormLocation] = useState('Mansalay, Oriental Mindoro');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string>('');
  const [formHighlights, setFormHighlights] = useState<string[]>([
    'Mansalay Coastal Highlights',
    'Cultural Heritage Experience',
    'Local Seafood & Dining'
  ]);
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [formDays, setFormDays] = useState<DailyPlan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic registered destination locations for spot dropdown
  const [dynamicLocations, setDynamicLocations] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load registered attractions for spot location autocomplete
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await getPublicJSON('/attractions');
        if (Array.isArray(data)) {
          const names = data
            .filter((a: any) => a.category !== 'Itinerary' && a.name)
            .map((a: any) => cleanItineraryTitle(a.name));
          setDynamicLocations(Array.from(new Set(names)));
        }
      } catch (err) {
        console.warn('Could not load destination locations:', err);
      }
    };
    fetchLocations();
  }, []);

  // Load itineraries from backend database
  const loadItineraries = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (durationFilter !== 'all') params.append('duration', durationFilter);
      if (viewScope === 'my') params.append('my', '1');

      const res = await getJSON(`/admin/itineraries?${params.toString()}`);

      if (res && res.itineraries) {
        setItineraries(res.itineraries);
        if (res.stats) {
          setStats(res.stats);
        }
      } else if (Array.isArray(res)) {
        setItineraries(res);
      }
    } catch (err: any) {
      console.error('Error loading admin itineraries:', err);
      toast.error('Failed to load itineraries from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItineraries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, durationFilter, viewScope]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadItineraries(true);
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Helper to initialize blank days
  const initializeBlankDays = (daysCount: number) => {
    const defaultSpots = [
      { time: '08:30 AM', activity: 'Morning Exploration & Tour Kickoff', location: 'Mansalay Town Center', notes: 'Best morning lighting' },
      { time: '01:30 PM', activity: 'Sightseeing & Cultural Immersion', location: dynamicLocations[0] || 'Buktot Beach', notes: 'Bring water & camera' },
      { time: '06:00 PM', activity: 'Sunset View & Local Mansalay Dinner', location: 'Mansalay Baywalk', notes: 'Relaxing coastal dinner' },
    ];

    const days: DailyPlan[] = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        day: i,
        title: `Day ${i}: ${i === 1 ? 'Arrival & Welcome Discovery' : i === 2 ? 'Cultural & Coastal Highlights' : `Day ${i} Adventure`}`,
        activities: [
          { time: '09:00 AM', activity: `Day ${i} Morning Activity`, location: dynamicLocations[i % dynamicLocations.length] || 'Mansalay' },
          { time: '02:00 PM', activity: `Day ${i} Afternoon Sightseeing`, location: dynamicLocations[(i + 1) % dynamicLocations.length] || 'Mansalay' },
          { time: '06:00 PM', activity: `Day ${i} Sunset & Dinner`, location: 'Mansalay' },
        ],
      });
    }
    return days;
  };

  // Open Create Itinerary Modal
  const handleOpenCreateModal = () => {
    setFormId(null);
    setFormTitle('');
    setFormCategory('Beach & Coastal Tour');
    setFormDurationDays(2);
    setFormLocation('Mansalay, Oriental Mindoro');
    setFormDescription('An official travel itinerary curated by the Mansalay Tourism Office.');
    setFormStatus('published');
    setFormImageFile(null);
    setFormImagePreview('/assets/mansalay_hero_bg.jpg');
    setFormHighlights([
      'Mansalay Coastal Highlights',
      'Cultural Heritage Experience',
      'Local Seafood & Dining'
    ]);
    setNewHighlightInput('');
    setFormDays(initializeBlankDays(2));
    setShowCreateModal(true);
  };

  // Open Edit Itinerary Modal
  const handleOpenEditModal = (itin: OfficialItinerary) => {
    setFormId(itin.id);
    setFormTitle(cleanItineraryTitle(itin.title || itin.name));
    setFormCategory(itin.category || 'Beach & Coastal Tour');
    setFormDurationDays(itin.days_count || (itin.days?.length || 2));
    setFormLocation(itin.location || 'Mansalay, Oriental Mindoro');
    setFormDescription(itin.description || '');
    setFormStatus(itin.status === 'draft' ? 'draft' : 'published');
    setFormImageFile(null);
    setFormImagePreview(formatImageUrl(itin.image) || '/assets/mansalay_hero_bg.jpg');
    setFormHighlights(
      Array.isArray(itin.highlights) && itin.highlights.length > 0
        ? [...itin.highlights]
        : ['Mansalay Coastal Highlights', 'Local Cuisine', 'Sightseeing']
    );
    setNewHighlightInput('');

    // Ensure days array is well-formed
    if (Array.isArray(itin.days) && itin.days.length > 0) {
      setFormDays(JSON.parse(JSON.stringify(itin.days)));
    } else {
      setFormDays(initializeBlankDays(itin.days_count || 2));
    }

    setShowEditModal(true);
  };

  // Open Preview Modal
  const handleOpenPreviewModal = (itin: OfficialItinerary) => {
    setSelectedItinerary(itin);
    setShowPreviewModal(true);
  };

  // Day & Activity Handlers for Modal Builder
  const handleAddDay = () => {
    const nextDayNum = formDays.length + 1;
    setFormDays(prev => [
      ...prev,
      {
        day: nextDayNum,
        title: `Day ${nextDayNum} Tour & Exploration`,
        activities: [
          { time: '09:00 AM', activity: 'Morning Tour Spot', location: dynamicLocations[0] || 'Mansalay' },
          { time: '02:00 PM', activity: 'Afternoon Adventure', location: dynamicLocations[1] || 'Mansalay' },
          { time: '06:00 PM', activity: 'Sunset Dinner', location: 'Mansalay' },
        ]
      }
    ]);
    setFormDurationDays(nextDayNum);
  };

  const handleRemoveDay = (dayIndex: number) => {
    if (formDays.length <= 1) {
      toast.error('An itinerary must contain at least 1 day.');
      return;
    }
    const updated = formDays
      .filter((_, idx) => idx !== dayIndex)
      .map((d, newIdx) => ({
        ...d,
        day: newIdx + 1,
        title: d.title.replace(/Day \d+/, `Day ${newIdx + 1}`)
      }));
    setFormDays(updated);
    setFormDurationDays(updated.length);
  };

  const handleAddActivity = (dayIndex: number) => {
    setFormDays(prev => {
      const next = [...prev];
      next[dayIndex].activities.push({
        time: '02:00 PM',
        activity: 'New Activity / Spot',
        location: dynamicLocations[0] || 'Mansalay'
      });
      return next;
    });
  };

  const handleUpdateActivity = (
    dayIndex: number,
    actIndex: number,
    field: keyof ActivityItem,
    value: string
  ) => {
    setFormDays(prev => {
      const next = [...prev];
      next[dayIndex].activities[actIndex] = {
        ...next[dayIndex].activities[actIndex],
        [field]: value
      };
      return next;
    });
  };

  const handleRemoveActivity = (dayIndex: number, actIndex: number) => {
    setFormDays(prev => {
      const next = [...prev];
      next[dayIndex].activities = next[dayIndex].activities.filter((_, idx) => idx !== actIndex);
      return next;
    });
  };

  const handleAddHighlight = () => {
    if (!newHighlightInput.trim()) return;
    setFormHighlights(prev => [...prev, newHighlightInput.trim()]);
    setNewHighlightInput('');
  };

  const handleRemoveHighlight = (idx: number) => {
    setFormHighlights(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  // Submit Create or Edit Itinerary
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error('Please enter an itinerary title.');
      return;
    }

    if (formDays.length === 0) {
      toast.error('Please add at least 1 day with scheduled activities.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('category', formCategory);
      formData.append('duration', `${formDays.length} ${formDays.length === 1 ? 'day' : 'days'}`);
      formData.append('location', formLocation.trim() || 'Mansalay, Oriental Mindoro');
      formData.append('description', formDescription.trim());
      formData.append('status', formStatus);
      formData.append('days', JSON.stringify(formDays));
      formData.append('highlights', JSON.stringify(formHighlights));

      if (formImageFile) {
        formData.append('image', formImageFile);
      } else if (formImagePreview && !formImagePreview.startsWith('blob:')) {
        formData.append('image', formImagePreview);
      }

      let res: any;
      if (formId) {
        // Edit existing itinerary
        res = await postJSON(`/admin/itineraries/${formId}`, formData);
        toast.success(res?.message || 'Itinerary updated successfully!');
      } else {
        // Create new itinerary
        res = await postJSON('/admin/itineraries', formData);
        toast.success(res?.message || 'Official itinerary created successfully!');
      }

      // Trigger update events across tabs
      window.dispatchEvent(new Event('itineraryUpdated'));
      window.dispatchEvent(new Event('contentUpdated'));

      setShowCreateModal(false);
      setShowEditModal(false);
      loadItineraries();
    } catch (err: any) {
      console.error('Error saving itinerary:', err);
      toast.error(err?.message || 'Failed to save itinerary. Please check the inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Toggle (e.g. Publish <-> Draft)
  const handleToggleStatus = async (itin: OfficialItinerary, newStatus: 'published' | 'draft' | 'archived') => {
    try {
      const res = await postJSON(`/admin/itineraries/${itin.id}/status`, { status: newStatus });
      toast.success(res?.message || `Status updated to ${newStatus}`);
      window.dispatchEvent(new Event('itineraryUpdated'));
      loadItineraries(true);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error('Failed to change itinerary status.');
    }
  };

  // Delete Itinerary with Confirmation Dialog
  const handleDeleteItinerary = async (itin: OfficialItinerary) => {
    const confirmed = await showDeleteConfirmDialog(
      'Delete Official Itinerary?',
      `Are you sure you want to delete "${itin.title}"? This will permanently remove the itinerary and its schedule from DiscoverMansalay.`,
      'Yes, Delete',
      'Cancel'
    );

    if (!confirmed) return;

    try {
      await deleteJSON(`/admin/itineraries/${itin.id}`);
      toast.success(`"${itin.title}" has been deleted.`);
      window.dispatchEvent(new Event('itineraryUpdated'));
      window.dispatchEvent(new Event('contentUpdated'));
      loadItineraries();
    } catch (err: any) {
      console.error('Error deleting itinerary:', err);
      toast.error('Failed to delete itinerary from database.');
    }
  };

  // Print Preview
  const handlePrintPreview = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── BREADCRUMB & HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1">
              <Link to="/admin/dashboard" className="hover:text-pink-600 transition-colors">
                Admin Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-pink-600 font-bold">Manage Itineraries</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Manage Itineraries
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Manage official tourism itineraries published on DiscoverMansalay
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadItineraries()}
              disabled={refreshing}
              className="p-2.5 bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50/40 text-gray-600 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-pink-500' : ''}`} />
            </button>

            <Link
              to="/itinerary"
              target="_blank"
              className="px-4 py-2.5 bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50/40 text-gray-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              title="View Public Trip Itinerary Page"
            >
              <ExternalLink className="w-4 h-4 text-pink-500" />
              <span className="hidden sm:inline">View Public Page</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Itinerary</span>
            </button>
          </div>
        </div>

        {/* ── METRIC STATS SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {/* Total Itineraries */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                <Compass className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{stats.total}</span>
              <span className="text-[11px] font-medium text-gray-400">itineraries</span>
            </div>
          </div>

          {/* Published Itineraries */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Published</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">{stats.published}</span>
              <span className="text-[11px] font-medium text-gray-400">live to tourists</span>
            </div>
          </div>

          {/* Draft Itineraries */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Drafts</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700">{stats.draft}</span>
              <span className="text-[11px] font-medium text-gray-400">admin only</span>
            </div>
          </div>

          {/* Archived Itineraries */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Archived</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Archive className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-700">{stats.archived}</span>
              <span className="text-[11px] font-medium text-gray-400">hidden</span>
            </div>
          </div>

          {/* My Itineraries (Authenticated Admin Created) */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:border-purple-200 transition-all col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">My Itineraries</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-700">{stats.my_count}</span>
              <span className="text-[11px] font-medium text-gray-400">created by you</span>
            </div>
          </div>
        </div>

        {/* ── SEARCH, TABS & FILTERS BAR ── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search itinerary title, activities, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right: Tab toggle & Dropdown filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Scope Toggle: All vs My Itineraries */}
            <div className="bg-gray-100/80 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All Itineraries
              </button>
              <button
                type="button"
                onClick={() => setViewScope('my')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewScope === 'my'
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-gray-500 hover:text-pink-600'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>My Itineraries</span>
              </button>
            </div>

            {/* Publication Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Duration Filter */}
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 cursor-pointer"
            >
              <option value="all">All Durations</option>
              <option value="1">1 Day</option>
              <option value="2">2 Days</option>
              <option value="3">3 Days</option>
              <option value="4+">4+ Days</option>
            </select>
          </div>
        </div>

        {/* ── ITINERARIES DATA TABLE ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <RefreshCw className="h-8 w-8 text-pink-500 animate-spin mb-3" />
              <p className="text-sm font-bold text-gray-700">Loading Official Itineraries...</p>
              <p className="text-xs text-gray-400 mt-0.5">Fetching latest database records</p>
            </div>
          ) : itineraries.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900">
                {searchQuery || statusFilter !== 'all' || viewScope === 'my'
                  ? 'No matching itineraries found'
                  : 'No Official Itineraries Published Yet'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6">
                {searchQuery || statusFilter !== 'all' || viewScope === 'my'
                  ? 'Try adjusting your search terms or filters to find what you are looking for.'
                  : 'Create handcrafted travel plans and tourist schedules for Mansalay. Published itineraries appear directly on the tourist Trip Itinerary page.'}
              </p>
              {searchQuery || statusFilter !== 'all' || viewScope === 'my' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDurationFilter('all');
                    setViewScope('all');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/25 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Itinerary</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Thumbnail</th>
                    <th className="py-3.5 px-4">Itinerary Title</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Schedule Summary</th>
                    <th className="py-3.5 px-4">Created By</th>
                    <th className="py-3.5 px-4">Published Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {itineraries.map((itin) => {
                    const isMyItin = itin.is_my_itinerary || (currentUser && Number(itin.user_id) === Number(currentUser.id));
                    const imgUrl = formatImageUrl(itin.image) || '/assets/mansalay_hero_bg.jpg';

                    return (
                      <tr
                        key={itin.id}
                        className="hover:bg-pink-50/30 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="w-14 h-11 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative shrink-0 shadow-2xs">
                            <img
                              src={imgUrl}
                              alt={itin.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/assets/mansalay_hero_bg.jpg';
                              }}
                            />
                          </div>
                        </td>

                        {/* Itinerary Title */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-gray-900 line-clamp-1 max-w-xs group-hover:text-pink-600 transition-colors">
                            {cleanItineraryTitle(itin.title || itin.name)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                              {itin.category || 'Travel Itinerary'}
                            </span>
                            {itin.location && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5 truncate max-w-[120px]">
                                <MapPin className="h-2.5 w-2.5 text-gray-400" />
                                {itin.location}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 font-bold rounded-lg text-[11px] border border-sky-100">
                            <Clock className="h-3 w-3 text-sky-500" />
                            {itin.duration || `${itin.days_count || 2} days`}
                          </span>
                        </td>

                        {/* Schedule Summary */}
                        <td className="py-3.5 px-4">
                          <div className="text-gray-700 font-semibold text-xs">
                            {itin.schedule_summary || `${itin.days_count || 2} Days`}
                          </div>
                          <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 max-w-xs">
                            {itin.description || 'Curated travel plan by Mansalay Tourism Office.'}
                          </p>
                        </td>

                        {/* Created By */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(itin.creator?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-xs flex items-center gap-1">
                                <span>{itin.creator?.name || 'Tourism Admin'}</span>
                                {isMyItin && (
                                  <span className="px-1.5 py-0.2 bg-purple-50 text-purple-600 text-[9px] font-extrabold rounded-md border border-purple-100">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 capitalize">
                                {itin.creator?.role || 'admin'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Published Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 text-[11px] font-medium">
                          {itin.published_date}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {itin.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Published
                            </span>
                          ) : itin.status === 'draft' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-full text-[10px] border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-[10px] border border-slate-200">
                              <Archive className="h-3 w-3 text-slate-400" />
                              Archived
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => handleOpenPreviewModal(itin)}
                              className="p-1.5 bg-gray-50 hover:bg-pink-50 text-gray-600 hover:text-pink-600 rounded-lg transition-colors cursor-pointer"
                              title="Preview as tourist sees it"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(itin)}
                              className="p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit itinerary details"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Toggle Quick Status */}
                            {itin.status === 'published' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(itin, 'draft')}
                                className="p-1.5 bg-gray-50 hover:bg-amber-50 text-gray-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Move to Draft"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(itin, 'published')}
                                className="p-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                title="Publish now"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItinerary(itin)}
                              className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete itinerary"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: CREATE / EDIT ITINERARY MODAL
      ────────────────────────────────────────────────────────────── */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitForm}
            className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col font-sans"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  {formId ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {formId ? 'Edit Official Itinerary' : 'Create Official Tourism Itinerary'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {formId
                      ? 'Update schedule, activities, and publication status.'
                      : 'Build and publish a recommended travel itinerary for Mansalay tourists.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 pt-5 text-xs">

              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Itinerary Title <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mansalay Coastal & Cultural 2-Day Getaway"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Trip Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-medium cursor-pointer"
                  >
                    {ITINERARY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Location & Publication Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Primary Location / Coverage</label>
                  <input
                    type="text"
                    placeholder="e.g. Mansalay, Oriental Mindoro"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Publication Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('published')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatus === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Published (Public)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('draft')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatus === 'draft'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>Draft (Private)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Cover Image Upload */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Cover Image</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-gray-200 shrink-0 border border-gray-300">
                    <img
                      src={formImagePreview || '/assets/mansalay_hero_bg.jpg'}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white border border-gray-300 hover:border-pink-400 hover:text-pink-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Choose Photo</span>
                      </button>
                      <span className="text-[11px] text-gray-400">High-resolution PNG, JPEG, and compatible image formats (configured server limit)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste an image URL directly"
                      value={formImagePreview.startsWith('blob:') ? '' : formImagePreview}
                      onChange={(e) => {
                        setFormImageFile(null);
                        setFormImagePreview(e.target.value);
                      }}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Summary Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of the trip, best times to go, and tourist highlights..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-medium"
                />
              </div>

              {/* Row 5: Key Highlights */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Itinerary Highlights</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Buktot Beach Coral Snorkeling"
                    value={newHighlightInput}
                    onChange={(e) => setNewHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHighlight();
                      }
                    }}
                    className="flex-1 p-2 border border-gray-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {formHighlights.map((hl, hIdx) => (
                    <span
                      key={hIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-full text-[11px] font-semibold"
                    >
                      <Sparkles className="h-3 w-3 text-pink-500" />
                      <span>{hl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(hIdx)}
                        className="hover:text-red-500 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* ── DAY-BY-DAY SCHEDULE BUILDER ── */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">
                      Day-by-Day Schedule ({formDays.length} {formDays.length === 1 ? 'Day' : 'Days'})
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Organize the timeline of activities, times, and recommended destination spots.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Another Day</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formDays.map((dayPlan, dayIdx) => (
                    <div
                      key={dayIdx}
                      className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/80 space-y-3"
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {dayPlan.day}
                          </span>
                          <input
                            type="text"
                            value={dayPlan.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormDays(prev => {
                                const next = [...prev];
                                next[dayIdx].title = val;
                                return next;
                              });
                            }}
                            className="font-extrabold text-pink-600 bg-transparent border-b border-pink-300 focus:outline-hidden text-xs flex-1"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddActivity(dayIdx)}
                            className="px-2.5 py-1 bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Spot</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(dayIdx)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete this entire day"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Activities for this Day */}
                      <div className="space-y-2.5">
                        {dayPlan.activities.map((act, actIdx) => (
                          <div
                            key={actIdx}
                            className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              {/* Time */}
                              <input
                                type="text"
                                placeholder="09:00 AM"
                                value={act.time}
                                onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'time', e.target.value)}
                                className="w-24 p-1.5 border border-gray-200 rounded-lg text-[11px] font-semibold text-pink-600 text-center shrink-0"
                              />

                              {/* Activity Name */}
                              <input
                                type="text"
                                placeholder="Activity description..."
                                value={act.activity}
                                onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'activity', e.target.value)}
                                className="flex-1 p-1.5 border border-gray-200 rounded-lg text-[11px] font-semibold"
                              />

                              {/* Remove Activity */}
                              <button
                                type="button"
                                onClick={() => handleRemoveActivity(dayIdx, actIdx)}
                                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                title="Remove activity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {/* Location selector / input */}
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                                {dynamicLocations.length > 0 ? (
                                  <select
                                    value={dynamicLocations.includes(act.location) ? act.location : ''}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleUpdateActivity(dayIdx, actIdx, 'location', e.target.value);
                                      }
                                    }}
                                    className="flex-1 p-1 border border-gray-200 rounded-lg text-[11px]"
                                  >
                                    <option value="" disabled>Select or type destination</option>
                                    {dynamicLocations.map((loc, lIdx) => (
                                      <option key={lIdx} value={loc}>
                                        {loc}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Destination location..."
                                    value={act.location}
                                    onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'location', e.target.value)}
                                    className="flex-1 p-1 border border-gray-200 rounded-lg text-[11px]"
                                  />
                                )}
                              </div>

                              {/* Optional notes */}
                              <input
                                type="text"
                                placeholder="Optional tourist notes / tips..."
                                value={act.notes || ''}
                                onChange={(e) => handleUpdateActivity(dayIdx, actIdx, 'notes', e.target.value)}
                                className="p-1 border border-gray-200 rounded-lg text-[11px] text-gray-500 italic"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[2.5]" />
                    <span>{formId ? 'Update Itinerary' : formStatus === 'draft' ? 'Save as Draft' : 'Publish Itinerary'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: TOURIST PREVIEW MODAL
      ────────────────────────────────────────────────────────────── */}
      {showPreviewModal && selectedItinerary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Header Hero Image */}
            <div className="relative h-56 bg-gray-900 shrink-0">
              <img
                src={formatImageUrl(selectedItinerary.image) || '/assets/mansalay_hero_bg.jpg'}
                alt={selectedItinerary.title}
                className="w-full h-full object-cover opacity-85"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/mansalay_hero_bg.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/45 to-transparent" />

              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-bold rounded-full">
                  Admin Tourist Preview
                </span>
                {selectedItinerary.status === 'published' ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                    Live on Website
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                    Draft Only
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 left-6 right-6 text-white flex items-end justify-between gap-4">
                <div>
                  <span className="px-3 py-1 bg-pink-500 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                    {selectedItinerary.category || 'Travel Itinerary'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black mt-2 leading-tight">
                    {cleanItineraryTitle(selectedItinerary.title || selectedItinerary.name)}
                  </h2>
                  <p className="text-xs text-gray-300 flex items-center gap-2 mt-1">
                    <Clock className="h-3.5 w-3.5 text-pink-400" />
                    <span>{selectedItinerary.duration}</span>
                    <span>•</span>
                    <MapPin className="h-3.5 w-3.5 text-pink-400" />
                    <span>{selectedItinerary.location || 'Mansalay'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handlePrintPreview}
                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      handleOpenEditModal(selectedItinerary);
                    }}
                    className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-full shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Days Schedule Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <p className="text-xs text-gray-600 leading-relaxed bg-pink-50/60 p-4 rounded-2xl border border-pink-100">
                {selectedItinerary.description || 'Curated travel plan curated by the Mansalay Tourism Office.'}
              </p>

              {/* Highlights */}
              {selectedItinerary.highlights && selectedItinerary.highlights.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Key Highlights
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItinerary.highlights.map((hl, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-pink-50 text-pink-700 text-xs font-semibold rounded-full border border-pink-100 flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3 w-3 text-pink-500" />
                        <span>{hl}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline of Days */}
              <div className="space-y-6">
                {selectedItinerary.days.map((dayPlan) => (
                  <div key={dayPlan.day} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                    <h3 className="text-sm font-extrabold text-pink-600 flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">
                        {dayPlan.day}
                      </span>
                      <span>{dayPlan.title}</span>
                    </h3>

                    <div className="space-y-3 relative border-l-2 border-pink-200 ml-3 pl-4">
                      {dayPlan.activities.map((act, actIdx) => (
                        <div key={actIdx} className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-white" />
                          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                                <span className="text-pink-500 text-[11px] font-semibold">{act.time}</span>
                                <span>•</span>
                                <span>{act.activity}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                                <MapPin className="h-3 w-3 text-pink-400" />
                                <span>{act.location}</span>
                              </div>
                              {act.notes && (
                                <p className="text-[10px] text-gray-400 italic mt-1">{act.notes}</p>
                              )}
                            </div>

                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(act.location)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-full text-[11px] font-bold flex items-center gap-1 self-start sm:self-center transition-colors"
                            >
                              <Navigation className="h-3 w-3" /> Map
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">
                Created by {selectedItinerary.creator?.name || 'Tourism Admin'} • {selectedItinerary.published_date}
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
