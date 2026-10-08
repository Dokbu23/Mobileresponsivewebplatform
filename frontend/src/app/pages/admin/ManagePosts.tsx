import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  Store,
  Hotel,
  Play,
  Film
} from 'lucide-react';
import { toast } from 'sonner';
import { getJSON, postJSON, deleteJSON, formatImageUrl, API_BASE } from '../../lib/api';

interface ModerationHistoryItem {
  action: 'submitted' | 'approved' | 'rejected' | 'resubmitted';
  timestamp: string;
  admin_id?: number;
  admin_name?: string;
  user_id?: number;
  user_name?: string;
  remarks?: string;
  note?: string;
}

interface PostOwner {
  id: number;
  name: string;
  email?: string;
  role: 'resort' | 'enterprise' | 'tourist' | 'admin';
  store_name?: string;
  store_logo?: string;
  resort_name?: string;
  resort_images?: any;
}

interface ModerationPost {
  id: number;
  user_id: number;
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
  tags?: string[] | string;
  likes: number;
  saves: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_remarks?: string;
  moderation_history?: ModerationHistoryItem[];
  created_at: string;
  updated_at: string;
  user?: PostOwner;
  approver?: { id: number; name: string };
  rejecter?: { id: number; name: string };
}

interface ModerationCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const PRESET_REMARKS = [
  'Incomplete business details or missing contact information',
  'Please upload clearer, higher quality photos',
  'Missing room pricing, rate details, or package inclusions',
  'Content violates DiscoverMansalay community guidelines',
  'Duplicate post or outdated promotional information',
];

