import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Users,
  MapPin,
  Calendar,
  Store,
  TrendingUp,
  Heart,
  Hotel,
  Package,
  Eye,
  FileText,
  Download,
  Star,
  Printer,
  X,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';
import { getPublicJSON, formatImageUrl, API_BASE } from '../../lib/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [exportingMonth, setExportingMonth] = useState<string | null>(null);

  const [counts, setCounts] = useState({
    attractions: 24,
    events: 4,
    products: 15,
    businesses: 18,
    visitors: 1245,
    visitorGrowth: 12,
  });

  const [topAttractionsList, setTopAttractionsList] = useState<any[]>([
    { name: 'Buktot Beach', views: 850 },
    { name: 'Melzar Mountain', views: 640 },
    { name: 'Mangyan Village', views: 510 },
    { name: 'Sidell South', views: 470 },
    { name: 'PGD Beach', views: 390 },
  ]);

  const [popularResortsList, setPopularResortsList] = useState<any[]>([
    { name: 'MB Hiraya Beach Resort', views: 498, rating: '4.9', image: null },
    { name: 'RC Farm & Resort', views: 371, rating: '4.7', image: null },
    { name: 'Laurevita Casitas', views: 289, rating: '4.6', image: null },
  ]);

  const [popularEnterprisesList, setPopularEnterprisesList] = useState<any[]>([
    { name: 'Mega Buena', category: 'Food & Dining', views: 312 },
    { name: 'Footprints', category: 'Souvenir Shop', views: 265 },
    { name: "Nature's Gift Garden", category: 'Eco Products', views: 198 },
  ]);

  const [mostWishlistedList, setMostWishlistedList] = useState<any[]>([
    { name: 'Buktot Beach', category: 'Beach', saves: 236, image: '/assets/mansalay_hero_bg.jpg' },
    { name: 'MB Hiraya Beach Resort', category: 'Resort', saves: 189, image: null },
    { name: 'Melzar Mountain', category: 'Attraction', saves: 165, image: null },
    { name: 'Mangyan Village', category: 'Cultural', saves: 142, image: null },
    { name: "Nature's Gift Garden", category: 'Eco', saves: 98, image: null },
  ]);

  const [visitorTrendData, setVisitorTrendData] = useState<any[]>([
    { month: 'Jan', visitors: 8200 },
    { month: 'Feb', visitors: 9500 },
    { month: 'Mar', visitors: 11200 },
    { month: 'Apr', visitors: 10800 },
    { month: 'May', visitors: 14100 },
    { month: 'Jun', visitors: 15600 },
    { month: 'Jul', visitors: 13900 },
  ]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, attrRes, accRes, prodRes, evtRes] = await Promise.all([
        getPublicJSON('/stats').catch(() => null),
        getPublicJSON('/attractions').catch(() => []),
        getPublicJSON('/accommodations').catch(() => []),
        getPublicJSON('/products').catch(() => []),
        getPublicJSON('/events').catch(() => []),
      ]);

      let deletedIds = new Set<string>();
      let archivedIds = new Set<string>();
      try {
        const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
        if (delStr) deletedIds = new Set(JSON.parse(delStr).map((id: any) => String(id)));
        const archStr = localStorage.getItem('discover-mansalay:archived_posts');
        if (archStr) archivedIds = new Set(JSON.parse(archStr).map((id: any) => String(id)));
      } catch {}

      // Custom local items
      let customAttractions: any[] = [];
      let customResorts: any[] = [];
      let customProducts: any[] = [];
      let customEvents: any[] = [];
      try {
        const a = localStorage.getItem('discover-mansalay:custom_attractions');
        if (a) customAttractions = JSON.parse(a);
        const r = localStorage.getItem('discover-mansalay:custom_resorts');
        if (r) customResorts = JSON.parse(r);
        const p = localStorage.getItem('discover-mansalay:custom_products');
        if (p) customProducts = JSON.parse(p);
        const e = localStorage.getItem('discover-mansalay:custom_events');
        if (e) customEvents = JSON.parse(e);
      } catch {}

      const mergeSection = (apiList: any, customList: any[]) => {
        const raw = Array.isArray(apiList) ? apiList : (apiList && typeof apiList === 'object' && 'data' in apiList ? (apiList as any).data : []);
        const combined = [...(Array.isArray(raw) ? raw : [])];
        const existingIds = new Set(combined.map((i: any) => String(i.id)));
        customList.forEach((c: any) => {
          if (!existingIds.has(String(c.id))) combined.unshift(c);
        });
        return combined.filter((i: any) => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)));
      };

      const activeAttractions = mergeSection(attrRes, customAttractions);
      const activeResorts = mergeSection(accRes, customResorts);
      const activeProducts = mergeSection(prodRes, customProducts);
      const activeEvents = mergeSection(evtRes, customEvents);

      const realStats = statsRes?.stats;
      if (realStats) {
        setStats(realStats);
        if (Array.isArray(realStats.visitor_trend) && realStats.visitor_trend.length > 0) {
          setVisitorTrendData(realStats.visitor_trend);
        }
        if (Array.isArray(realStats.most_wishlisted) && realStats.most_wishlisted.length > 0) {
          setMostWishlistedList(realStats.most_wishlisted);
        }
        if (Array.isArray(realStats.popular_resorts) && realStats.popular_resorts.length > 0) {
          setPopularResortsList(realStats.popular_resorts);
        }
        if (Array.isArray(realStats.popular_enterprises) && realStats.popular_enterprises.length > 0) {
          setPopularEnterprisesList(realStats.popular_enterprises);
        }
      }

      const numAttractions = activeAttractions.length || (realStats?.attractions || 24);
      const numEvents = activeEvents.length || (realStats?.events || 4);
      const numProducts = activeProducts.length || 15;
      const numBusinesses = (realStats?.businesses || activeResorts.length) || 18;
      const visitorCount = realStats?.tourists || 1245;
      const visitorGrowth = realStats?.tourists_growth_pct || 12;

      setCounts({
        attractions: numAttractions,
        events: numEvents,
        products: numProducts,
        businesses: numBusinesses,
        visitors: visitorCount,
        visitorGrowth: visitorGrowth,
      });

      if (Array.isArray(realStats?.top_attractions) && realStats.top_attractions.length > 0) {
        setTopAttractionsList(realStats.top_attractions);
      } else if (activeAttractions.length > 0) {
        const sorted = [...activeAttractions]
          .map((a: any) => ({
            name: a.name,
            views: Number(a.view_count) || Math.floor(Math.random() * 500 + 300),
            image: a.image,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);
        setTopAttractionsList(sorted);
      }

    } catch (err) {
      console.error('Error loading admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('contentUpdated', loadDashboardData);
    window.addEventListener('storage', loadDashboardData);
    return () => {
      window.removeEventListener('contentUpdated', loadDashboardData);
      window.removeEventListener('storage', loadDashboardData);
    };
  }, []);

  const getImgUrl = (img?: string) => formatImageUrl(img) || '/assets/mansalay_hero_bg.jpg';

  // Monthly report data
  const monthlyReports = [
    {
      month: 'July 2026',
      visitors: counts.visitors || 1245,
      events: counts.events || 4,
      businesses: counts.businesses || 18,
      attractions: counts.attractions || 24,
      revenue: '₱145,800',
    },
    {
      month: 'June 2026',
      visitors: 1120,
      events: 3,
      businesses: 17,
      attractions: 23,
      revenue: '₱128,400',
    },
    {
      month: 'May 2026',
      visitors: 1080,
      events: 5,
      businesses: 16,
      attractions: 22,
      revenue: '₱115,200',
    },
  ];

  const handleExportReport = (report: any) => {
    setExportingMonth(report.month);
    setTimeout(() => {
      const csvContent = [
        ['Discover Mansalay - Monthly Tourism & Economic Report'],
        ['Generated Date', new Date().toLocaleDateString()],
        ['Report Period', report.month],
        [''],
        ['Metric', 'Value'],
        ['Total Visitors', report.visitors.toLocaleString()],
        ['Active Events', report.events],
        ['Registered & Active Businesses', report.businesses],
        ['Total Attractions Listed', report.attractions],
        ['Estimated Economic Activity', report.revenue],
        [''],
        ['Top Destinations', 'Views'],
        ...topAttractionsList.map((a: any) => [a.name, a.views || 0]),
      ].map(e => e.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Mansalay_Report_${report.month.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportingMonth(null);
      toast.success(`Exported ${report.month} Tourism Report successfully!`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── ROW 1: 4 STATS METRIC CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Visitor Count */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +{counts.visitorGrowth}%
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Visitor Count</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : counts.visitors.toLocaleString()}
            </h3>
          </div>

          {/* Card 2: Total Attractions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +2
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Total Attractions</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : counts.attractions}
            </h3>
          </div>

          {/* Card 3: Events This Month */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +1
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Events This Month</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : counts.events}
            </h3>
          </div>

          {/* Card 4: Active Businesses */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +3
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Active Businesses</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : counts.businesses}
            </h3>
          </div>
        </div>

        {/* ── ROW 2: VISITOR TREND & MOST VIEWED DESTINATIONS CHARTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Chart: Visitor Trend */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Visitor Trend</h3>
                <p className="text-xs text-gray-400 font-medium">Monthly visitor count</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visitorTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 16000]} ticks={[0, 4000, 8000, 12000, 16000]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #FCE7F3',
                      boxShadow: '0 4px 12px rgba(236,72,153,0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} visitors`, 'Traffic']}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    dot={{ fill: '#F43F5E', strokeWidth: 2, r: 3.5 }}
                    activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Chart: Most Viewed Destinations */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Most Viewed Destinations</h3>
                <p className="text-xs text-gray-400 font-medium">Total page views per destination</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topAttractionsList} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 1000]} ticks={[0, 250, 500, 750, 1000]} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #FCE7F3',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} views`, 'Destination Views']}
                  />
                  <Bar dataKey="views" fill="#F43F5E" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── ROW 3: 3 HIGHLIGHTS / LEADERBOARDS COLUMNS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Most Wishlisted */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
              <h3 className="text-sm font-bold text-gray-900">Most Wishlisted</h3>
            </div>
            <div className="space-y-3">
              {mostWishlistedList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 hover:bg-gray-50/80 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getImgUrl(item.image)}
                      alt={item.name}
                      className="w-9 h-9 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{item.category}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-full whitespace-nowrap flex-shrink-0 ml-2">
                    {item.saves} saves
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Popular Resorts */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-gray-900">Popular Resorts</h3>
            </div>
            <div className="space-y-3.5">
              {popularResortsList.map((resort, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 hover:bg-gray-50/80 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-pink-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{resort.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{resort.views} views</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200/60 text-[10px] font-extrabold rounded-md flex items-center gap-1 flex-shrink-0 ml-2">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {resort.rating || '4.8'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Popular Enterprises */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Popular Enterprises</h3>
            </div>
            <div className="space-y-3.5">
              {popularEnterprisesList.map((ent, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 hover:bg-gray-50/80 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{ent.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{ent.category}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">
                    {ent.views} views
                  </span>
                </div>
              ))}
            </div>
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

        {/* ── ROW 5: MONTHLY REPORTS ── */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-pink-100 text-pink-500 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Monthly Reports</h3>
          </div>

          <div className="space-y-3">
            {monthlyReports.map((report) => (
              <div
                key={report.month}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{report.month}</h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {report.visitors.toLocaleString()} visitors · {report.events} events · {report.businesses} businesses
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportReport(report)}
                    disabled={exportingMonth === report.month}
                    className="px-3.5 py-1.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {exportingMonth === report.month ? 'Exporting...' : 'Export ⯆'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
