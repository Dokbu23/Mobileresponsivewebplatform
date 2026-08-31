import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Heart, TrendingUp, BarChart2, MapPin, Star,
  Compass, Hotel, Package, Calendar, Trash2, ArrowRight, Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPublicJSON, API_BASE, decodeHtml, formatImageUrl } from '../../lib/api';

export function Wishlist() {
  const navigate = useNavigate();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist, userType } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [topAttractions, setTopAttractions] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    attractions: 0,
    resorts: 0,
    products: 0,
    events: 0,
  });
  const [loading, setLoading] = useState(true);

  const isBusinessUser = userType === 'resort' || userType === 'enterprise';

  const loadData = async () => {
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
      }

      setCounts({
        attractions: activeAttractions.length || (realStats?.attractions || 0),
        resorts: activeResorts.length || (realStats?.resorts || realStats?.businesses || 0),
        products: activeProducts.length || (realStats?.products || 0),
        events: activeEvents.length || (realStats?.events || 0),
      });

      if (Array.isArray(realStats?.top_attractions) && realStats.top_attractions.length > 0) {
        setTopAttractions(realStats.top_attractions.map((a: any) => ({
          id: a.id,
          name: decodeHtml(a.name),
          views: Number(a.views) || Number(a.view_count) || 0,
          image: a.image,
          category: a.category || 'Attraction',
        })));
      } else if (activeAttractions.length > 0) {
        const sorted = [...activeAttractions]
          .map((a: any) => ({
            id: a.id,
            name: decodeHtml(a.name),
            views: Number(a.view_count) || 0,
            image: a.image,
            category: a.category || 'Attraction',
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);
        setTopAttractions(sorted);
      }
    } catch (err) {
      console.error('Error loading wishlist data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('wishlistUpdated', handleUpdate);
    window.addEventListener('contentUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('wishlistUpdated', handleUpdate);
      window.removeEventListener('contentUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getImgUrl = (img?: string) => formatImageUrl(img) || '/assets/mansalay_hero_bg.jpg';

  const totalAttractions = counts.attractions;
  const totalResorts     = counts.resorts;
  const totalProducts    = counts.products;
  const totalEvents      = counts.events;
  const grandTotal       = totalAttractions + totalResorts + totalProducts + totalEvents || 1;

  const trendCategories = [
    {
      label: 'Attractions & Nature',
      count: totalAttractions,
      width: Math.round((totalAttractions / grandTotal) * 100),
      color: 'bg-violet-500',
      bgLight: 'bg-violet-50 text-violet-700',
      to: '/attractions',
      icon: Compass
    },
    {
      label: 'Resorts & Accommodations',
      count: totalResorts,
      width: Math.round((totalResorts / grandTotal) * 100),
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50 text-blue-700',
      to: '/accommodations',
      icon: Hotel
    },
    {
      label: 'Local Products & Delicacies',
      count: totalProducts,
      width: Math.round((totalProducts / grandTotal) * 100),
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50 text-emerald-700',
      to: '/products',
      icon: Package
    },
    {
      label: 'Events & Festivals',
      count: totalEvents,
      width: Math.round((totalEvents / grandTotal) * 100),
      color: 'bg-pink-500',
      bgLight: 'bg-pink-50 text-pink-700',
      to: '/events',
      icon: Calendar
    },
  ];

  const handleToggleWishlist = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (isInWishlist(item.id, 'attraction')) {
      removeFromWishlist(item.id, 'attraction');
    } else {
      addToWishlist({
        id: item.id,
        title: item.name,
        type: 'attraction',
        category: item.category || 'Attraction',
        image: item.image,
      });
    }
  };

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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900">Most Viewed in Mansalay</h2>
                    <p className="text-[11px] text-gray-400 font-medium">Top tourist attractions by page views</p>
                  </div>
                </div>
                <Link to="/attractions" className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-0.5">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {loading ? (
                  <div className="py-8 text-center text-xs text-gray-400">Loading top destinations...</div>
                ) : topAttractions.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No attraction records found</p>
                ) : (
                  topAttractions.map((item, idx) => {
                    const isSaved = isInWishlist(item.id, 'attraction');
                    return (
                      <div
                        key={idx}
                        onClick={() => navigate('/attractions')}
                        className="flex items-center gap-3 p-2 hover:bg-pink-50/40 rounded-xl transition-all border border-transparent hover:border-pink-100 cursor-pointer group"
                      >
                        <span className={`text-[11px] font-black w-5 text-center flex-shrink-0 ${idx === 0 ? 'text-amber-500 font-extrabold' : idx === 1 ? 'text-slate-500' : 'text-gray-400'}`}>
                          #{idx + 1}
                        </span>

                        <img
                          src={getImgUrl(item.image)}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform border border-gray-100 shadow-xs"
                          onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate group-hover:text-pink-600 transition-colors">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              {item.category || 'Attraction'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {item.views.toLocaleString()} views
                            </span>
                          </div>
                        </div>

                        {!isBusinessUser && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(e, item)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                              isSaved
                                ? 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                                : 'bg-gray-50 text-gray-400 hover:bg-pink-50 hover:text-pink-500'
                            }`}
                            title={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
                          >
                            <Heart className={`h-4 w-4 ${isSaved ? 'fill-pink-500 text-pink-500' : ''}`} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span>Updated in real-time based on visitor engagement</span>
              <span className="font-bold text-pink-500">Discover Mansalay</span>
            </p>
          </div>

          {/* Platform Content Distribution Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <BarChart2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900">Platform Content Insights</h2>
                    <p className="text-[11px] text-gray-400 font-medium">Distribution of published tourism listings</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                  {grandTotal} total items
                </span>
              </div>

              <div className="space-y-3.5">
                {trendCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.label}
                      onClick={() => navigate(cat.to)}
                      className="p-2.5 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg ${cat.bgLight} flex items-center justify-center`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-gray-800 group-hover:text-pink-600 transition-colors">
                            {cat.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900">
                            {cat.count} <span className="text-[10px] font-normal text-gray-400">({cat.width}%)</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cat.color} transition-all duration-700`}
                          style={{ width: `${Math.max(4, cat.width)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-100">
              Click any category to explore its active destinations, stays, and items.
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
