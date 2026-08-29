import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Users,
  MapPin,
  Calendar,
  Store,
  TrendingUp,
  Heart,
  Hotel,
  FileText,
  Download,
  Package,
  Eye
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
import { getPublicJSON, API_BASE, formatImageUrl } from '../../lib/api';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    attractions: 0,
    events: 0,
    products: 0,
    businesses: 0,
    visitors: 0,
    totalViews: 0,
  });
  const [topAttractionsList, setTopAttractionsList] = useState<any[]>([]);
  const [popularResortsList, setPopularResortsList] = useState<any[]>([]);
  const [popularEnterprisesList, setPopularEnterprisesList] = useState<any[]>([]);

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
      if (realStats) setStats(realStats);

      const numAttractions = activeAttractions.length;
      const numEvents = activeEvents.length;
      const numProducts = activeProducts.length;
      const numBusinesses = realStats?.businesses || activeResorts.length;
      
      const realAttractionViewsSum = activeAttractions.reduce((sum: number, a: any) => sum + (Number(a.view_count) || 0), 0);
      const totalViewsCount = (realStats?.total_views && realStats.total_views > 0)
        ? realStats.total_views
        : realAttractionViewsSum;

      const visitorCount = realStats?.tourists || realStats?.users || (totalViewsCount > 0 ? Math.max(1, Math.round(totalViewsCount * 0.4)) : 0);

      setCounts({
        attractions: numAttractions,
        events: numEvents,
        products: numProducts,
        businesses: numBusinesses,
        visitors: visitorCount,
        totalViews: totalViewsCount,
      });

      // Top Attractions / Most Viewed Destinations (sorted strictly by view_count)
      const sortedAttractions = [...activeAttractions]
        .map((a: any) => ({
          name: a.name,
          views: Number(a.view_count) || 0,
          image: a.image,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      setTopAttractionsList(
        (realStats?.top_attractions && realStats.top_attractions.length > 0)
          ? realStats.top_attractions
          : sortedAttractions
      );

      // Popular Resorts
      const sortedResorts = (realStats?.popular_resorts && realStats.popular_resorts.length > 0)
        ? realStats.popular_resorts
        : activeResorts.slice(0, 5).map((r: any) => ({
            name: r.name || r.resort_name || 'Resort',
            bookings_count: 0,
            image: r.image,
          }));
      setPopularResortsList(sortedResorts);

      // Popular Enterprises
      const enterpriseItems = (realStats?.popular_enterprises && realStats.popular_enterprises.length > 0)
        ? realStats.popular_enterprises
        : (numProducts > 0 ? [{
            name: 'Mansalay Artisan Co-op',
            category: 'Handicrafts & Delicacies',
            products_count: numProducts,
            avatar: null,
          }] : []);
      setPopularEnterprisesList(enterpriseItems);

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

  const attractionsCount = counts.attractions;
  const eventsCount      = counts.events;
  const productsCount    = counts.products;
  const businessesCount  = counts.businesses;
  const totalViews       = counts.totalViews;
  const visitorCount     = counts.visitors;

  // Bar chart data: top attractions by real views
  const destinationViewsData: { name: string; views: number }[] = topAttractionsList.slice(0, 5);
  const mostViewedList: { name: string; image?: string; views: number }[] = topAttractionsList.slice(0, 5);

  const getImgUrl = (img?: string) => formatImageUrl(img) || '/assets/mansalay_hero_bg.jpg';

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Discover Mansalay — platform overview and content management</p>
          </div>
          <Link
            to="/admin/publish"
            className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/20 transition-all text-center"
          >
            Publish Content
          </Link>
        </div>

        {/* ── STATS CARDS (4 COLUMNS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Visitor Count */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              {stats?.tourists_growth_pct && stats.tourists_growth_pct > 0 ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{stats.tourists_growth_pct}%
                </span>
              ) : stats?.tourists_this_month && stats.tourists_this_month > 0 ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{stats.tourists_this_month} new
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[11px] font-bold flex items-center gap-0.5">
                  0%
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">Visitor Count</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {loading ? '—' : visitorCount.toLocaleString()}
            </h3>
          </div>

          {/* Total Attractions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              {(stats?.attractions_this_month ?? 0) > 0 ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{stats.attractions_this_month} new
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[11px] font-bold flex items-center gap-0.5">
                  0 new
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">Total Attractions</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{attractionsCount}</h3>
          </div>

          {/* Events This Month */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              {eventsCount > 0 ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> {eventsCount} active
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[11px] font-bold flex items-center gap-0.5">
                  0 active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">Events This Month</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{loading ? '—' : eventsCount}</h3>
          </div>

          {/* Active Businesses */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              {(stats?.businesses_this_month ?? 0) > 0 ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{stats.businesses_this_month} new
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[11px] font-bold flex items-center gap-0.5">
                  0 new
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">Active Businesses</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{loading ? '—' : businessesCount}</h3>
          </div>
        </div>

        {/* ── CHARTS SECTION (2 COLUMNS) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Total Views */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Total Attraction Views</h3>
                <p className="text-[11px] text-gray-400 font-medium">Cumulative page views across all attractions</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center text-xs">👁️</div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold text-gray-900">{loading ? '—' : totalViews.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mb-1 font-medium">total views</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Increases each time a tourist views an attraction detail page.</p>
          </div>

          {/* Most Viewed Destinations */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Most Viewed Destinations</h3>
                <p className="text-[11px] text-gray-400 font-medium">Total page views per destination</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center text-xs">📍</div>
            </div>
            {destinationViewsData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                {loading ? 'Loading...' : 'No attraction view data yet'}
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={destinationViewsData} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 600 }} width={95} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #FCE7F3',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Bar dataKey="views" fill="#EC4899" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── LEADERBOARD GRID (3 COLUMNS) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 🔭 Most Viewed Attractions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-pink-500" />
              <h3 className="text-sm font-bold text-gray-900">Most Viewed Attractions</h3>
            </div>
            {mostViewedList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{loading ? 'Loading...' : 'No data yet'}</p>
            ) : (
              <div className="space-y-3.5">
                {mostViewedList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={getImgUrl(item.image)}
                        alt={item.name}
                        className="w-9 h-9 rounded-xl object-cover border border-gray-100"
                        onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                      />
                      <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-1 max-w-[100px]">{item.name}</h4>
                    </div>
                    <span className="px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-extrabold rounded-full whitespace-nowrap">
                      {item.views.toLocaleString()} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🏢 Popular Resorts */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Hotel className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-bold text-gray-900">Popular Resorts</h3>
            </div>
            {popularResortsList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{loading ? 'Loading...' : 'No resort data yet'}</p>
            ) : (
              <div className="space-y-3.5">
                {popularResortsList.map((resort, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-extrabold shadow-xs">
                        {idx + 1}
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-1 max-w-[110px]">{resort.name}</h4>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      {resort.bookings_count} bookings
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🏪 Popular Enterprises */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-gray-900">Popular Enterprises</h3>
            </div>
            {popularEnterprisesList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{loading ? 'Loading...' : 'No enterprise data yet'}</p>
            ) : (
              <div className="space-y-3.5">
                {popularEnterprisesList.map((ent, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-extrabold shadow-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-1 max-w-[100px]">{ent.name}</h4>
                        <p className="text-[10px] text-gray-400 font-medium line-clamp-1">{ent.category}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      {ent.products_count} products
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── PUBLISH CONTENT SECTION ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Publish Content</h3>
              <p className="text-[11px] text-gray-400 font-medium">Post resorts, products, attractions, and events</p>
            </div>
            <Link
              to="/admin/publish"
              className="text-xs font-bold text-pink-500 hover:text-pink-600 transition-colors flex items-center gap-1"
            >
              <span>+ Go to Publish</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/admin/publish"
              className="p-4 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/40 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Hotel className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Resort</span>
            </Link>

            <Link
              to="/admin/publish"
              className="p-4 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/40 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Product</span>
            </Link>

            <Link
              to="/admin/publish"
              className="p-4 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/40 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Attraction</span>
            </Link>

            <Link
              to="/admin/publish"
              className="p-4 border border-gray-100 rounded-xl hover:border-pink-300 hover:bg-pink-50/40 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-gray-800">Event</span>
            </Link>
          </div>
        </div>

        {/* ── PLATFORM SUMMARY ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-pink-500" />
            <h3 className="text-sm font-bold text-gray-900">Platform Summary</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Attractions', value: attractionsCount, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Total Events', value: eventsCount, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Products', value: productsCount, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Active Businesses', value: businessesCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                <div className={`text-2xl font-extrabold ${color}`}>{loading ? '—' : value}</div>
                <div className="text-[11px] text-gray-500 font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
