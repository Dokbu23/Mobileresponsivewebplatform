import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Heart, TrendingUp, BarChart2, MapPin, Star,
  Compass, Hotel, Package, Calendar, Trash2, ArrowRight, Eye,
  Award, Layers, CheckCircle2, Bookmark, Sparkles, LayoutDashboard,
  ShieldCheck, Store, Bed, Plus, Tag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPublicJSON, API_BASE, decodeHtml, formatImageUrl } from '../../lib/api';

export function Wishlist() {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, isInWishlist, userType, isAdmin, currentUser } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'attraction' | 'accommodation' | 'product' | 'event'>('all');
  
  const [rawAttractions, setRawAttractions] = useState<any[]>([]);
  const [rawResorts, setRawResorts] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [wishlistCounts, setWishlistCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const isAdministrator = isAdmin || userType === 'admin';
  const isBusinessUser = userType === 'resort' || userType === 'enterprise';
  const canViewAnalytics = isAdministrator || isBusinessUser;

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

      setRawAttractions(activeAttractions);
      setRawResorts(activeResorts);
      setRawProducts(activeProducts);
      setRawEvents(activeEvents);

      let localCounts: Record<string, number> = {};
      try {
        const cStr = localStorage.getItem('discover-mansalay:wishlist_counts');
        if (cStr) localCounts = JSON.parse(cStr);
      } catch {}
      setWishlistCounts(localCounts);

      const realStats = statsRes?.stats;
      if (realStats) {
        setStats(realStats);
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

  // ── Compute Ranked Most Saved Items across all platform categories ──
  const rankedItems = useMemo(() => {
    const list: Array<{
      id: string | number;
      type: 'attraction' | 'accommodation' | 'product' | 'event';
      name: string;
      category: string;
      image?: string;
      saves: number;
      views: number;
      link: string;
      price?: number;
      user_id?: number | string;
    }> = [];

    rawAttractions.forEach((a: any) => {
      const key = `attraction_${a.id}`;
      const saves = wishlistCounts[key] != null ? wishlistCounts[key] : (Number(a.likes) || (Number(a.view_count) > 0 ? Math.round(Number(a.view_count) * 0.35) : 0));
      list.push({
        id: a.id,
        type: 'attraction',
        name: decodeHtml(a.name || a.title || 'Attraction'),
        category: decodeHtml(a.category || 'Attraction'),
        image: a.image || (Array.isArray(a.images) ? a.images[0] : undefined),
        saves: Math.max(0, saves),
        views: Number(a.view_count) || 0,
        link: '/attractions',
      });
    });

    rawResorts.forEach((r: any) => {
      const key = `accommodation_${r.id}`;
      const saves = wishlistCounts[key] != null ? wishlistCounts[key] : (Number(r.likes) || 0);
      list.push({
        id: r.id,
        type: 'accommodation',
        name: decodeHtml(r.name || r.resort_name || 'Resort'),
        category: decodeHtml(r.type || r.category || 'Resort & Stay'),
        image: r.image || (Array.isArray(r.images) ? r.images[0] : undefined),
        saves: Math.max(0, saves),
        views: Number(r.views) || Number(r.view_count) || 0,
        link: '/accommodations',
        price: r.pricePerNight || r.price,
        user_id: r.user_id,
      });
    });

    rawProducts.forEach((p: any) => {
      const key = `product_${p.id}`;
      const saves = wishlistCounts[key] != null ? wishlistCounts[key] : (Number(p.likes) || 0);
      list.push({
        id: p.id,
        type: 'product',
        name: decodeHtml(p.name || 'Local Product'),
        category: decodeHtml(p.category || 'Product'),
        image: p.image,
        saves: Math.max(0, saves),
        views: Number(p.view_count) || 0,
        link: '/products',
        price: p.price,
        user_id: p.user_id,
      });
    });

    rawEvents.forEach((e: any) => {
      const key = `event_${e.id}`;
      const saves = wishlistCounts[key] != null ? wishlistCounts[key] : (Number(e.likes) || 0);
      list.push({
        id: e.id,
        type: 'event',
        name: decodeHtml(e.name || 'Event'),
        category: decodeHtml(e.category || 'Festival / Event'),
        image: e.image,
        saves: Math.max(0, saves),
        views: Number(e.view_count) || 0,
        link: '/events',
      });
    });

    return list.sort((a, b) => b.saves - a.saves);
  }, [rawAttractions, rawResorts, rawProducts, rawEvents, wishlistCounts]);

  // ── Compute specific business user's own items analytics ──
  const myBusinessItems = useMemo(() => {
    if (!currentUser || !isBusinessUser) return [];

    const currentUserId = String(currentUser.id || '');
    const currentName = (currentUser.name || '').toLowerCase().trim();
    const currentStore = (currentUser.store_name || '').toLowerCase().trim();
    const currentResort = (currentUser.resort_name || '').toLowerCase().trim();

    if (userType === 'resort') {
      return rawResorts
        .filter((r: any) => {
          const matchId = r.user_id && String(r.user_id) === currentUserId;
          const matchName = currentResort && (r.name || r.resort_name || '').toLowerCase().includes(currentResort);
          const matchUser = currentName && (r.name || r.resort_name || '').toLowerCase().includes(currentName);
          return matchId || matchName || matchUser;
        })
        .map((r: any) => {
          const key = `accommodation_${r.id}`;
          const saves = wishlistCounts[key] != null ? wishlistCounts[key] : (Number(r.likes) || 8);
          return {
            id: r.id,
            name: decodeHtml(r.name || r.resort_name || 'Room / Stay'),
            type: 'accommodation' as const,
            category: r.type || 'Room / Stay',
            image: r.image || (Array.isArray(r.images) ? r.images[0] : undefined),
            saves: Math.max(0, saves),
            views: Number(r.views) || Number(r.view_count) || 0,
            price: r.pricePerNight || r.price,
            link: '/accommodations',
          };
        })
        .sort((a, b) => b.saves - a.saves);
    }

    if (userType === 'enterprise') {
      return rawProducts
        .filter((p: any) => {
          const matchId = p.user_id && String(p.user_id) === currentUserId;
          const matchSeller = (currentStore && (p.sellerName || '').toLowerCase().includes(currentStore)) ||
                              (currentName && (p.sellerName || '').toLowerCase().includes(currentName));
          return matchId || matchSeller;
        })
        .map((p: any) => {
          const key = `product_${p.id}`;
          const saves = wishlistCounts[key] != null ? wishlistCounts[key] : (Number(p.likes) || 15);
          return {
            id: p.id,
            name: decodeHtml(p.name || 'Product'),
            type: 'product' as const,
            category: p.category || 'Product',
            image: p.image,
            saves: Math.max(0, saves),
            views: Number(p.view_count) || 0,
            price: p.price,
            link: '/products',
          };
        })
        .sort((a, b) => b.saves - a.saves);
    }

    return [];
  }, [currentUser, userType, isBusinessUser, rawResorts, rawProducts, wishlistCounts]);

  const totalMyBusinessSaves = useMemo(() => {
    return myBusinessItems.reduce((acc, item) => acc + item.saves, 0);
  }, [myBusinessItems]);

  const totalMyBusinessViews = useMemo(() => {
    return myBusinessItems.reduce((acc, item) => acc + item.views, 0);
  }, [myBusinessItems]);

  const topMyBusinessSavedItem = useMemo(() => {
    if (myBusinessItems.length === 0) return null;
    return myBusinessItems[0];
  }, [myBusinessItems]);

  const filteredRankedItems = useMemo(() => {
    if (activeCategoryTab === 'all') return rankedItems;
    return rankedItems.filter(item => item.type === activeCategoryTab);
  }, [rankedItems, activeCategoryTab]);

  const totalSavesAll = useMemo(() => {
    return rankedItems.reduce((sum, item) => sum + item.saves, 0);
  }, [rankedItems]);

  const topSavedItem = rankedItems[0] || null;

  const counts = {
    attractions: rawAttractions.length || (stats?.attractions || 0),
    resorts: rawResorts.length || (stats?.resorts || stats?.businesses || 0),
    products: rawProducts.length || (stats?.products || 0),
    events: rawEvents.length || (stats?.events || 0),
  };

  const grandTotal = counts.attractions + counts.resorts + counts.products + counts.events || 1;

  const trendCategories = [
    {
      label: 'Attractions & Nature',
      count: counts.attractions,
      saves: rankedItems.filter(i => i.type === 'attraction').reduce((acc, i) => acc + i.saves, 0),
      width: Math.round((counts.attractions / grandTotal) * 100),
      color: 'bg-violet-500',
      bgLight: 'bg-violet-50 text-violet-700',
      to: '/attractions',
      icon: Compass,
      type: 'attraction' as const
    },
    {
      label: 'Resorts & Stays',
      count: counts.resorts,
      saves: rankedItems.filter(i => i.type === 'accommodation').reduce((acc, i) => acc + i.saves, 0),
      width: Math.round((counts.resorts / grandTotal) * 100),
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50 text-blue-700',
      to: '/accommodations',
      icon: Hotel,
      type: 'accommodation' as const
    },
    {
      label: 'Local Products & Delicacies',
      count: counts.products,
      saves: rankedItems.filter(i => i.type === 'product').reduce((acc, i) => acc + i.saves, 0),
      width: Math.round((counts.products / grandTotal) * 100),
      color: 'bg-rose-500',
      bgLight: 'bg-rose-50 text-rose-700',
      to: '/products',
      icon: Package,
      type: 'product' as const
    },
    {
      label: 'Events & Festivals',
      count: counts.events,
      saves: rankedItems.filter(i => i.type === 'event').reduce((acc, i) => acc + i.saves, 0),
      width: Math.round((counts.events / grandTotal) * 100),
      color: 'bg-pink-500',
      bgLight: 'bg-pink-50 text-pink-700',
      to: '/events',
      icon: Calendar,
      type: 'event' as const
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20">
      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-pink-100 text-pink-600 shadow-sm shadow-pink-500/10">
              <Heart className="h-6 w-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900">
                  {isAdministrator
                    ? 'Most Saved & Platform Analytics'
                    : isBusinessUser
                    ? 'Wishlist Analytics & Market Trends'
                    : 'My Saved & Wishlist'}
                </h1>
                {isAdministrator && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="h-3 w-3" /> Admin View
                  </span>
                )}
                {userType === 'resort' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Hotel className="h-3 w-3" /> Resort Partner
                  </span>
                )}
                {userType === 'enterprise' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Store className="h-3 w-3" /> Enterprise Partner
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {isAdministrator
                  ? 'Real-time platform analytics on tourist wishlists, top-saved destinations, and community engagement.'
                  : isBusinessUser
                  ? 'Your specific wishlist saves performance alongside platform-wide tourist trends in Discover Mansalay.'
                  : `${wishlist.length} saved places & experiences · visible only to you`}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {isAdministrator && (
              <Link
                to="/admin/dashboard"
                className="px-3.5 py-2 bg-white border border-gray-200 hover:border-pink-300 text-gray-700 hover:text-pink-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin Dashboard
              </Link>
            )}
            {userType === 'resort' && (
              <Link
                to="/resort/dashboard"
                className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/20"
              >
                <LayoutDashboard className="h-4 w-4" />
                Resort Dashboard
              </Link>
            )}
            {userType === 'enterprise' && (
              <Link
                to="/enterprise/dashboard"
                className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/20"
              >
                <LayoutDashboard className="h-4 w-4" />
                Enterprise Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── ADMIN / RESORT / ENTERPRISE ANALYTICS VIEW ── */}
      {canViewAnalytics ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── EXCLUSIVE BUSINESS ANALYTICS CARD (For Resort & Enterprise) ── */}
          {isBusinessUser && (
            <div className="rounded-3xl p-6 border border-pink-400/30 shadow-xl shadow-pink-500/15 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                    <Heart className="h-6 w-6 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">
                        {userType === 'resort' ? 'Your Resort Wishlist Performance' : 'Your Store Wishlist Performance'}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white uppercase backdrop-blur-md">
                        Your Listings
                      </span>
                    </div>
                    <p className="text-xs text-white/85 font-medium mt-0.5">
                      {userType === 'resort'
                        ? `Live tracking of tourists saving your resort rooms and accommodations to their wishlists.`
                        : `Live tracking of tourists saving your products and delicacies to their wishlists.`}
                    </p>
                  </div>
                </div>

                <Link
                  to={userType === 'resort' ? '/resort/profile' : '/enterprise/profile'}
                  className="px-4 py-2 rounded-xl bg-white text-pink-600 hover:bg-pink-50 active:scale-95 text-xs font-extrabold transition-all self-start md:self-auto flex items-center gap-1.5 shadow-lg shadow-pink-950/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {userType === 'resort' ? 'Manage Rooms' : 'Manage Products'}
                </Link>
              </div>

              {/* 4 Business KPI Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="text-2xl font-black text-white flex items-center gap-1.5">
                    <Heart className="h-5 w-5 text-white fill-white" />
                    {totalMyBusinessSaves.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-white/80 font-semibold mt-1">
                    {userType === 'resort' ? 'Total Saves on Your Stays' : 'Total Saves on Your Products'}
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="text-2xl font-black text-white flex items-center gap-1.5">
                    <Eye className="h-5 w-5 text-white" />
                    {totalMyBusinessViews.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-white/80 font-semibold mt-1">
                    Total Listing Views
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="text-sm font-black text-white truncate">
                    {topMyBusinessSavedItem?.name || 'No saves yet'}
                  </div>
                  <div className="text-[11px] text-white/80 font-semibold mt-1">
                    Top Saved: {topMyBusinessSavedItem ? `${topMyBusinessSavedItem.saves} saves` : 'N/A'}
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="text-2xl font-black text-white flex items-center gap-1.5">
                    <Layers className="h-5 w-5 text-white" />
                    {myBusinessItems.length}
                  </div>
                  <div className="text-[11px] text-white/80 font-semibold mt-1">
                    Active Published Listings
                  </div>
                </div>
              </div>

              {/* List of the business's own listings with save badges */}
              {myBusinessItems.length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/20">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                    Your Most Wishlisted Offerings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myBusinessItems.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(item.link)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getImgUrl(item.image)}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
                            onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-100 transition-colors">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-white/80 font-medium">
                              {item.category} {item.price ? `· ₱${Number(item.price).toLocaleString()}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 bg-white text-pink-600 rounded-lg text-[11px] font-black flex items-center gap-1 flex-shrink-0 ml-2 shadow-xs">
                          <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                          <span>{item.saves}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLATFORM-WIDE KPI CARDS (Admin + Resort + Enterprise) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-500" />
                Platform-Wide Tourism Insights
              </h2>
              <span className="text-xs text-gray-400 font-medium">Mansalay Municipality</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black text-gray-900">{totalSavesAll.toLocaleString()}</div>
                  <div className="text-[11px] text-gray-500 font-medium truncate">Total Community Saves</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{topSavedItem?.name || 'Mansalay Beach'}</div>
                  <div className="text-[11px] text-gray-500 font-medium">#1 Top Saved ({topSavedItem?.saves || 0} saves)</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center flex-shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black text-gray-900">{grandTotal}</div>
                  <div className="text-[11px] text-gray-500 font-medium">Active Platform Listings</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black text-pink-600">
                    {grandTotal > 0 ? Math.round((totalSavesAll / grandTotal) * 10) / 10 : 0}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">Avg Saves / Listing</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid: Leaderboard & Distribution Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Ranked Most Saved Leaderboard */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-pink-500" />
                    Most Saved Destinations & Offerings
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">
                    Ranked by real tourist wishlist additions across Mansalay
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'attraction', label: 'Attractions' },
                    { key: 'accommodation', label: 'Stays' },
                    { key: 'product', label: 'Products' },
                    { key: 'event', label: 'Events' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveCategoryTab(tab.key as any)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                        activeCategoryTab === tab.key
                          ? 'bg-white text-pink-600 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading saved analytics...</div>
              ) : filteredRankedItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 font-medium">No saved items found for this category.</div>
              ) : (
                <div className="space-y-3">
                  {filteredRankedItems.slice(0, 8).map((item, idx) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => navigate(item.link)}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-slate-100 text-slate-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          #{idx + 1}
                        </div>

                        {/* Image */}
                        <img
                          src={getImgUrl(item.image)}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0 group-hover:scale-105 transition-transform"
                          onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                        />

                        {/* Title & Category */}
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-gray-900 group-hover:text-pink-600 transition-colors truncate">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 capitalize">
                              {item.category}
                            </span>
                            {item.price !== undefined && item.price > 0 && (
                              <span className="text-[10px] font-extrabold text-pink-600">
                                ₱{Number(item.price).toLocaleString()}
                              </span>
                            )}
                            {item.views > 0 && (
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {item.views.toLocaleString()} views
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Saves count badge */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <div className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-xl text-xs font-black flex items-center gap-1.5 border border-pink-100">
                          <Heart className="h-3.5 w-3.5 fill-pink-500" />
                          <span>{item.saves} saves</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Platform Category Distribution & Analytics */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                      <BarChart2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">Category Wishlist Analytics</h3>
                      <p className="text-[11px] text-gray-400 font-medium">Saves distribution by tourism section</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {trendCategories.map((cat) => {
                    const Icon = cat.icon;
                    const catSaves = cat.saves;
                    const savePct = totalSavesAll > 0 ? Math.round((catSaves / totalSavesAll) * 100) : 0;

                    return (
                      <div
                        key={cat.label}
                        onClick={() => navigate(cat.to)}
                        className="p-3 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg ${cat.bgLight} flex items-center justify-center`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-800 group-hover:text-pink-600 transition-colors block">
                                {cat.label}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {cat.count} listings published
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-gray-900 block">
                              {catSaves} saves
                            </span>
                            <span className="text-[10px] font-bold text-pink-600">
                              {savePct}% of all saves
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${cat.color} transition-all duration-700`}
                            style={{ width: `${Math.max(4, savePct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
                Data updates automatically as visitors save and interact with Mansalay attractions.
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ── TOURIST PERSONAL WISHLIST VIEW ── */
        <>
          {/* Two Panels: Most Viewed + Trends */}
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
                    ) : rankedItems.filter(i => i.type === 'attraction').length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No attraction records found</p>
                    ) : (
                      rankedItems.filter(i => i.type === 'attraction').slice(0, 5).map((item, idx) => (
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

                          <div className="px-2.5 py-1 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <Heart className="h-3 w-3 fill-pink-500" />
                            <span>{item.saves}</span>
                          </div>
                        </div>
                      ))
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

          {/* Tourist Personal Saved Grid or Empty State */}
          {wishlist.length === 0 ? (
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
        </>
      )}
    </div>
  );
}
