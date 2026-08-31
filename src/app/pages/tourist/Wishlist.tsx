import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Heart, TrendingUp, BarChart2, MapPin, Star,
  Compass, Hotel, Package, Calendar, Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPublicJSON, API_BASE, decodeHtml } from '../../lib/api';

export function Wishlist() {
  const { wishlist, removeFromWishlist, userType } = useApp();
  const [stats, setStats] = useState<any>(null);

  const isBusinessUser = userType === 'resort' || userType === 'enterprise';

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
            <h1 className="text-2xl font-extrabold text-gray-900">
              {isBusinessUser ? 'Most Saved & Community Trends' : 'My Saved & Wishlist'}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {isBusinessUser
                ? 'Insights on top-saved destinations, stays, and products in Discover Mansalay'
                : `${wishlist.length} saved places & experiences · visible only to you`}
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
                      alt={decodeHtml(item.name)}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                      onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{decodeHtml(item.name)}</p>
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

      {/* ── Saved Items Grid or Empty / Business State ── */}
      {isBusinessUser ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-2">Explore Mansalay Offerings</h3>
            <p className="text-xs text-muted-foreground mb-6 max-w-lg mx-auto">
              Monitor active public listings and tourist attractions to align your business offerings with what visitors are looking for.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl mx-auto">
              {[
                { label: 'Attractions', icon: Compass, to: '/attractions', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                { label: 'Resorts & Stays', icon: Hotel, to: '/accommodations', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                { label: 'Local Products', icon: Package, to: '/products', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                { label: 'Events', icon: Calendar, to: '/events', color: 'bg-pink-50 text-pink-600 border-pink-100' },
              ].map(({ label, icon: Icon, to, color }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl ${color} border hover:scale-105 transition-all font-bold text-xs shadow-xs`}
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="max-w-md mx-auto text-center px-4 py-16">
          <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-pink-400 stroke-1" />
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">Your wishlist is empty</h3>
          <p className="text-xs text-gray-500 mb-6">
            Explore destinations, beach stays, and products in Mansalay and save them to your personal collection.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/attractions"
              className="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold hover:bg-pink-600 transition-colors shadow-sm"
            >
              Explore Attractions
            </Link>
            <Link
              to="/accommodations"
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              Browse Resorts
            </Link>
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
                    alt={decodeHtml(item.title)}
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
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{decodeHtml(item.title)}</h3>
                  {item.category && (
                    <span className="text-[11px] text-gray-400 font-medium block mt-1">
                      {decodeHtml(item.category)}
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
