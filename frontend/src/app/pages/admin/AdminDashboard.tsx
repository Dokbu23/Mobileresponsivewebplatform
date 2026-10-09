import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Users,
  MapPin,
  Calendar,
  Store,
  TrendingUp,
  Hotel,
  Building2,
  Package,
  Eye,
  FileText,
  Download,
  Printer,
  X,
  Check,
  ChevronDown,
  BarChart2,
  Activity,
  TrendingDown,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Compass,
  MessageSquare,
  Heart,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { getPublicJSON, getJSON, formatImageUrl, API_BASE, decodeHtml, cleanItineraryTitle } from '../../lib/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const isInitialRef = useRef(true);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);


  const [counts, setCounts] = useState({
    attractions: 0,
    events: 0,
    products: 0,
    businesses: 0,
    visitors: 0,
    visitorGrowth: 0,
  });

  const [popularResortsList, setPopularResortsList] = useState<any[]>([]);
  const [popularEnterprisesList, setPopularEnterprisesList] = useState<any[]>([]);
  const [mostWishlistedList, setMostWishlistedList] = useState<any[]>([]);
  const [visitorTrendData, setVisitorTrendData] = useState<any[]>([]);
  const [destinationsList, setDestinationsList] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('');

  // Dynamic Controls & Filters for Visitor Analytics (100% Real-Data Driven)
  const [trendRange, setTrendRange] = useState<'3m' | '6m' | '12m'>('6m');
  const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);

  const [destinationCategory, setDestinationCategory] = useState<string>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const loadDashboardData = async (
    silent = false,
    selectedRange: '3m' | '6m' | '12m' = trendRange,
    selectedCategory: string = destinationCategory
  ) => {
    if (!silent) {
      setLoading(true);
      setStatsError(null);
    }
    try {
      const monthsParam = selectedRange === '3m' ? 3 : selectedRange === '6m' ? 6 : 12;
      const categoryParam = selectedCategory === 'all' ? 'all' : selectedCategory;

      const [statsRes] = await Promise.all([
        getPublicJSON(`/stats?months=${monthsParam}&category=${encodeURIComponent(categoryParam)}`),
      ]);

      if (!statsRes || !statsRes.success || !statsRes.stats) {
        throw new Error('Failed to retrieve statistics from the database');
      }

      const realStats = statsRes.stats;
      setStats(realStats);
      setStatsError(null);

      // ── Pure Database Visitor Trend ──
      setVisitorTrendData(Array.isArray(realStats.visitor_trend) ? realStats.visitor_trend : []);

      // ── Pure Database Destination Analytics ──
      setDestinationsList(Array.isArray(realStats.destinations) ? realStats.destinations : []);
      setAvailableCategories(Array.isArray(realStats.destination_categories) ? realStats.destination_categories : []);
      if (realStats.date_range?.label) {
        setDateRangeLabel(realStats.date_range.label);
      }

      // ── Database Wishlisted / Popular Listings ──
      if (Array.isArray(realStats.most_wishlisted)) {
        setMostWishlistedList(realStats.most_wishlisted.map((item: any) => ({
          ...item,
          name: decodeHtml(item.name),
          category: decodeHtml(item.category),
          saves: Number(item.saves) || 0,
        })));
      }

      if (Array.isArray(realStats.popular_resorts)) {
        setPopularResortsList(realStats.popular_resorts.map((r: any) => ({
          ...r,
          name: decodeHtml(r.name),
          views: Number(r.views) || 0,
        })));
      }

      if (Array.isArray(realStats.popular_enterprises)) {
        setPopularEnterprisesList(realStats.popular_enterprises.map((e: any) => ({
          ...e,
          name: decodeHtml(e.name),
          category: decodeHtml(e.category),
          views: Number(e.views) || 0,
        })));
      }

      // Dynamic Counts strictly from Database
      setCounts({
        attractions: Number(realStats.attractions) || 0,
        events: Number(realStats.events) || 0,
        products: Number(realStats.products) || 0,
        businesses: Number(realStats.businesses) || 0,
        visitors: Number(realStats.total_visitors ?? realStats.tourists) || 0,
        visitorGrowth: realStats.percentage_change !== null && realStats.percentage_change !== undefined ? Number(realStats.percentage_change) : 0,
      });

    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      if (!silent) {
        setStatsError(err?.message || 'Error connecting to database');
      }
    } finally {
      setLoading(false);
      isInitialRef.current = false;
    }
  };

  useEffect(() => {
    loadDashboardData(false, trendRange, destinationCategory);
    const handleUpdate = () => loadDashboardData(true, trendRange, destinationCategory);

    // 20-second silent background sync timer
    const autoSyncInterval = setInterval(() => loadDashboardData(true, trendRange, destinationCategory), 20000);

    window.addEventListener('wishlistUpdated', handleUpdate);
    window.addEventListener('viewsUpdated', handleUpdate);
    window.addEventListener('contentUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(true, trendRange, destinationCategory);
      }
    });

    return () => {
      clearInterval(autoSyncInterval);
      window.removeEventListener('wishlistUpdated', handleUpdate);
      window.removeEventListener('viewsUpdated', handleUpdate);
      window.removeEventListener('contentUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [trendRange, destinationCategory]);

  const getImgUrl = (img?: string) => formatImageUrl(img) || '/assets/mansalay_hero_bg.jpg';

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target as Node)) {
        setIsRangeDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real Dynamic Date Range Display Label
  const rangeDisplayLabel = useMemo(() => {
    if (dateRangeLabel) return dateRangeLabel;
    if (trendRange === '3m') return 'Last 3 Months';
    if (trendRange === '6m') return 'Last 6 Months';
    return 'Last 12 Months';
  }, [dateRangeLabel, trendRange]);

  // Dynamic Real KPI Stats directly from Database
  const kpiStats = useMemo(() => {
    return {
      total: stats?.total_visitors ?? 0,
      highest: stats?.highest_month ?? null,
      lowest: stats?.lowest_month ?? null,
      average: stats?.average_per_month ?? 0,
      growthPct: stats?.percentage_change ?? null,
    };
  }, [stats]);

  // Real Destinations from Database (ranked dynamically)
  const displayedDestinations = useMemo(() => {
    return Array.isArray(destinationsList) ? destinationsList.slice(0, 5) : [];
  }, [destinationsList]);

  // Rank styling configuration matching reference design
  const RANK_STYLES = [
    { badge: 'bg-[#FF3D7F] text-white', bar: 'bg-[#FF3D7F]' },
    { badge: 'bg-[#0284C7] text-white', bar: 'bg-[#0284C7]' },
    { badge: 'bg-[#8B5CF6] text-white', bar: 'bg-[#8B5CF6]' },
    { badge: 'bg-[#F59E0B] text-white', bar: 'bg-[#F59E0B]' },
    { badge: 'bg-[#10B981] text-white', bar: 'bg-[#10B981]' },
  ];

  // Custom SVG dot renderer with floating pink pill value badge
  const renderCustomDot = (props: any) => {
    const { cx, cy, value, index } = props;
    if (cx === undefined || cy === undefined) return null;
    const isCrowded = visitorTrendData.length > 8;
    return (
      <g key={`visitor-dot-${index}-${cx}`}>
        <circle cx={cx} cy={cy} r={4.5} fill="#FF3D7F" stroke="#FFFFFF" strokeWidth={2} />
        {!isCrowded && (
          <g transform={`translate(${cx}, ${cy - 14})`}>
            <rect
              x="-11"
              y="-9"
              width="22"
              height="14"
              rx="4"
              fill="#FFE8F0"
              stroke="#FCE7F3"
              strokeWidth="0.5"
            />
            <text
              x="0"
              y="0.5"
              textAnchor="middle"
              fill="#FF3D7F"
              fontSize="9.5"
              fontWeight="700"
              dominantBaseline="middle"
            >
              {value}
            </text>
          </g>
        )}
      </g>
    );
  };



  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER: ADMIN DASHBOARD TITLE & MANAGE LISTINGS BUTTON ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Discover Mansalay — platform overview and content management
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              to="/admin/posts"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Manage Posts</span>
            </Link>
            <Link
              to="/admin/publish"
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <span>Manage Listings</span>
            </Link>
          </div>
        </div>

        {/* ── ERROR STATE (IF ANY) ── */}
        {statsError && !stats && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-rose-800">Database Connection Issue</p>
              <p className="text-xs text-rose-600 mt-0.5">{statsError}</p>
            </div>
            <button
              type="button"
              onClick={() => loadDashboardData(false)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── ROW 1: 4 STATS METRIC CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Visitor Count */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              {kpiStats.growthPct !== null ? (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-0.5 ${kpiStats.growthPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <TrendingUp className="h-3 w-3" /> {kpiStats.growthPct >= 0 ? `+${kpiStats.growthPct}%` : `${kpiStats.growthPct}%`}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium group-hover:text-blue-600 transition-colors">Visitor Count</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {counts.visitors.toLocaleString()}
            </h3>
          </div>

          {/* Card 2: Total Attractions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin className="h-5 w-5" />
              </div>
              {stats?.attractions_this_month > 0 ? (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{stats.attractions_this_month} this mo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium group-hover:text-emerald-600 transition-colors">Total Attractions</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {counts.attractions}
            </h3>
          </div>

          {/* Card 3: Events This Month */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              {stats?.events_upcoming > 0 ? (
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> {stats.events_upcoming} upcoming
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold">
                  Scheduled
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium group-hover:text-purple-600 transition-colors">Events This Month</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {counts.events}
            </h3>
          </div>

          {/* Card 4: Active Businesses */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md hover:border-pink-200 hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Store className="h-5 w-5" />
              </div>
              {stats?.businesses_this_month > 0 ? (
                <span className="px-2.5 py-0.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{stats.businesses_this_month} this mo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium group-hover:text-pink-600 transition-colors">Active Businesses</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {counts.businesses}
            </h3>
          </div>
        </div>

        {/* ── ROW 2: REDESIGNED VISITOR ANALYTICS CARDS (VISITOR TREND & MOST VIEWED DESTINATIONS) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── CARD 1: VISITOR TREND ── */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_6px_28px_-4px_rgba(0,0,0,0.07)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-pink-100/70 text-[#FF3D7F] flex items-center justify-center shrink-0 shadow-sm">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Visitor Trend</h3>
                    <p className="text-xs text-gray-400 font-medium">Monthly visitor count</p>
                  </div>
                </div>

                {/* Dynamic Date Range Filter Dropdown */}
                <div className="relative" ref={rangeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsRangeDropdownOpen(!isRangeDropdownOpen)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200/90 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{rangeDisplayLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isRangeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRangeDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Date Range Filter
                      </div>
                      {[
                        { id: '3m' as const, label: 'Last 3 Months' },
                        { id: '6m' as const, label: 'Last 6 Months' },
                        { id: '12m' as const, label: 'Last 12 Months' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setTrendRange(opt.id);
                            setIsRangeDropdownOpen(false);
                            loadDashboardData(true, opt.id, destinationCategory);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            trendRange === opt.id
                              ? 'bg-pink-50 text-[#FF3D7F] font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {trendRange === opt.id && <Check className="w-3.5 h-3.5 text-[#FF3D7F]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Compact Dynamic KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
                {/* 1. Total Visitors */}
                <div className="bg-[#FFF8FA] border border-pink-100/70 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 transition-transform hover:scale-[1.01]">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-[#FF3D7F] flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-500 leading-tight">Total Visitors</p>
                    <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight mt-0.5">
                      {kpiStats.total.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {kpiStats.growthPct !== null ? (
                        <>
                          <span className={`text-[10px] font-bold px-1 py-0.2 rounded ${kpiStats.growthPct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {kpiStats.growthPct >= 0 ? `↑ +${kpiStats.growthPct}%` : `↓ ${kpiStats.growthPct}%`}
                          </span>
                          <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">vs. previous period</span>
                        </>
                      ) : (
                        <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          No comparison data
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Highest Month */}
                <div className="bg-[#FAF8FF] border border-purple-100/70 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 transition-transform hover:scale-[1.01]">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-500 leading-tight">Highest Month</p>
                    <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight mt-0.5">
                      {kpiStats.highest ? Number(kpiStats.highest.visitors).toLocaleString() : '-'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium mt-1 truncate">
                      {kpiStats.highest ? kpiStats.highest.month : 'No visitor data available'}
                    </p>
                  </div>
                </div>

                {/* 3. Lowest Month */}
                <div className="bg-[#F6FAFF] border border-sky-100/70 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 transition-transform hover:scale-[1.01]">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-500 leading-tight">Lowest Month</p>
                    <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight mt-0.5">
                      {kpiStats.lowest ? Number(kpiStats.lowest.visitors).toLocaleString() : '-'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium mt-1 truncate">
                      {kpiStats.lowest ? kpiStats.lowest.month : 'No visitor data available'}
                    </p>
                  </div>
                </div>

                {/* 4. Average per Month */}
                <div className="bg-[#FFFBF5] border border-amber-100/70 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 transition-transform hover:scale-[1.01]">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-500 leading-tight">Average per Month</p>
                    <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight mt-0.5">
                      {kpiStats.average}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium mt-1 truncate">
                      Average per month
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsive Modern Area Chart */}
              <div className="h-64 sm:h-72 w-full pt-1">
                {visitorTrendData.length === 0 || kpiStats.total === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#FF3D7F] flex items-center justify-center mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">No visitor data available</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      No visitor registrations recorded for the selected period.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={visitorTrendData}
                      margin={{ top: 25, right: 15, left: -15, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="visitorAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF3D7F" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#FF3D7F" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                        dy={6}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 10 }}
                        domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.3))]}
                        allowDecimals={false}
                        label={{
                          value: 'Number of Visitors',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 20,
                          fill: '#94A3B8',
                          fontSize: 10,
                          fontWeight: 500,
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-sm px-3.5 py-2 rounded-xl shadow-lg border border-pink-100 text-xs">
                              <p className="font-semibold text-gray-500 mb-0.5">{data.label || data.month}</p>
                              <p className="font-bold text-[#FF3D7F] text-sm">
                                {Number(data.visitors).toLocaleString()} <span className="font-medium text-gray-600 text-xs">visitors</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        stroke="#FF3D7F"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#visitorAreaGradient)"
                        dot={renderCustomDot}
                        activeDot={{ r: 6, fill: '#FF3D7F', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center justify-center gap-2 pt-3 text-xs font-semibold text-gray-700">
              <span className="flex items-center">
                <span className="w-3.5 h-0.5 bg-[#FF3D7F]" />
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#FF3D7F] bg-white -mx-0.5" />
                <span className="w-3.5 h-0.5 bg-[#FF3D7F]" />
              </span>
              <span>Visitors</span>
            </div>
          </div>

          {/* ── CARD 2: MOST VIEWED DESTINATIONS ── */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_6px_28px_-4px_rgba(0,0,0,0.07)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-sky-100/70 text-sky-500 flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Most Viewed Destinations</h3>
                    <p className="text-xs text-gray-400 font-medium">Total page views per destination</p>
                  </div>
                </div>

                {/* Dynamic Category Filter Dropdown */}
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200/90 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm"
                  >
                    <span>
                      {destinationCategory === 'all'
                        ? 'All Destinations'
                        : destinationCategory}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Destination Category
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDestinationCategory('all');
                          setIsCategoryDropdownOpen(false);
                          loadDashboardData(true, trendRange, 'all');
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                          destinationCategory === 'all'
                            ? 'bg-pink-50 text-[#FF3D7F] font-bold'
                            : 'text-gray-700 hover:bg-gray-50 font-medium'
                        }`}
                      >
                        <span>All Destinations</span>
                        {destinationCategory === 'all' && <Check className="w-3.5 h-3.5 text-[#FF3D7F]" />}
                      </button>
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setDestinationCategory(cat);
                            setIsCategoryDropdownOpen(false);
                            loadDashboardData(true, trendRange, cat);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            destinationCategory === cat
                              ? 'bg-pink-50 text-[#FF3D7F] font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                          }`}
                        >
                          <span>{cat}</span>
                          {destinationCategory === cat && <Check className="w-3.5 h-3.5 text-[#FF3D7F]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Destination Rows */}
              <div className="space-y-3 sm:space-y-3.5">
                {displayedDestinations.length === 0 || displayedDestinations.every((d) => Number(d.views) === 0) ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center mb-3">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No destination views available</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {destinationCategory === 'all'
                        ? 'Page views will appear as visitors browse attractions.'
                        : `No page views recorded for "${destinationCategory}" destinations yet.`}
                    </p>
                  </div>
                ) : (
                  displayedDestinations.map((dest, index) => {
                    const rankStyle = RANK_STYLES[index] || { badge: 'bg-gray-400 text-white', bar: 'bg-gray-400' };
                    const views = Number(dest.views) || 0;
                    const progressPercent = Number(dest.progress_bar) || 0;
                    const sharePercent = Number(dest.percentage) || 0;

                    return (
                      <div
                        key={dest.id || `${dest.name}-${index}`}
                        className="flex items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-2xl hover:bg-gray-50/80 transition-all duration-200"
                      >
                        {/* Rank Badge */}
                        <div className={`w-6 h-6 rounded-lg ${rankStyle.badge} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                          {dest.rank || index + 1}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100 shadow-sm relative">
                          <img
                            src={getImgUrl(dest.image)}
                            alt={dest.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.src = '/assets/mansalay_hero_bg.jpg';
                            }}
                          />
                        </div>

                        {/* Name & Progress bar */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {dest.name}
                          </h4>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${rankStyle.bar}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Views count & Percentage share */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-gray-900 min-w-[2.5rem] sm:min-w-[3rem] text-right">
                            {views.toLocaleString()}
                          </span>
                          <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-pink-50 text-[#FF3D7F] min-w-[2.5rem] sm:min-w-[3rem] text-center">
                            {sharePercent}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Subtle footer hint */}
            <div className="pt-3 text-center sm:text-right">
              <span className="text-[11px] text-gray-400 font-medium">
                Live rankings updated from real visitor page views
              </span>
            </div>
          </div>
        </div>

        {/* ── ROW 3: 3 HIGHLIGHTS / LEADERBOARDS COLUMNS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Popular Attraction */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-pink-500 fill-pink-500" />
              <h3 className="text-sm font-bold text-gray-900">Popular Attraction</h3>
            </div>
            {mostWishlistedList.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center font-medium">No popular attractions yet</p>
            ) : (
              <div className="space-y-3">
                {mostWishlistedList.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/attractions')}
                    className="flex items-center justify-between p-1 hover:bg-pink-50/40 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getImgUrl(item.image)}
                        alt={item.name}
                        className="w-9 h-9 rounded-xl object-cover border border-gray-100 flex-shrink-0 group-hover:scale-105 transition-transform"
                        onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-pink-600 transition-colors">{item.name}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{item.category}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-full whitespace-nowrap flex-shrink-0 ml-2">
                      {item.saves} saves
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Popular Resorts */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-gray-900">Popular Resorts</h3>
            </div>
            {popularResortsList.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center font-medium">No resort listings yet</p>
            ) : (
              <div className="space-y-3.5">
                {popularResortsList.map((resort, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/accommodations')}
                    className="flex items-center justify-between p-1 hover:bg-purple-50/40 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-pink-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-purple-600 transition-colors">{resort.name}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">Resort & Accommodation</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">
                      {resort.views} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Popular Product */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Popular Product</h3>
            </div>
            {popularEnterprisesList.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center font-medium">No popular products yet</p>
            ) : (
              <div className="space-y-3.5">
                {popularEnterprisesList.map((ent, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/products')}
                    className="flex items-center justify-between p-1 hover:bg-emerald-50/40 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{ent.name}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{ent.category}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">
                      {ent.views} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 4: PUBLISH CONTENT QUICK ACTIONS ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Publish Content</h3>
              <p className="text-xs text-gray-400 font-medium">Post resorts, products, attractions, and events</p>
            </div>
            <Link
              to="/admin/publish"
              className="text-xs font-bold text-pink-500 hover:text-pink-600 transition-colors flex items-center gap-1"
            >
              + Go to Publish
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/admin/publish"
              className="p-5 border border-gray-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 group text-center shadow-xs"
            >
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Hotel className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Resort</span>
            </Link>

            <Link
              to="/admin/publish"
              className="p-5 border border-gray-100 rounded-2xl hover:border-amber-300 hover:bg-amber-50/30 transition-all flex flex-col items-center justify-center gap-2 group text-center shadow-xs"
            >
              <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Product</span>
            </Link>

            <Link
              to="/admin/publish"
              className="p-5 border border-gray-100 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-2 group text-center shadow-xs"
            >
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Attraction</span>
            </Link>

            <Link
              to="/admin/publish"
              className="p-5 border border-gray-100 rounded-2xl hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col items-center justify-center gap-2 group text-center shadow-xs"
            >
              <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Event</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
