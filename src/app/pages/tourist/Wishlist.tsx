import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Heart, TrendingUp, BarChart2, MapPin, Star,
  Compass, Hotel, Package, Calendar, Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPublicJSON, API_BASE } from '../../lib/api';

export function Wishlist() {
  const { wishlist, removeFromWishlist } = useApp();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPublicJSON('/stats');
        if (res?.success && res?.stats) {
          setStats(res.stats);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Most wishlisted / top attractions from real API
  const topAttractions: any[] = Array.isArray(stats?.top_attractions)
    ? stats.top_attractions.slice(0, 5)
    : [];

  const getImgUrl = (img?: string) =>
    img ? (img.startsWith('http') ? img : `${API_BASE}${img}`) : '/assets/mansalay_hero_bg.jpg';

  const totalAttractions = stats?.attractions ?? 0;
  const totalResorts     = stats?.resorts ?? 0;
  const totalProducts    = stats?.products ?? 0;
  const totalEvents      = stats?.events ?? 0;
  const grandTotal       = totalAttractions + totalResorts + totalProducts + totalEvents || 1;

  const trendCategories = [
    { label: 'Attractions', count: totalAttractions, width: Math.round((totalAttractions / grandTotal) * 100), color: 'bg-violet-400' },
    { label: 'Resorts & Stays', count: totalResorts, width: Math.round((totalResorts / grandTotal) * 100), color: 'bg-blue-400' },
    { label: 'Local Products', count: totalProducts, width: Math.round((totalProducts / grandTotal) * 100), color: 'bg-emerald-400' },
    { label: 'Events', count: totalEvents, width: Math.round((totalEvents / grandTotal) * 100), color: 'bg-pink-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20">
      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">My Saved</h1>
            <p className="text-xs text-gray-400 font-medium">
              {wishlist.length} saved places &amp; experiences &nbsp;·&nbsp;
              <span className="text-gray-400">visible only to you</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Two Panels: Most Viewed + Trends ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Most Viewed Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-extrabold text-gray-900">Most Viewed in Mansalay</h2>
            </div>
            <div className="space-y-3">
              {topAttractions.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Loading recommendations...</p>
              ) : (
                topAttractions.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors cursor-pointer group">
                    <span className="text-[11px] font-bold text-gray-400 w-5 flex-shrink-0">#{idx + 1}</span>

                    <img
                      src={getImgUrl(item.image)}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                      onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Attraction
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-pink-500 flex-shrink-0">
                      <Heart className="h-3.5 w-3.5 fill-pink-500" />
                      <span className="text-xs font-bold">{item.views} views</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform Content Distribution Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-extrabold text-gray-900">Platform Content Insights</h2>
            </div>
            <div className="space-y-4">
              {trendCategories.map((cat) => (
                <div key={cat.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{cat.count} items</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.color} transition-all duration-700`}
                      style={{ width: `${Math.max(5, cat.width)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-5 leading-relaxed">
              Based on active listings across Discover Mansalay.
            </p>
          </div>
        </div>
      </div>

      {/* ── Saved Items Grid or Empty State ── */}
      {wishlist.length === 0 ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center">
                <Heart className="h-9 w-9 text-pink-400" />
              </div>
              <span className="absolute inset-0 rounded-full bg-pink-100 animate-ping opacity-30" />
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Your wishlist is empty</h3>
            <p className="text-sm text-gray-400 mb-8">
              Start exploring Mansalay and save the places you love!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/attractions"
                className="flex items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full text-sm shadow-md shadow-pink-500/25 transition-all"
              >
                <Compass className="h-4 w-4" />
                Explore Attractions
              </Link>
              <Link
                to="/accommodations"
                className="flex items-center gap-2 px-6 py-2.5 border-2 border-pink-300 text-pink-600 hover:bg-pink-50 font-bold rounded-full text-sm transition-all"
              >
                <Hotel className="h-4 w-4" />
                Find Resorts
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl px-4">
              {[
                { label: 'Attractions', icon: Compass, to: '/attractions', color: 'bg-blue-50 text-blue-600' },
                { label: 'Resorts & Stays', icon: Hotel, to: '/accommodations', color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Local Products', icon: Package, to: '/products', color: 'bg-amber-50 text-amber-600' },
                { label: 'Events', icon: Calendar, to: '/events', color: 'bg-pink-50 text-pink-600' },
              ].map(({ label, icon: Icon, to, color }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${color} hover:scale-105 transition-all font-semibold text-xs`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {wishlist.map((item) => (
              <div key={`${item.type}-${item.id}`} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg transition-all group relative">
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={getImgUrl(item.image)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full capitalize">
                    {item.type}
                  </span>
                  <button
                    onClick={() => removeFromWishlist(item.id, item.type)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-pink-50 transition-colors text-pink-500"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{item.title}</h3>
                  {item.category && (
                    <span className="text-[11px] text-gray-400 font-medium block mt-1">
                      {item.category}
                    </span>
                  )}
                  {item.price !== undefined && item.price > 0 && (
                    <div className="text-pink-600 font-extrabold text-sm mt-2">
                      ₱{Number(item.price).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

