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
import { getPublicJSON, API_BASE } from '../../lib/api';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getPublicJSON('/stats');
        if (res?.success && res?.stats) {
          setStats(res.stats);
        }
      } catch {
        // fail silently — show zeros
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const attractionsCount = stats?.attractions ?? 0;
  const eventsCount      = stats?.events ?? 0;
  const productsCount    = stats?.products ?? 0;
  const businessesCount  = stats?.businesses ?? 0;
  const totalViews       = stats?.total_views ?? 0;

  // Bar chart data: top attractions by real view_count
  const destinationViewsData: { name: string; views: number }[] =
    Array.isArray(stats?.top_attractions) ? stats.top_attractions.slice(0, 5) : [];

  // Popular resorts from real bookings data
  const popularResortsList: { name: string; bookings_count: number }[] =
    Array.isArray(stats?.popular_resorts) ? stats.popular_resorts : [];

  // Popular enterprises from real products count
  const popularEnterprisesList: { name: string; category: string; products_count: number }[] =
    Array.isArray(stats?.popular_enterprises) ? stats.popular_enterprises : [];

  // Most viewed = top_attractions data (same source, used as "wishlisted" proxy)
  const mostViewedList: { name: string; image?: string; views: number }[] =
    Array.isArray(stats?.top_attractions) ? stats.top_attractions.slice(0, 5) : [];

  const getImgUrl = (img?: string) =>
    img ? (img.startsWith('http') ? img : `${API_BASE}${img}`) : '/assets/mansalay_hero_bg.jpg';

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
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +12%
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Visitor Count</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">1,245</h3>
          </div>

          {/* Total Attractions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +2
              </span>
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
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +1
              </span>
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
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +3
              </span>
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
