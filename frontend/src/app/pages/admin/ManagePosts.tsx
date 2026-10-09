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
  Film,
  Archive,
  Trash2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Compass,
  Palmtree,
  Landmark,
  BookOpen,
  ShoppingBag,
  Building2,
  Plus,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { getJSON, postJSON, putJSON, deleteJSON, formatImageUrl, API_BASE } from '../../lib/api';

export type UnifiedSource =
  | 'enterprise_post'
  | 'accommodation'
  | 'product'
  | 'attraction'
  | 'event'
  | 'culture_art'
  | 'history';

export type ContentType =
  | 'Resort'
  | 'Enterprise'
  | 'Accommodation'
  | 'Product'
  | 'Attraction'
  | 'Event'
  | 'Itinerary'
  | 'Culture & Arts'
  | 'History';

export type AccountType = 'Admin' | 'Resort' | 'Enterprise';
export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface PostAccountInfo {
  id?: number;
  name: string;
  role: string;
  email?: string | null;
  store_name?: string | null;
  resort_name?: string | null;
  logo?: string | null;
}

export interface UnifiedPost {
  id: number;
  source: UnifiedSource;
  content_type: ContentType;
  account_type: AccountType;
  title: string;
  name: string;
  content?: string;
  description?: string;
  full_description?: string;
  status: ContentStatus;
  previous_status?: 'pending' | 'approved' | 'rejected' | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  owner: PostAccountInfo;
  author?: PostAccountInfo;
  image?: string;
  images: string[];
  price?: number | string | null;
  location?: string | null;
  category?: string | null;
  rejection_remarks?: string | null;
  raw?: any;
}

export const getPostOwner = (post: { owner?: PostAccountInfo; author?: PostAccountInfo }): PostAccountInfo => {
  return post.owner || post.author || {
    name: 'Tourism Admin',
    role: 'admin',
  };
};

interface StatCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
}

const PRESET_REMARKS = [
  'Incomplete business details or missing contact information',
  'Please upload clearer, higher quality photos',
  'Missing pricing, rate details, or package inclusions',
  'Content violates DiscoverMansalay community guidelines',
  'Duplicate post or outdated promotional information',
  'Incorrect category or location details provided',
];