export function ManagePosts() {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [counts, setCounts] = useState<ModerationCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'resort' | 'enterprise'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [selectedPost, setSelectedPost] = useState<ModerationPost | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Active image in view modal carousel
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Load posts from moderation API
  const fetchModerationPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (accountTypeFilter !== 'all') params.append('account_type', accountTypeFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const data = await getJSON(`/admin/moderation/posts?${params.toString()}`);
      if (data) {
        setPosts(data.posts || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err: any) {
      console.error('Failed to load moderation posts:', err);
      toast.error('Could not load posts for moderation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationPosts();
  }, [statusFilter, accountTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchModerationPosts();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setAccountTypeFilter('all');
    setCurrentPage(1);
  };

  // Approve action
  const handleApprove = async (post: ModerationPost) => {
    const postTitle = post.product_name || post.title || 'Untitled Post';
    const result = await Swal.fire({
      title: 'Approve Post?',
      text: `Are you sure you want to approve "${postTitle}"? It will become publicly visible immediately.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, approve it',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoadingId(post.id);
      await postJSON(`/admin/moderation/posts/${post.id}/approve`, {});
      
      Swal.fire({
        icon: 'success',
        title: 'Post Approved!',
        text: `"${postTitle}" is now publicly visible.`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        toast: true,
        position: 'top-end',
      });
      
      // Update local state
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: 'approved', rejection_remarks: undefined } : p))
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, post.status === 'pending' ? prev.pending - 1 : prev.pending),
        rejected: Math.max(0, post.status === 'rejected' ? prev.rejected - 1 : prev.rejected),
        approved: post.status !== 'approved' ? prev.approved + 1 : prev.approved,
      }));

      if (selectedPost?.id === post.id) {
        setIsViewModalOpen(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: err.message || 'Failed to approve post.',
        showConfirmButton: false,
        timer: 2500,
        toast: true,
        position: 'top-end',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open reject modal
  const openRejectModal = (post: ModerationPost) => {
    setSelectedPost(post);
    setRejectionRemarks(post.rejection_remarks || '');
    setIsRejectModalOpen(true);
  };

  // Submit rejection
  const handleConfirmReject = async () => {
    if (!selectedPost) return;
    if (!rejectionRemarks.trim() || rejectionRemarks.trim().length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Remarks Required',
        text: 'Please provide a remark explaining the reason for rejection (at least 3 characters).',
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'OK',
      });
      return;
    }

    try {
      setActionLoadingId(selectedPost.id);
      await postJSON(`/admin/moderation/posts/${selectedPost.id}/reject`, {
        remarks: rejectionRemarks.trim(),
      });

      Swal.fire({
        icon: 'success',
        title: 'Post Rejected',
        text: 'The post has been rejected and returned to owner with remarks.',
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
        toast: true,
        position: 'top-end',
      });
      
      const updatedRemarks = rejectionRemarks.trim();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? { ...p, status: 'rejected', rejection_remarks: updatedRemarks }
            : p
        )
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, selectedPost.status === 'pending' ? prev.pending - 1 : prev.pending),
        approved: Math.max(0, selectedPost.status === 'approved' ? prev.approved - 1 : prev.approved),
        rejected: selectedPost.status !== 'rejected' ? prev.rejected + 1 : prev.rejected,
      }));

      setIsRejectModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedPost(null);
      setRejectionRemarks('');
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Rejection Failed',
        text: err.message || 'Failed to reject post.',
        showConfirmButton: false,
        timer: 2500,
        toast: true,
        position: 'top-end',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete post with SweetAlert confirmation
  const handleDeletePost = async (post: ModerationPost) => {
    const postTitle = post.product_name || post.title || 'this post';
    const result = await Swal.fire({
      title: 'Delete Post?',
      text: `Are you sure you want to permanently delete "${postTitle}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoadingId(post.id);
      await deleteJSON(`/enterprise-posts/${post.id}`);
      
      Swal.fire({
        icon: 'success',
        title: 'Post Deleted',
        text: 'The post has been deleted permanently.',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        toast: true,
        position: 'top-end',
      });

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setCounts((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        pending: post.status === 'pending' ? Math.max(0, prev.pending - 1) : prev.pending,
        approved: post.status === 'approved' ? Math.max(0, prev.approved - 1) : prev.approved,
        rejected: post.status === 'rejected' ? Math.max(0, prev.rejected - 1) : prev.rejected,
      }));

      if (selectedPost?.id === post.id) {
        setIsViewModalOpen(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message || 'Failed to delete post.',
        showConfirmButton: false,
        timer: 2500,
        toast: true,
        position: 'top-end',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Client-side pagination
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (accountTypeFilter !== 'all') {
        const role = p.user?.role?.toLowerCase();
        if (role !== accountTypeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contentMatch = p.content?.toLowerCase().includes(q);
        const titleMatch = p.product_name?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q);
        const ownerMatch =
          p.user?.name?.toLowerCase().includes(q) ||
          p.user?.store_name?.toLowerCase().includes(q) ||
          p.user?.resort_name?.toLowerCase().includes(q);
        if (!contentMatch && !titleMatch && !ownerMatch) return false;
      }
      return true;
    });
  }, [posts, statusFilter, accountTypeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage) || 1;
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPosts.slice(start, start + itemsPerPage);
  }, [filteredPosts, currentPage, itemsPerPage]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { date: '—', time: '' };
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  const getOwnerDisplayName = (post: ModerationPost) => {
    return (
      post.user?.resort_name ||
      post.user?.store_name ||
      post.seller_name ||
      post.user?.name ||
      'Business Partner'
    );
  };

  const getOwnerRoleLabel = (post: ModerationPost) => {
    if (post.user?.role === 'resort') return 'Resort';
    if (post.user?.role === 'enterprise') return 'Enterprise';
    return post.user?.role ? post.user.role.toUpperCase() : 'Partner';
  };

  const getPostPrimaryImage = (post: ModerationPost) => {
    if (post.image) return formatImageUrl(post.image);
    if (Array.isArray(post.images) && post.images.length > 0) return formatImageUrl(post.images[0]);
    return '/assets/mansalay_hero_bg.jpg';
  };

  const getAllMedia = (post: ModerationPost) => {
    const list: string[] = [];
    if (Array.isArray(post.images) && post.images.length > 0) {
      post.images.forEach((img) => list.push(formatImageUrl(img)));
    } else if (post.image) {
      list.push(formatImageUrl(post.image));
    }
    return list;
  };

  const getTypeBadgeStyle = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('resort') || t.includes('room')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (t.includes('product')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (t.includes('attraction')) {
      return 'bg-teal-50 text-teal-700 border-teal-200';
    }
    if (t.includes('event')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── TOP HEADER & BANNER ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Admin Panel
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Manage Posts
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl mt-1">
              Review and moderate posts from Resort and Enterprise accounts. Approve or reject content to ensure quality and relevance for DiscoverMansalay.
            </p>
          </div>

          {/* Right info card: Keeping DiscoverMansalay safe and reliable */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-teal-200/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm max-w-md">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-300 text-teal-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                Keeping DiscoverMansalay safe and reliable
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Reviewing posts helps us maintain high quality content for our visitors and community.
              </p>
            </div>
          </div>
        </div>

        {/* ── 4 STAT METRIC CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Pending Review */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`text-left transition-all p-5 rounded-2xl border flex items-center justify-between group ${
              statusFilter === 'pending'
                ? 'bg-amber-100/70 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/80 hover:border-amber-300'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-amber-900">Pending Review</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900">
                {counts.pending}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500/70 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* 2. Approved */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
            className={`text-left transition-all p-5 rounded-2xl border flex items-center justify-between group ${
              statusFilter === 'approved'
                ? 'bg-emerald-100/70 border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                : 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-200/80 hover:border-emerald-300'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-emerald-900">Approved</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900">
                {counts.approved}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-500/70 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* 3. Rejected */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
            className={`text-left transition-all p-5 rounded-2xl border flex items-center justify-between group ${
              statusFilter === 'rejected'
                ? 'bg-rose-100/70 border-rose-400 shadow-md ring-2 ring-rose-400/30'
                : 'bg-rose-50/40 hover:bg-rose-50/80 border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-rose-900">Rejected</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900">
                {counts.rejected}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-rose-500/70 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* 4. Total Posts */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-left transition-all p-5 rounded-2xl border flex items-center justify-between group ${
              statusFilter === 'all'
                ? 'bg-blue-100/70 border-blue-400 shadow-md ring-2 ring-blue-400/30'
                : 'bg-blue-50/40 hover:bg-blue-50/80 border-blue-200/80 hover:border-blue-300'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-blue-900">Total Posts</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900">
                {counts.total}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-500/70 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, owner, or content..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="py-2.5 px-3 bg-gray-50/60 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Account Type Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Account Type</span>
              <select
                value={accountTypeFilter}
                onChange={(e) => {
                  setAccountTypeFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="py-2.5 px-3 bg-gray-50/60 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">All Accounts</option>
                <option value="resort">Resort</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Filter Action Buttons */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="submit"
                className="px-4 py-2.5 border border-pink-300 text-pink-600 bg-pink-50/60 hover:bg-pink-100/70 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>
              {(searchQuery || statusFilter !== 'all' || accountTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-2.5 text-xs text-gray-500 hover:text-gray-800 font-semibold transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── POSTS TABLE ── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4 sm:px-6">Post</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date Submitted</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium">Loading moderation posts...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="w-10 h-10 text-gray-300" />
                        <span className="text-sm font-semibold text-gray-600">No posts found</span>
                        <p className="text-xs text-gray-400 max-w-sm">
                          {statusFilter !== 'all' || searchQuery
                            ? 'Try adjusting your search criteria or filter options.'
                            : 'There are currently no posts waiting for review.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPosts.map((post) => {
                    const postTitle = post.product_name || post.title || 'Untitled Post';
                    const dateObj = formatDate(post.created_at);
                    const ownerName = getOwnerDisplayName(post);
                    const roleLabel = getOwnerRoleLabel(post);
                    const primaryImg = getPostPrimaryImage(post);

                    return (
                      <tr key={post.id} className="hover:bg-gray-50/60 transition-colors group">
                        {/* POST COLUMN */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3.5 min-w-[240px]">
                            <img
                              src={primaryImg}
                              alt={postTitle}
                              className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl object-cover border border-gray-200/80 shadow-xs shrink-0"
                              onError={(e: any) => {
                                e.target.src = '/assets/mansalay_hero_bg.jpg';
                              }}
                            />
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate max-w-[220px] sm:max-w-[280px]">
                                {postTitle}
                              </h4>
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-[220px] sm:max-w-[280px]">
                                {post.content}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* OWNER COLUMN */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              {post.user?.store_logo ? (
                                <img
                                  src={formatImageUrl(post.user.store_logo)}
                                  alt={ownerName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                ownerName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-xs sm:text-sm truncate max-w-[140px]">
                                {ownerName}
                              </div>
                              <div className="text-[11px] text-gray-400 capitalize">
                                {roleLabel}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* TYPE COLUMN */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${getTypeBadgeStyle(
                              post.type
                            )}`}
                          >
                            {post.type}
                          </span>
                        </td>

                        {/* STATUS COLUMN */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {post.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          )}
                          {post.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approved
                            </span>
                          )}
                          {post.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* DATE SUBMITTED COLUMN */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-800">{dateObj.date}</div>
                          <div className="text-[11px] text-gray-400">{dateObj.time}</div>
                        </td>

                        {/* ACTIONS COLUMN */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* View Button */}
                            <button
                              onClick={() => {
                                setSelectedPost(post);
                                setActiveMediaIndex(0);
                                setIsViewModalOpen(true);
                              }}
                              className="px-3 py-1.5 border border-blue-200 text-blue-600 bg-blue-50/40 hover:bg-blue-100/60 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Pending State Actions: Approve & Reject */}
                            {post.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(post)}
                                  disabled={actionLoadingId === post.id}
                                  className="px-3 py-1.5 border border-emerald-200 text-emerald-600 bg-emerald-50/40 hover:bg-emerald-100/60 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => openRejectModal(post)}
                                  disabled={actionLoadingId === post.id}
                                  className="px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/40 hover:bg-rose-100/60 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* Rejected State: Show Remarks Button & Re-approve */}
                            {post.status === 'rejected' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPost(post);
                                    setIsRemarksModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 border border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Remarks</span>
                                </button>
                                <button
                                  onClick={() => handleApprove(post)}
                                  disabled={actionLoadingId === post.id}
                                  className="px-2.5 py-1.5 border border-emerald-200 text-emerald-600 bg-emerald-50/40 hover:bg-emerald-100/60 font-semibold text-xs rounded-lg transition-colors"
                                  title="Approve post"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Approved State: Option to revoke / reject */}
                            {post.status === 'approved' && (
                              <button
                                onClick={() => openRejectModal(post)}
                                className="px-2.5 py-1.5 border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 font-semibold text-xs rounded-lg transition-colors"
                                title="Revoke approval and reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Dropdown Menu for Delete / More */}
                            <button
                              onClick={() => handleDeletePost(post)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Delete post permanently"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION CONTROLS ── */}
          <div className="py-4 px-4 sm:px-6 border-t border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-bold text-gray-700">
                {filteredPosts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-gray-700">
                {Math.min(currentPage * itemsPerPage, filteredPosts.length)}
              </span>{' '}
              of <span className="font-bold text-gray-700">{filteredPosts.length}</span> posts
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    currentPage === pg
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL 1: VIEW POST DETAILS ── */}
      {isViewModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${getTypeBadgeStyle(
                      selectedPost.type
                    )}`}
                  >
                    {selectedPost.type}
                  </span>
                  {selectedPost.status === 'pending' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Review
                    </span>
                  )}
                  {selectedPost.status === 'approved' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Approved
                    </span>
                  )}
                  {selectedPost.status === 'rejected' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Rejected
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 leading-snug">
                  {selectedPost.product_name || selectedPost.title || 'Post Details'}
                </h3>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Media Gallery / Carousel */}
              {(() => {
                const media = getAllMedia(selectedPost);
                if (media.length === 0 && !selectedPost.video) return null;

                return (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 border border-gray-200">
                      {selectedPost.video ? (
                        <video
                          src={selectedPost.video}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={media[activeMediaIndex] || media[0]}
                          alt="Post preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {media.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {media.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveMediaIndex(idx)}
                            className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                              activeMediaIndex === idx ? 'border-blue-600 scale-105' : 'border-transparent opacity-70'
                            }`}
                          >
                            <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Owner Information Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                    {getOwnerDisplayName(selectedPost).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">
                      {getOwnerDisplayName(selectedPost)}
                    </h5>
                    <p className="text-xs text-gray-500">
                      {getOwnerRoleLabel(selectedPost)} Account {selectedPost.user?.email && `• ${selectedPost.user.email}`}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>Submitted on</div>
                  <div className="font-semibold text-gray-700">
                    {formatDate(selectedPost.created_at).date}
                  </div>
                </div>
              </div>

              {/* Post Meta Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedPost.price && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-semibold text-gray-400 block">Price / Rate</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPost.price}</span>
                  </div>
                )}
                {selectedPost.category && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-semibold text-gray-400 block">Category</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPost.category}</span>
                  </div>
                )}
                {selectedPost.stock && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-semibold text-gray-400 block">Stock / Capacity</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPost.stock}</span>
                  </div>
                )}
                {selectedPost.location && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-semibold text-gray-400 block">Location</span>
                    <span className="text-sm font-bold text-gray-900 truncate block">{selectedPost.location}</span>
                  </div>
                )}
              </div>

              {/* Post Description / Content */}
              <div>
                <h6 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Content / Description
                </h6>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selectedPost.content}
                </div>
              </div>

              {/* Rejection Remarks Warning if rejected */}
              {selectedPost.status === 'rejected' && selectedPost.rejection_remarks && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h6 className="text-xs font-bold text-rose-900">Rejection Remarks sent to owner</h6>
                    <p className="text-sm text-rose-800 mt-1">{selectedPost.rejection_remarks}</p>
                  </div>
                </div>
              )}

              {/* Moderation History Audit Log */}
              {Array.isArray(selectedPost.moderation_history) && selectedPost.moderation_history.length > 0 && (
                <div>
                  <h6 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Moderation History
                  </h6>
                  <div className="space-y-2">
                    {selectedPost.moderation_history.map((log, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-xl border border-gray-200/60">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.action === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            log.action === 'rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-gray-700 font-medium">
                            {log.admin_name ? `By ${log.admin_name}` : log.note || 'Action taken'}
                          </span>
                        </div>
                        <span className="text-gray-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/70 rounded-b-3xl flex items-center justify-between gap-3">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold text-xs transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2.5">
                {selectedPost.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openRejectModal(selectedPost);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Post</span>
                  </button>
                )}
                {selectedPost.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(selectedPost)}
                    disabled={actionLoadingId === selectedPost.id}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Post</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REJECT POST WITH REMARKS ── */}
      {isRejectModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Reject Post</h3>
                  <p className="text-xs text-gray-500">Provide required feedback to the owner</p>
                </div>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Please explain why this post cannot be published. The business owner will receive your remarks and will be able to edit and resubmit their post for re-review.
              </p>

              {/* Quick Reason Presets */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                  Quick Reason Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REMARKS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionRemarks(preset)}
                      className="text-left px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/70 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-xs text-gray-700 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Rejection Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="Specify what needs to be corrected before approval..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                  <span>Minimum 3 characters required</span>
                  <span>{rejectionRemarks.length}/2000</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/70 rounded-b-3xl flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === selectedPost.id || !rejectionRemarks.trim() || rejectionRemarks.trim().length < 3}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: VIEW / REVISE REMARKS ── */}
      {isRemarksModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Rejection Remarks</h3>
                  <p className="text-xs text-gray-500">Notice sent to {getOwnerDisplayName(selectedPost)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRemarksModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-900 leading-relaxed">
                {selectedPost.rejection_remarks || 'No remarks provided.'}
              </div>
              <p className="text-[11px] text-gray-400">
                The business owner has been notified. When they edit and resubmit this post, it will return to Pending Review.
              </p>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/70 rounded-b-3xl flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRemarksModalOpen(false);
                  openRejectModal(selectedPost);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold text-xs transition-colors"
              >
                Edit Remarks
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRemarksModalOpen(false);
                  handleApprove(selectedPost);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Approve Post Instead</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
