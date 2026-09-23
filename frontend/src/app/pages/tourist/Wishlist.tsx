import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  TrendingUp, BarChart2, MapPin, Star,
  Compass, Hotel, Package, Calendar, Trash2, ArrowRight, Eye,
  Award, Layers, CheckCircle2, Bookmark, Sparkles, LayoutDashboard,
  ShieldCheck, Store, Bed, Plus, Tag, Crown, Flame, Activity, Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PushPinIcon } from '../../components/PushPinIcon';
import { getPublicJSON, getJSON, API_BASE, decodeHtml, formatImageUrl, cleanItineraryTitle } from '../../lib/api';

export function Wishlist() {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, isInWishlist, userType, isAdmin, currentUser, wishlistCounts, getWishlistCount } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'attraction' | 'accommodation' | 'product' | 'event'>('all');
  
  const [rawAttractions, setRawAttractions] = useState<any[]>([]);
  const [rawResorts, setRawResorts] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [directResortRooms, setDirectResortRooms] = useState<any[]>([]);
  const [directProducts, setDirectProducts] = useState<any[]>([]);
  const [localViewCounts, setLocalViewCounts] = useState<Record<string, number>>({});
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
        return combined
          .filter((i: any) => !deletedIds.has(String(i.id)) && !archivedIds.has(String(i.id)))
          .map((i: any) => ({
            ...i,
            name: i.name ? cleanItineraryTitle(i.name) : i.name,
            title: i.title ? cleanItineraryTitle(i.title) : i.title,
          }));
      };

      const activeAttractions = mergeSection(attrRes, customAttractions);
      const activeResorts = mergeSection(accRes, customResorts);
      const activeProducts = mergeSection(prodRes, customProducts);
      const activeEvents = mergeSection(evtRes, customEvents);

      setRawAttractions(activeAttractions);
      setRawResorts(activeResorts);
      setRawProducts(activeProducts);
      setRawEvents(activeEvents);

      // Load local view counts (for Total Listing Views)
      try {
        const vStr = localStorage.getItem('discover-mansalay:view_counts');
        setLocalViewCounts(vStr ? JSON.parse(vStr) : {});
      } catch {}

      const realStats = statsRes?.stats;
      if (realStats) {
        setStats(realStats);
      }

      // Fetch specific business items directly to guarantee accurate scope
      if (userType === 'resort') {
        try {
          const rooms = await getJSON('/resort-rooms');
          setDirectResortRooms(Array.isArray(rooms) ? rooms : []);
        } catch {
          setDirectResortRooms([]);
        }
      } else if (userType === 'enterprise') {
        try {
          const prods = await getJSON('/products');
          setDirectProducts(Array.isArray(prods) ? prods : []);
        } catch {
          setDirectProducts([]);
        }
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
  }, [userType, currentUser?.id]);

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
      const saves = Math.max(Number(a.likes) || 0, getWishlistCount(a.id, 'attraction', 0));
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
      const cleanId = String(r.id || '').replace(/^room-/, '');
      const saves = Math.max(
        Number(r.likes) || 0,
        getWishlistCount(r.id, 'accommodation', 0),
        cleanId ? getWishlistCount(`room-${cleanId}`, 'accommodation', 0) : 0,
        cleanId ? getWishlistCount(cleanId, 'accommodation', 0) : 0,
        r.user_id ? getWishlistCount(`resort-${r.user_id}`, 'accommodation', 0) : 0
      );
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
      const saves = Math.max(Number(p.likes) || 0, getWishlistCount(p.id, 'product', 0));
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
      const saves = Math.max(Number(e.likes) || 0, getWishlistCount(e.id, 'event', 0));
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
  }, [rawAttractions, rawResorts, rawProducts, rawEvents, wishlistCounts, getWishlistCount]);

  // ── Compute specific business user's own items analytics ──
  const myBusinessItems = useMemo(() => {
    if (!currentUser || !isBusinessUser) return [];

    const currentUserId = String(currentUser.id || '');
    const currentName = (currentUser.name || '').toLowerCase().trim();
    const currentStore = (currentUser.store_name || '').toLowerCase().trim();
    const currentResort = (currentUser.resort_name || '').toLowerCase().trim();

    if (userType === 'resort') {
      // 1. Rooms from accommodations that belong to this resort AND are actual rooms
      const roomsFromAccommodations = rawResorts
        .filter((r: any) => {
          const matchId = r.user_id && String(r.user_id) === currentUserId;
          const matchName = currentResort && (r.resort_name || '').toLowerCase() === currentResort;
          const matchUser = currentName && (r.resort_name || '').toLowerCase() === currentName;
          const belongsToUser = matchId || matchName || matchUser;
          if (!belongsToUser) return false;

          // Only keep added rooms (is_room, room_id, or room- id prefix)
          return Boolean(r.is_room || r.room_id || String(r.id || '').startsWith('room-'));
        });

      // 2. Combine with directResortRooms from /resort-rooms endpoint
      const roomMap = new Map<string, any>();

      roomsFromAccommodations.forEach((r: any) => {
        const cleanId = String(r.room_id || r.id || '').replace(/^room-/, '');
        const key = cleanId || String(r.id);
        roomMap.set(key, r);
      });

      directResortRooms.forEach((dr: any) => {
        const key = String(dr.id);
        if (!roomMap.has(key)) {
          roomMap.set(key, {
            ...dr,
            is_room: true,
            room_id: dr.id,
            price: dr.price_per_night,
            pricePerNight: dr.price_per_night,
          });
        } else {
          const existing = roomMap.get(key);
          roomMap.set(key, { ...dr, ...existing });
        }
      });

      return Array.from(roomMap.values())
        .map((r: any) => {
          const cleanId = String(r.room_id || r.id || '').replace(/^room-/, '');
          const saves = Math.max(
            Number(r.likes) || 0,
            getWishlistCount(r.id, 'accommodation', 0),
            getWishlistCount(r.id, 'room', 0),
            cleanId ? getWishlistCount(`room-${cleanId}`, 'accommodation', 0) : 0,
            cleanId ? getWishlistCount(`room-${cleanId}`, 'room', 0) : 0,
            cleanId ? getWishlistCount(cleanId, 'accommodation', 0) : 0,
            cleanId ? getWishlistCount(cleanId, 'room', 0) : 0
          );
          const dbViews = Number(r.views) || Number(r.view_count) || 0;
          const localViews = Number(localViewCounts[`view_count_accommodation_${r.id}`] || 0) ||
                             Number(localViewCounts[`view_count_accommodation_room-${cleanId}`] || 0);
          return {
            id: r.id || `room-${cleanId}`,
            name: decodeHtml(r.name || 'Room'),
            type: 'accommodation' as const,
            category: r.type || 'Room / Stay',
            image: r.image || (Array.isArray(r.images) ? r.images[0] : undefined),
            saves: Math.max(0, saves),
            views: Math.max(dbViews, localViews),
            price: r.pricePerNight || r.price_per_night || r.price,
            link: '/accommodations',
          };
        })
        .sort((a, b) => b.saves - a.saves);
    }

    if (userType === 'enterprise') {
      // 1. Products from rawProducts that belong to this store
      const productsFromRaw = rawProducts
        .filter((p: any) => {
          const matchId = p.user_id && String(p.user_id) === currentUserId;
          const matchSeller = (currentStore && (p.sellerName || p.seller_name || '').toLowerCase().includes(currentStore)) ||
                              (currentName && (p.sellerName || p.seller_name || '').toLowerCase().includes(currentName));
          return matchId || matchSeller;
        });

      // 2. Combine with directProducts from /products
      const prodMap = new Map<string, any>();

      productsFromRaw.forEach((p: any) => {
        prodMap.set(String(p.id), p);
      });

      directProducts.forEach((dp: any) => {
        const key = String(dp.id);
        if (!prodMap.has(key)) {
          prodMap.set(key, dp);
        } else {
          const existing = prodMap.get(key);
          prodMap.set(key, { ...dp, ...existing });
        }
      });

      return Array.from(prodMap.values())
        .map((p: any) => {
          const saves = Math.max(
            Number(p.likes) || 0,
            getWishlistCount(p.id, 'product', 0),
            getWishlistCount(`prod-${p.id}`, 'product', 0)
          );
          const dbViews = Number(p.view_count) || Number(p.views) || 0;
          const localViews = Number(localViewCounts[`view_count_product_${p.id}`] || 0);
          return {
            id: p.id,
            name: decodeHtml(p.name || 'Product'),
            type: 'product' as const,
            category: p.category || 'Product',
            image: p.image || (Array.isArray(p.images) ? p.images[0] : undefined),
            saves: Math.max(0, saves),
            views: Math.max(dbViews, localViews),
            price: p.price,
            link: '/products',
          };
        })
        .sort((a, b) => b.saves - a.saves);
    }

    return [];
  }, [currentUser, userType, isBusinessUser, rawResorts, rawProducts, directResortRooms, directProducts, wishlistCounts, getWishlistCount, localViewCounts]);

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

  // Tourist personal saved items helpers
  const touristCategoryCounts = useMemo(() => {
    return {
      all: wishlist.length,
      attraction: wishlist.filter(i => i.type === 'attraction').length,
      accommodation: wishlist.filter(i => i.type === 'accommodation' || i.type === 'room').length,
      product: wishlist.filter(i => i.type === 'product').length,
      event: wishlist.filter(i => i.type === 'event').length,
    };
  }, [wishlist]);

  const touristFilteredWishlist = useMemo(() => {
    if (activeCategoryTab === 'all') return wishlist;
    return wishlist.filter(item => {
      if (activeCategoryTab === 'accommodation') {
        return item.type === 'accommodation' || item.type === 'room';
      }
      return item.type === activeCategoryTab;
    });
  }, [wishlist, activeCategoryTab]);

  // ── Role-Based Access Control (RBAC) Engine ──
  const isResort = userType === 'resort';
  const isEnterprise = userType === 'enterprise';
  const isAdminAccount = isAdministrator || userType === 'admin';

  // Automatically sync category tab with role permissions
  useEffect(() => {
    if (isResort) {
      setActiveCategoryTab('accommodation');
    } else if (isEnterprise) {
      setActiveCategoryTab('product');
    } else {
      setActiveCategoryTab('all');
    }
  }, [userType, isResort, isEnterprise]);

  // RBAC Scoped items for analytics:
  // Resort accounts see ONLY their own added rooms and ranking
  // Enterprise accounts see ONLY their own added products and ranking
  // Admin accounts see BOTH enterprise, resort, and municipality-wide items
  const rbacItems = useMemo(() => {
    if (isResort || isEnterprise) {
      return myBusinessItems;
    }
    // Admin Account: full visibility across both enterprise, resort, and platform
    return rankedItems;
  }, [rankedItems, myBusinessItems, isResort, isEnterprise]);

  const filteredRankedItems = useMemo(() => {
    if (isResort || isEnterprise) {
      return myBusinessItems;
    }
    // Admin Account: full multi-category tab filtering (both enterprise, resort, etc.)
    if (activeCategoryTab === 'all') return rankedItems;
    return rankedItems.filter(item => item.type === activeCategoryTab);
  }, [rankedItems, myBusinessItems, activeCategoryTab, isResort, isEnterprise]);

  // Saves within RBAC scope (for resort/enterprise, this is total saves on their own offerings)
  const totalSavesInScope = useMemo(() => {
    return rbacItems.reduce((sum, item) => sum + item.saves, 0);
  }, [rbacItems]);

  const topItemInScope = rbacItems[0] || null;

  const counts = {
    attractions: rawAttractions.length || (stats?.attractions || 0),
    resorts: rawResorts.length || (stats?.resorts || stats?.businesses || 0),
    products: rawProducts.length || (stats?.products || 0),
    events: rawEvents.length || (stats?.events || 0),
  };

  const grandTotal = counts.attractions + counts.resorts + counts.products + counts.events || 1;

  const totalListingsInScope = useMemo(() => {
    if (isResort || isEnterprise) return myBusinessItems.length;
    return grandTotal;
  }, [isResort, isEnterprise, myBusinessItems.length, grandTotal]);

  const avgSavesInScope = useMemo(() => {
    if (totalListingsInScope <= 0) return 0;
    return Math.round((totalSavesInScope / totalListingsInScope) * 10) / 10;
  }, [totalSavesInScope, totalListingsInScope]);

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

  // RBAC scoped trend categories:
  // Resort sees their own rooms' saves, Enterprise sees their own products' saves, Admin sees full platform
  const rbacTrendCategories = useMemo(() => {
    if (isResort) {
      return [{
        label: 'Your Rooms & Stays',
        count: myBusinessItems.length,
        saves: totalMyBusinessSaves,
        width: 100,
        color: 'bg-gradient-to-r from-pink-500 to-rose-500',
        bgLight: 'bg-rose-50 text-rose-700',
        to: '/resort/profile',
        icon: Hotel,
        type: 'accommodation' as const
      }];
    }
    if (isEnterprise) {
      return [{
        label: 'Your Products & Delicacies',
        count: myBusinessItems.length,
        saves: totalMyBusinessSaves,
        width: 100,
        color: 'bg-gradient-to-r from-amber-500 to-rose-500',
        bgLight: 'bg-amber-50 text-amber-700',
        to: '/enterprise/profile',
        icon: Package,
        type: 'product' as const
      }];
    }
    // Admin Account: complete categories (both enterprise, resort, attractions, events)
    return trendCategories;
  }, [trendCategories, isResort, isEnterprise, myBusinessItems.length, totalMyBusinessSaves]);

  // RBAC available tabs
  const availableCategoryTabs = useMemo(() => {
    if (isResort) {
      return [{ key: 'accommodation', label: 'My Rooms' }];
    }
    if (isEnterprise) {
      return [{ key: 'product', label: 'My Products' }];
    }
    return [
      { key: 'all', label: 'All' },
      { key: 'attraction', label: 'Attractions' },
      { key: 'accommodation', label: 'Stays' },
      { key: 'product', label: 'Products' },
      { key: 'event', label: 'Events' },
    ];
  }, [isResort, isEnterprise]);

  return (
    <div className="min-h-screen bg-slate-50/70 relative overflow-hidden pb-24">
      {/* Ambient background accent glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-pink-100/35 via-rose-50/20 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 relative z-10">

        {/* ── Tourist Wishlist Header (Hidden on Analytics & Saved for all business/admin roles) ── */}
        {!canViewAnalytics && (
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-gradient-to-br from-pink-100/40 via-rose-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100/80 text-pink-600 shadow-sm border border-pink-200/80 flex-shrink-0">
                  <PushPinIcon alwaysTilted size={28} idPrefix="wishlist-hdr" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    My Saved Places
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1.5 max-w-2xl">
                    {wishlist.length} saved places &amp; experiences · curated for your personalized Mansalay itinerary.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
                <Link
                  to="/attractions"
                  className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                >
                  <Compass className="h-4 w-4" />
                  Explore Places
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── EXCLUSIVE BUSINESS ANALYTICS CARD (For Resort & Enterprise) ── */}
        {canViewAnalytics && isBusinessUser && (
          <div className="bg-white rounded-3xl border border-rose-200/90 shadow-sm p-6 sm:p-8 relative overflow-hidden transition-all">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-2xs">
                  <Activity className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight">
                      {userType === 'resort' ? 'Your Resort Analytics & Save Performance' : 'Your Store Analytics & Save Performance'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                      Your Listings
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {userType === 'resort'
                      ? 'Live tracking of tourists saving your resort rooms and accommodations to their saved places.'
                      : 'Live tracking of tourists saving your products and delicacies to their saved places.'}
                  </p>
                </div>
              </div>

              <Link
                to={userType === 'resort' ? '/resort/profile' : '/enterprise/profile'}
                className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-pink-50/70 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-pink-600 active:scale-95 text-xs font-bold transition-all self-start md:self-auto flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 text-pink-500" />
                {userType === 'resort' ? 'Manage Rooms' : 'Manage Products'}
              </Link>
            </div>

            {/* 4 Business KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-gray-200/80 hover:border-pink-300 transition-all shadow-2xs hover:shadow-xs group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center border border-rose-200/60">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  {totalMyBusinessSaves > 0 && (
                    <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                      Active Pins
                    </span>
                  )}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-3 tracking-tight">
                  {totalMyBusinessSaves.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  {userType === 'resort' ? 'Total Saves on Your Stays' : 'Total Saves on Your Products'}
                </div>
              </div>

              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-gray-200/80 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center border border-blue-200/60">
                    <Eye className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                    Live
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-3 tracking-tight">
                  {totalMyBusinessViews.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  Total Listing Views
                </div>
              </div>

              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-gray-200/80 hover:border-amber-300 transition-all shadow-2xs hover:shadow-xs group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center border border-amber-200/60">
                    <Award className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    {userType === 'resort' ? 'Top Stay' : 'Top Product'}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-gray-900 mt-3 truncate">
                  {topMyBusinessSavedItem?.name || 'No saves yet'}
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  {topMyBusinessSavedItem ? `${topMyBusinessSavedItem.saves} saves recorded` : 'Waiting for tourist pins'}
                </div>
              </div>

              <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-gray-200/80 hover:border-emerald-300 transition-all shadow-2xs hover:shadow-xs group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Published
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-3 tracking-tight">
                  {myBusinessItems.length}
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  Active Published Listings
                </div>
              </div>
            </div>

            {/* List of the business's own offerings */}
            {myBusinessItems.length > 0 && (
              <div className="mt-7 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                    Your Most Saved & Pinned Offerings
                  </h3>
                  <span className="text-xs text-gray-500 font-semibold">
                    {myBusinessItems.length} {userType === 'resort' ? 'rooms published' : 'products published'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {myBusinessItems.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(item.link)}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-pink-50/20 border border-gray-200 hover:border-pink-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getImgUrl(item.image)}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover border border-gray-200 flex-shrink-0 group-hover:scale-105 transition-transform"
                          onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-pink-600 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                            {item.category} {item.price ? `· ₱${Number(item.price).toLocaleString()}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 flex-shrink-0 ml-2 shadow-2xs ${
                        item.saves > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        <PushPinIcon isPinned={item.saves > 0} size={12} idPrefix={`myitem-${item.id}`} />
                        <span>{item.saves}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SECTOR / PLATFORM-WIDE KPI CARDS (RBAC Scoped) ── */}
        {canViewAnalytics && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 border border-pink-200 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-pink-600" />
                </div>
                <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
                  {isResort
                    ? 'Your Added Rooms Insights'
                    : isEnterprise
                    ? 'Your Products Insights'
                    : 'Platform-Wide Tourism Insights'}
                </h2>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200/90 px-3 py-1 rounded-full shadow-2xs self-start sm:self-auto">
                {isResort
                  ? 'Your Resort · Added Rooms Only'
                  : isEnterprise
                  ? 'Your Enterprise · Products Only'
                  : 'Mansalay Municipality · Full Visibility'}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Saves */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:border-pink-300 hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-pink-100/80 text-pink-600 flex items-center justify-center border border-pink-200/80 group-hover:scale-105 transition-transform">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    totalSavesInScope > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {totalSavesInScope > 0 ? 'Active Saves' : 'Zero State'}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {totalSavesInScope.toLocaleString()}
                  </div>
                  <div className="text-xs font-bold text-gray-600 mt-1">
                    {isResort
                      ? 'Total Saves on Your Rooms'
                      : isEnterprise
                      ? 'Total Saves on Your Products'
                      : 'Total Community Saves'}
                  </div>
                </div>
              </div>

              {/* Card 2: Top Saved */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center border border-amber-200/80 group-hover:scale-105 transition-transform">
                    <Award className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    #1 Ranked
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-base sm:text-lg font-black text-gray-900 truncate">
                    {topItemInScope?.name || (isResort ? 'No rooms added yet' : isEnterprise ? 'No products added yet' : 'Mansalay Beach')}
                  </div>
                  <div className="text-xs font-bold text-amber-700 mt-1">
                    {topItemInScope ? `#1 Top Saved (${topItemInScope.saves} saves)` : 'Waiting for saves'}
                  </div>
                </div>
              </div>

              {/* Card 3: Active Listings */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:border-violet-300 hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-violet-100/80 text-violet-600 flex items-center justify-center border border-violet-200/80 group-hover:scale-105 transition-transform">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                    Directory
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {totalListingsInScope}
                  </div>
                  <div className="text-xs font-bold text-gray-600 mt-1">
                    {isResort
                      ? 'Active Added Rooms'
                      : isEnterprise
                      ? 'Active Product Listings'
                      : 'Active Platform Listings'}
                  </div>
                </div>
              </div>

              {/* Card 4: Avg Saves */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center border border-emerald-200/80 group-hover:scale-105 transition-transform">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Ratio
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    {avgSavesInScope}
                  </div>
                  <div className="text-xs font-bold text-gray-600 mt-1">
                    {isResort
                      ? 'Avg Saves / Room'
                      : isEnterprise
                      ? 'Avg Saves / Product'
                      : 'Avg Saves / Listing'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN 12-COLUMN DASHBOARD GRID (Leaderboard + Analytics) ── */}
        {canViewAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left 7-8 Columns: Ranked Leaderboard Component */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 tracking-tight">
                      <Flame className="h-5 w-5 text-rose-500 fill-rose-500/20" />
                      {isResort
                        ? 'Your Most Saved Rooms & Stays'
                        : isEnterprise
                        ? 'Your Most Saved Products & Delicacies'
                        : 'Most Saved Destinations & Offerings'}
                    </h2>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      {isResort
                        ? 'Ranked by real tourist saves on your accommodation listings'
                        : isEnterprise
                        ? 'Ranked by real tourist saves on your product listings'
                        : 'Ranked by real tourist saves and pins across Mansalay tourism'}
                    </p>
                  </div>

                  {/* Filter Segmented Control */}
                  <div className="flex items-center gap-1 bg-gray-100/90 border border-gray-200 p-1 rounded-xl overflow-x-auto self-start sm:self-auto shadow-2xs">
                    {availableCategoryTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveCategoryTab(tab.key as any)}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          activeCategoryTab === tab.key
                            ? 'bg-white text-pink-600 shadow-sm border border-gray-200/70'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ranked List Items */}
                {loading ? (
                  <div className="py-16 text-center text-xs text-gray-500 font-medium">Loading saved analytics...</div>
                ) : filteredRankedItems.length === 0 ? (
                  <div className="py-16 text-center text-xs text-gray-500 font-medium">
                    {isResort
                      ? 'No added rooms found yet. Add rooms in your resort profile to track their saves & rankings.'
                      : isEnterprise
                      ? 'No added products found yet. Add products in your enterprise profile to track their saves & rankings.'
                      : 'No saved items found for this category.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRankedItems.slice(0, 8).map((item, idx) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => navigate(item.link)}
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 hover:border-pink-300 hover:bg-pink-50/20 bg-white transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Rank Badge */}
                          <div className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center flex-shrink-0 shadow-2xs ${
                            idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-200' :
                            idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white ring-2 ring-slate-200' :
                            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-2 ring-amber-200/60' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            #{idx + 1}
                          </div>

                          {/* Image */}
                          <img
                            src={getImgUrl(item.image)}
                            alt={item.name}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-gray-200 shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform"
                            onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                          />

                          {/* Title & Metadata */}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-pink-600 transition-colors truncate">
                              {item.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 capitalize">
                                {item.category}
                              </span>
                              {item.price !== undefined && Number(item.price) > 0 && (
                                <span className="text-xs font-black text-pink-600">
                                  ₱{Number(item.price).toLocaleString()}
                                </span>
                              )}
                              {item.views > 0 && (
                                <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {item.views.toLocaleString()} views
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Saves Count Badge */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <div className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs ${
                            item.saves > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>
                            <PushPinIcon isPinned={item.saves > 0} size={13} idPrefix={`lead-${item.id}`} />
                            <span>{item.saves} saves</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Leaderboard footer */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Showing top-performing tourism assets</span>
                <span className="font-bold text-pink-600">Discover Mansalay Tourism</span>
              </div>
            </div>

            {/* Right 4-5 Columns: Analytics Card & Visual Progress Bars */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100 text-pink-600 border border-pink-200 flex items-center justify-center shadow-2xs">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">
                        {isResort
                          ? 'Your Rooms & Stays Analytics'
                          : isEnterprise
                          ? 'Your Products & Delicacies Analytics'
                          : 'Tourism Category Analytics'}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        {isResort
                          ? 'Saves & listing distribution for your rooms'
                          : isEnterprise
                          ? 'Saves & listing distribution for your products'
                          : 'Community saves across tourism categories'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bars */}
                <div className="space-y-4">
                  {rbacTrendCategories.map((cat) => {
                    const Icon = cat.icon;
                    const catSaves = cat.saves;
                    const savePct = totalSavesInScope > 0 ? Math.round((catSaves / totalSavesInScope) * 100) : 0;

                    return (
                      <div
                        key={cat.label}
                        onClick={() => navigate(cat.to)}
                        className="p-3.5 rounded-2xl hover:bg-slate-50 border border-gray-200/70 hover:border-pink-200 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl ${cat.bgLight} flex items-center justify-center shadow-2xs`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-900 group-hover:text-pink-600 transition-colors block">
                                {cat.label}
                              </span>
                              <span className="text-[11px] text-gray-500 font-semibold">
                                {cat.count} listings published
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-gray-900 block">
                              {catSaves} saves
                            </span>
                            <span className="text-[10px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200/60 inline-block mt-0.5">
                              {savePct}% of {isResort ? 'room' : isEnterprise ? 'product' : 'total'} saves
                            </span>
                          </div>
                        </div>

                        {/* Progress Track */}
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-gray-200/60 mt-2.5">
                          <div
                            className={`h-full rounded-full ${cat.color} transition-all duration-700 shadow-2xs`}
                            style={{ width: `${Math.max(4, savePct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informative Footer Card */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-pink-50/40 border border-gray-200/80 text-xs text-gray-600">
                <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                  <Info className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <span>Municipality Tourism Scope</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {isResort
                    ? 'Data restricted to verified resort and accommodation listings in Mansalay.'
                    : isEnterprise
                    ? 'Data restricted to registered local delicacies and merchandise in Mansalay.'
                    : 'Full municipality-wide visibility enabled for administrator management.'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ── TOURIST PERSONAL WISHLIST VIEW (ONLY PINNED / SAVED ITEMS) ── */}
        {!canViewAnalytics && (
          <div className="space-y-6">
            {wishlist.length === 0 ? (
              <div className="max-w-md mx-auto text-center px-6 py-16 bg-white border border-gray-200/90 rounded-3xl p-8 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto mb-4 border border-pink-200 shadow-2xs">
                  <PushPinIcon alwaysTilted size={34} idPrefix="wishlist-empty" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">Your saved list is empty</h3>
                <p className="text-xs text-gray-600 mb-6">
                  Explore destinations, beach stays, and products in Mansalay and pin them to your personal collection.
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <Link
                    to="/attractions"
                    className="px-4 py-2.5 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-700 transition-colors shadow-sm"
                  >
                    Explore Attractions
                  </Link>
                  <Link
                    to="/accommodations"
                    className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-2xs"
                  >
                    Browse Resorts
                  </Link>
                  <Link
                    to="/products"
                    className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-2xs"
                  >
                    Browse Products
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200/80">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                      <Bookmark className="h-5 w-5 text-pink-600" />
                      Your Saved Places & Offerings ({wishlist.length})
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Only showing places, stays, and items you personally pinned or saved
                    </p>
                  </div>

                  {/* Category Filter for Tourist's Own Wishlist */}
                  <div className="flex items-center gap-1.5 bg-gray-100/90 border border-gray-200 p-1 rounded-xl overflow-x-auto shadow-2xs">
                    <button
                      onClick={() => setActiveCategoryTab('all')}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        activeCategoryTab === 'all'
                          ? 'bg-white text-pink-600 shadow-sm border border-gray-200/70'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All ({touristCategoryCounts.all})
                    </button>
                    {touristCategoryCounts.attraction > 0 && (
                      <button
                        onClick={() => setActiveCategoryTab('attraction')}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          activeCategoryTab === 'attraction'
                            ? 'bg-white text-pink-600 shadow-sm border border-gray-200/70'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Attractions ({touristCategoryCounts.attraction})
                      </button>
                    )}
                    {touristCategoryCounts.accommodation > 0 && (
                      <button
                        onClick={() => setActiveCategoryTab('accommodation')}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          activeCategoryTab === 'accommodation'
                            ? 'bg-white text-pink-600 shadow-sm border border-gray-200/70'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Stays ({touristCategoryCounts.accommodation})
                      </button>
                    )}
                    {touristCategoryCounts.product > 0 && (
                      <button
                        onClick={() => setActiveCategoryTab('product')}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          activeCategoryTab === 'product'
                            ? 'bg-white text-pink-600 shadow-sm border border-gray-200/70'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Products ({touristCategoryCounts.product})
                      </button>
                    )}
                    {touristCategoryCounts.event > 0 && (
                      <button
                        onClick={() => setActiveCategoryTab('event')}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          activeCategoryTab === 'event'
                            ? 'bg-white text-pink-600 shadow-sm border border-gray-200/70'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Events ({touristCategoryCounts.event})
                      </button>
                    )}
                  </div>
                </div>

                {touristFilteredWishlist.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500 font-medium bg-white rounded-3xl border border-gray-200/90 p-8 shadow-sm">
                    No items found under this category in your saved places.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {touristFilteredWishlist.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-sm hover:shadow-md hover:border-pink-300 transition-all group relative">
                        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                          <img
                            src={getImgUrl(item.image)}
                            alt={decodeHtml(item.title)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.currentTarget.src = '/assets/mansalay_hero_bg.jpg'; }}
                          />
                          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-pink-600 border border-gray-200 text-[10px] font-black rounded-full capitalize shadow-2xs">
                            {item.type}
                          </span>
                          <button
                            onClick={() => removeFromWishlist(item.id, item.type)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center shadow-2xs border border-gray-200 hover:bg-rose-50 transition-colors text-gray-600 hover:text-rose-600 cursor-pointer"
                            title="Remove from saved places"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4 bg-white">
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-pink-600 transition-colors">{decodeHtml(item.title)}</h3>
                          {item.category && (
                            <span className="text-xs text-gray-500 font-semibold block mt-1">
                              {decodeHtml(item.category)}
                            </span>
                          )}
                          {(item.type === 'product' || item.type === 'accommodation' || item.type === 'room') && item.price !== undefined && Number(item.price) > 0 && (
                            <div className="text-pink-600 font-extrabold text-sm mt-2 flex items-baseline gap-0.5">
                              <span>₱{Number(item.price).toLocaleString()}</span>
                              {item.type === 'accommodation' && (
                                <span className="text-xs font-normal text-gray-500"> / night</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