export function ManagePosts() {
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [counts, setCounts] = useState<StatCounts>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'archived'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [selectedPost, setSelectedPost] = useState<UnifiedPost | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    price: '',
    location: '',
    category: '',
  });

  // Carousel in view modal
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Fetch all posts from central backend API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (contentTypeFilter !== 'all') params.append('content_type', contentTypeFilter);
      if (accountTypeFilter !== 'all') params.append('account_type', accountTypeFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const data = await getJSON(`/admin/manage-posts?${params.toString()}`);
      if (data && data.success) {
        setPosts(data.posts || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      } else {
        setPosts([]);
      }
    } catch (err: any) {
      console.error('Failed to load manage posts:', err);
      toast.error('Could not load posts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, contentTypeFilter, accountTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPosts();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setContentTypeFilter('all');
    setAccountTypeFilter('all');
    setCurrentPage(1);
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    contentTypeFilter !== 'all' ||
    accountTypeFilter !== 'all';

  // Helper key for loading state
  const makeKey = (p: UnifiedPost) => `${p.source}-${p.id}`;

  // ==========================================
  // ACTION: APPROVE
  // ==========================================
  const handleApprove = async (post: UnifiedPost) => {
    const postTitle = post.title || post.name || 'Untitled Post';
    const result = await Swal.fire({
      title: 'Approve Content?',
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
      setActionLoadingKey(makeKey(post));
      await postJSON(`/admin/manage-posts/${post.source}/${post.id}/approve`, {});

      Swal.fire({
        icon: 'success',
        title: 'Post Approved!',
        text: `"${postTitle}" is now publicly visible.`,
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });

      // Refresh list
      fetchPosts();
      if (selectedPost && selectedPost.id === post.id && selectedPost.source === post.source) {
        setIsViewModalOpen(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: err.message || 'Failed to approve content.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  // ==========================================
  // ACTION: REJECT
  // ==========================================
  const openRejectModal = (post: UnifiedPost) => {
    setSelectedPost(post);
    setRejectionRemarks(post.rejection_remarks || '');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedPost) return;
    if (!rejectionRemarks.trim() || rejectionRemarks.trim().length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Remarks Required',
        text: 'Please provide clear feedback explaining why this submission is being rejected.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    try {
      setActionLoadingKey(makeKey(selectedPost));
      await postJSON(`/admin/manage-posts/${selectedPost.source}/${selectedPost.id}/reject`, {
        rejection_remarks: rejectionRemarks.trim(),
      });

      Swal.fire({
        icon: 'info',
        title: 'Post Rejected',
        text: 'Feedback has been logged and creator will be notified.',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });

      setIsRejectModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedPost(null);
      setRejectionRemarks('');
      fetchPosts();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Rejection Failed',
        text: err.message || 'Failed to reject content.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  // ==========================================
  // ACTION: ARCHIVE (Safe Guard)
  // ==========================================
  const handleArchive = async (post: UnifiedPost) => {
    const postTitle = post.title || post.name || 'Untitled Content';
    const result = await Swal.fire({
      title: 'Archive This Content?',
      html: `
        <div class="text-left text-sm text-slate-600 dark:text-slate-300">
          <p class="mb-2">Are you sure you want to archive <strong>"${postTitle}"</strong>?</p>
          <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <strong>What happens when archived:</strong>
            <ul class="list-disc ml-4 mt-1 space-y-1">
              <li>It will be <strong>immediately hidden</strong> from tourists and public feeds.</li>
              <li>Its current status (<code>${post.status}</code>) will be saved as previous status.</li>
              <li>It can be <strong>restored anytime</strong> or permanently deleted from the Archived tab.</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, move to archive',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoadingKey(makeKey(post));
      await postJSON(`/admin/manage-posts/${post.source}/${post.id}/archive`, {});

      toast.success(`"${postTitle}" moved to Archive.`);
      fetchPosts();
      if (selectedPost && selectedPost.id === post.id && selectedPost.source === post.source) {
        setIsViewModalOpen(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Archive Failed',
        text: err.message || 'Could not archive this post.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  // ==========================================
  // ACTION: RESTORE (Returns to previous_status)
  // ==========================================
  const handleRestore = async (post: UnifiedPost) => {
    const postTitle = post.title || post.name || 'Untitled Content';
    const targetStatus = post.previous_status || 'approved';

    const result = await Swal.fire({
      title: 'Restore Content?',
      html: `
        <div class="text-left text-sm text-slate-600 dark:text-slate-300">
          <p class="mb-2">Do you want to restore <strong>"${postTitle}"</strong> from archive?</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            It will be returned to its original status: <span class="font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">${targetStatus}</span>.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, restore it',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoadingKey(makeKey(post));
      await postJSON(`/admin/manage-posts/${post.source}/${post.id}/restore`, {});

      toast.success(`"${postTitle}" restored to ${targetStatus}.`);
      fetchPosts();
      if (selectedPost && selectedPost.id === post.id && selectedPost.source === post.source) {
        setIsViewModalOpen(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Restore Failed',
        text: err.message || 'Could not restore content.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  // ==========================================
  // ACTION: PERMANENT DELETE (Only for archived)
  // ==========================================
  const handlePermanentDelete = async (post: UnifiedPost) => {
    if (post.status !== 'archived') {
      Swal.fire({
        icon: 'error',
        title: 'Action Blocked',
        text: 'Security Policy: Active posts cannot be deleted directly. You must archive it first.',
        confirmButtonColor: '#ef4444',
      });
      return;
    }

    const postTitle = post.title || post.name || 'Untitled Content';
    const result = await Swal.fire({
      title: 'Permanently Delete?',
      html: `
        <div class="text-left text-sm text-slate-700 dark:text-slate-300 space-y-3">
          <p>You are about to <strong>permanently purge</strong> the following record:</p>
          <div class="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300">
            <p class="font-bold text-sm mb-1">${postTitle}</p>
            <p class="text-xs">Type: <span class="font-medium">${post.content_type}</span> | Source: <span class="font-mono text-xs">${post.source} #${post.id}</span></p>
          </div>
          <p class="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            This action CANNOT be undone. The database record will be permanently erased.
          </p>
        </div>
      `,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, permanently delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoadingKey(makeKey(post));
      await deleteJSON(`/admin/manage-posts/${post.source}/${post.id}`);

      Swal.fire({
        icon: 'success',
        title: 'Deleted Permanently',
        text: `"${postTitle}" has been purged from the system.`,
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
      });

      fetchPosts();
      if (selectedPost && selectedPost.id === post.id && selectedPost.source === post.source) {
        setIsViewModalOpen(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message || 'Could not permanently delete post.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  // ==========================================
  // ACTION: EDIT
  // ==========================================
  const openEditModal = (post: UnifiedPost) => {
    setSelectedPost(post);
    setEditFormData({
      title: post.title || post.name || '',
      content: post.content || '',
      price: post.price ? String(post.price) : '',
      location: post.location || '',
      category: post.category || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    if (!editFormData.title.trim()) {
      toast.error('Title or name is required.');
      return;
    }

    try {
      setActionLoadingKey(makeKey(selectedPost));
      await putJSON(`/admin/manage-posts/${selectedPost.source}/${selectedPost.id}`, {
        title: editFormData.title.trim(),
        name: editFormData.title.trim(),
        content: editFormData.content.trim(),
        description: editFormData.content.trim(),
        price: editFormData.price ? parseFloat(editFormData.price) : null,
        location: editFormData.location.trim() || null,
        category: editFormData.category.trim() || null,
      });

      toast.success('Post details updated successfully.');
      setIsEditModalOpen(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'Could not update post details.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  // Open view modal
  const openViewModal = (post: UnifiedPost) => {
    setSelectedPost(post);
    setActiveMediaIndex(0);
    setIsViewModalOpen(true);
  };

  // Helper icons and styles for Content Types
  const getContentTypeBadge = (type: ContentType) => {
    switch (type) {
      case 'Resort':
        return {
          icon: Palmtree,
          color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        };
      case 'Enterprise':
        return {
          icon: Store,
          color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        };
      case 'Accommodation':
        return {
          icon: Hotel,
          color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        };
      case 'Product':
        return {
          icon: ShoppingBag,
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'Attraction':
        return {
          icon: Compass,
          color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        };
      case 'Event':
        return {
          icon: Calendar,
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'Itinerary':
        return {
          icon: Layers,
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'Culture & Arts':
        return {
          icon: Landmark,
          color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      case 'History':
        return {
          icon: BookOpen,
          color: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          icon: FileText,
          color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const getAccountTypeBadge = (role: AccountType) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Resort':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Enterprise':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle2,
          class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'pending':
        return {
          label: 'Pending Review',
          icon: Clock,
          class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          class: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      case 'archived':
        return {
          label: 'Archived',
          icon: Archive,
          class: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        };
    }
  };

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(posts.length / itemsPerPage));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return posts.slice(start, start + itemsPerPage);
  }, [posts, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Admin Control Center
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">All 9 Content Modules</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Manage Posts & Content
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Centralized management system for all platform listings, business feeds, attractions, stays, products, and culture posts. Securely review, update, or archive content.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={fetchPosts}
                disabled={loading}
                title="Refresh listings"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <Link
                to="/admin/publish"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Content</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* ========================================================= */}
        {/* 5 SUMMARY STAT CARDS (Interactive status switchers) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Total Posts */}
          <button
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group shadow-2xs ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Posts</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{counts.total}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>All 9 content types</span>
            </div>
          </button>

          {/* 2. Pending Review */}
          <button
            onClick={() => {
              setStatusFilter('pending');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group shadow-2xs ${
              statusFilter === 'pending'
                ? 'bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                Pending Review
                {counts.pending > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{counts.pending}</div>
            <div className="text-[11px] text-slate-400 mt-1">Requires review</div>
          </button>

          {/* 3. Approved / Published */}
          <button
            onClick={() => {
              setStatusFilter('approved');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group shadow-2xs ${
              statusFilter === 'approved'
                ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Approved</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{counts.approved}</div>
            <div className="text-[11px] text-slate-400 mt-1">Live on platform</div>
          </button>

          {/* 4. Rejected */}
          <button
            onClick={() => {
              setStatusFilter('rejected');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group shadow-2xs ${
              statusFilter === 'rejected'
                ? 'bg-white dark:bg-slate-900 border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Rejected</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{counts.rejected}</div>
            <div className="text-[11px] text-slate-400 mt-1">With remarks</div>
          </button>

          {/* 5. Archived */}
          <button
            onClick={() => {
              setStatusFilter('archived');
              setCurrentPage(1);
            }}
            className={`col-span-2 sm:col-span-1 p-4 rounded-xl text-left border transition-all relative overflow-hidden group shadow-2xs ${
              statusFilter === 'archived'
                ? 'bg-white dark:bg-slate-900 border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Archived</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Archive className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{counts.archived}</div>
            <div className="text-[11px] text-slate-400 mt-1">Hidden from public</div>
          </button>
        </div>

        {/* ========================================================= */}
        {/* FILTER & SEARCH TOOLBAR */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, author, location..."
                className="w-full pl-10 pr-20 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Search
              </button>
            </form>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Content Type Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={contentTypeFilter}
                  onChange={(e) => {
                    setContentTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Content Types</option>
                  <option value="Resort">Resort Posts</option>
                  <option value="Enterprise">Enterprise Posts</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Product">Product</option>
                  <option value="Attraction">Attraction</option>
                  <option value="Event">Event</option>
                  <option value="Itinerary">Itinerary</option>
                  <option value="Culture & Arts">Culture & Arts</option>
                  <option value="History">History</option>
                </select>
              </div>

              {/* Account Type Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={accountTypeFilter}
                  onChange={(e) => {
                    setAccountTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-36 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Accounts</option>
                  <option value="Admin">Admin</option>
                  <option value="Resort">Resort Owner</option>
                  <option value="Enterprise">Enterprise Owner</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-36 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Reset Filters */}
              {isAnyFilterActive && (
                <button
                  onClick={handleClearFilters}
                  title="Clear all filters"
                  className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* POSTS TABLE / CONTENT LIST */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading posts from all 9 modules...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No content found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {isAnyFilterActive
                  ? 'No posts matched the active filter criteria. Try clearing your search or filters.'
                  : 'There are currently no posts created in this category.'}
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors border border-emerald-200 dark:border-emerald-800"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Content</th>
                    <th className="py-3.5 px-4">Owner / Publisher</th>
                    <th className="py-3.5 px-3">Content Type</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedPosts.map((post) => {
                    const postKey = makeKey(post);
                    const isLoading = actionLoadingKey === postKey;
                    const typeBadge = getContentTypeBadge(post.content_type);
                    const TypeIcon = typeBadge.icon;
                    const statusBadge = getStatusBadge(post.status);
                    const StatusIcon = statusBadge.icon;

                    const displayImg = post.image || (post.images && post.images[0]);
                    const postTitle = post.title || post.name || 'Untitled Post';

                    return (
                      <tr
                        key={postKey}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${
                          post.status === 'archived' ? 'opacity-85 bg-slate-50/30 dark:bg-slate-900/30' : ''
                        }`}
                      >
                        {/* 1. Content (Photo, Title, Excerpt) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-3 min-w-[240px] max-w-sm">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden relative flex items-center justify-center">
                              {displayImg ? (
                                <img
                                  src={formatImageUrl(displayImg)}
                                  alt={postTitle}
                                  className="w-full h-full object-cover"
                                  onError={(e: any) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <TypeIcon className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5" title={postTitle}>
                                <span>{postTitle}</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {post.content || post.description || 'No description provided'}
                              </p>
                              {post.location && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{post.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Owner / Publisher */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {(() => {
                            const postOwner = getPostOwner(post);
                            return (
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                  {postOwner.name || 'Mansalay Tourism'}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`inline-block px-1.5 py-0.2 rounded-sm text-[10px] font-semibold border ${getAccountTypeBadge(
                                      post.account_type
                                    )}`}
                                  >
                                    {post.account_type}
                                  </span>
                                  {postOwner.store_name && (
                                    <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                      {postOwner.store_name}
                                    </span>
                                  )}
                                  {!postOwner.store_name && postOwner.resort_name && (
                                    <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                      {postOwner.resort_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* 3. Content Type */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${typeBadge.color}`}
                          >
                            <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{post.content_type}</span>
                          </span>
                        </td>

                        {/* 4. Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.class}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{statusBadge.label}</span>
                            </span>
                            {post.status === 'archived' && post.previous_status && (
                              <span className="text-[10px] text-slate-400 pl-1">
                                was: <span className="font-medium uppercase">{post.previous_status}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          <div>
                            {new Date(post.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          {post.archived_at && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                              Archived: {new Date(post.archived_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* 6. Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* VIEW (Available for all posts) */}
                            <button
                              onClick={() => openViewModal(post)}
                              disabled={isLoading}
                              title="View full details"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* ---------------------------------------------------- */}
                            {/* ACTIVE POST ACTIONS (Pending / Approved / Rejected)   */}
                            {/* ---------------------------------------------------- */}
                            {post.status !== 'archived' && (
                              <>
                                {/* Quick Approve for pending */}
                                {post.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(post)}
                                      disabled={isLoading}
                                      title="Approve post"
                                      className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(post)}
                                      disabled={isLoading}
                                      title="Reject post with remarks"
                                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                {/* EDIT */}
                                <button
                                  onClick={() => openEditModal(post)}
                                  disabled={isLoading}
                                  title="Edit content"
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                {/* ARCHIVE (Safely hides post - NO direct delete) */}
                                <button
                                  onClick={() => handleArchive(post)}
                                  disabled={isLoading}
                                  title="Move to Archive (Hides from public)"
                                  className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>

                                {/* NOTE: NO DELETE BUTTON IS RENDERED HERE! */}
                                {/* Active posts MUST be archived first before deletion. */}
                              </>
                            )}

                            {/* ---------------------------------------------------- */}
                            {/* ARCHIVED POST ACTIONS (Restore or Permanent Delete)  */}
                            {/* ---------------------------------------------------- */}
                            {post.status === 'archived' && (
                              <>
                                {/* RESTORE */}
                                <button
                                  onClick={() => handleRestore(post)}
                                  disabled={isLoading}
                                  title={`Restore back to ${post.previous_status || 'approved'}`}
                                  className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>

                                {/* DELETE PERMANENTLY (Strictly available ONLY in archive) */}
                                <button
                                  onClick={() => handlePermanentDelete(post)}
                                  disabled={isLoading}
                                  title="Permanently Delete (Cannot be undone)"
                                  className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && posts.length > 0 && (
            <div className="py-3 px-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {Math.min(currentPage * itemsPerPage, posts.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-700 dark:text-slate-300">{posts.length}</span> items
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
                            currentPage === page
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: VIEW DETAILS MODAL                               */}
      {/* ========================================================= */}
      {isViewModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    getContentTypeBadge(selectedPost.content_type).color
                  }`}
                >
                  {selectedPost.content_type}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-sm text-xs font-medium border ${getAccountTypeBadge(
                    selectedPost.account_type
                  )}`}
                >
                  {selectedPost.account_type}
                </span>
                <span className="text-xs text-slate-400">ID #{selectedPost.id}</span>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Status Alert Banner */}
              {selectedPost.status === 'archived' ? (
                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                  <Archive className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider">Archived Content</p>
                    <p className="text-xs mt-0.5">
                      This item is archived and completely hidden from public tourists. Previous status before archiving was{' '}
                      <strong>{selectedPost.previous_status || 'approved'}</strong>.
                    </p>
                  </div>
                </div>
              ) : selectedPost.status === 'rejected' ? (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider">Rejected Submission</p>
                    <p className="text-xs mt-0.5">
                      Remarks: <em>"{selectedPost.rejection_remarks || 'No remarks provided'}"</em>
                    </p>
                  </div>
                </div>
              ) : selectedPost.status === 'pending' ? (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider">Pending Moderation</p>
                    <p className="text-xs mt-0.5">This content requires approval before it will appear in public tourist feeds.</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider">Publicly Active</p>
                    <p className="text-xs mt-0.5">This content is live and currently visible to tourists and visitors on DiscoverMansalay.</p>
                  </div>
                </div>
              )}

              {/* Media Carousel / Gallery */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div className="space-y-2">
                  <div className="relative aspect-video max-h-80 w-full rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center">
                    <img
                      src={formatImageUrl(selectedPost.images[activeMediaIndex] || selectedPost.images[0])}
                      alt={selectedPost.title || selectedPost.name}
                      className="w-full h-full object-contain"
                    />
                    {selectedPost.images.length > 1 && (
                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between pointer-events-none">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaIndex((idx) =>
                              idx === 0 ? selectedPost.images.length - 1 : idx - 1
                            )
                          }
                          className="pointer-events-auto p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-[11px] font-semibold text-white">
                          {activeMediaIndex + 1} / {selectedPost.images.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaIndex((idx) =>
                              idx === selectedPost.images.length - 1 ? 0 : idx + 1
                            )
                          }
                          className="pointer-events-auto p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedPost.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {selectedPost.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveMediaIndex(i)}
                          className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                            activeMediaIndex === i ? 'border-emerald-500 scale-105' : 'border-transparent opacity-60'
                          }`}
                        >
                          <img src={formatImageUrl(img)} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title & Content */}
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {selectedPost.title || selectedPost.name || 'Untitled Post'}
                </h3>
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedPost.content || selectedPost.description || 'No text content available.'}
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                {(() => {
                  const modalOwner = getPostOwner(selectedPost);
                  return (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Publisher</span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{modalOwner.name}</p>
                      {modalOwner.email && <p className="text-xs text-slate-500">{modalOwner.email}</p>}
                    </div>
                  );
                })()}

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Content Module</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedPost.content_type} <span className="text-xs text-slate-400">({selectedPost.source})</span>
                  </p>
                </div>

                {selectedPost.location && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Location / Barangay</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedPost.location}
                    </p>
                  </div>
                )}

                {selectedPost.price !== undefined && selectedPost.price !== null && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Price / Rate</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₱{Number(selectedPost.price).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedPost.category && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Category</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{selectedPost.category}</p>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date Created</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {new Date(selectedPost.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedPost.status !== 'archived' ? (
                  <>
                    {selectedPost.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(selectedPost)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectModal(selectedPost)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        openEditModal(selectedPost);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchive(selectedPost)}
                      className="px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive Content
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRestore(selectedPost)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Content
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(selectedPost)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Permanently
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SAFE EDIT MODAL                                  */}
      {/* ========================================================= */}
      {isEditModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Edit Content Details</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title / Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Content / Description</label>
                <textarea
                  rows={4}
                  value={editFormData.content}
                  onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {selectedPost.price !== undefined && selectedPost.price !== null && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingKey !== null}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REJECT REMARKS MODAL                             */}
      {/* ========================================================= */}
      {isRejectModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Reject Content</h3>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                Please provide feedback for <strong>"{selectedPost.title || selectedPost.name}"</strong>. The owner will be notified with these remarks.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Preset Feedback:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REMARKS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionRemarks(preset)}
                      className="px-2 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 rounded-md transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rejection Remarks *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="Explain what needs to be changed or corrected..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoadingKey !== null}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ManagePosts;
