import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  MapPin, Calendar, Hotel, ArrowRight,
  ShoppingCart, Star, Package, Sparkles, Compass, Utensils,
  Clock, TrendingUp, User
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPublicJSON } from '../../lib/api';
import { OrderTrackingWidget } from '../../components/OrderTrackingWidget';

export function Dashboard() {
  const { userType, cart, bookings, currentUser } = useApp();
  const [attractions, setAttractions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [attractionsRes, productsRes, accommodationsRes, eventsRes] = await Promise.all([
          getPublicJSON('/attractions'),
          getPublicJSON('/products'),
          getPublicJSON('/accommodations'),
          getPublicJSON('/events'),
        ]);

        setAttractions(Array.isArray(attractionsRes) ? attractionsRes : []);
        setProducts(Array.isArray(productsRes) ? productsRes : []);
        setAccommodations(Array.isArray(accommodationsRes) ? accommodationsRes : []);
        setEvents(Array.isArray(eventsRes) ? eventsRes : []);
      } catch {
        setAttractions([]);
        setProducts([]);
        setAccommodations([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalBookings = bookings.length;
  const totalBookingValue = bookings.reduce((sum, booking) => sum + booking.total, 0);

  // Get image helper
  const getImageUrl = (img: string | null | undefined) => {
    if (!img) return null;
    return img.startsWith('http') ? img : `http://localhost:8000${img}`;
  };

  // Featured items (top 4 of each for carousel sections)
  const featuredAttractions = attractions.slice(0, 4);
  const featuredProducts = products.slice(0, 4);
  const featuredAccommodations = accommodations.slice(0, 4);
  const upcomingEvents = events.slice(0, 3);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name?.split(' ')[0] || 'Explorer';

  const touristStats = [
    {
      icon: ShoppingCart,
      label: 'Cart Items',
      value: String(cart.length),
      subtext: `₱${cartTotal.toLocaleString()} total`,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      link: '/cart',
    },
    {
      icon: Hotel,
      label: 'My Bookings',
      value: String(totalBookings),
      subtext: `₱${totalBookingValue.toLocaleString()} total`,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      link: '/status',
    },
    {
      icon: MapPin,
      label: 'Attractions',
      value: String(attractions.length),
      subtext: 'Places to visit',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      link: '/attractions',
    },
    {
      icon: Package,
      label: 'Products',
      value: String(products.length),
      subtext: 'Local items',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
      link: '/products',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── TOURIST HEADER ── */}
      {userType === 'tourist' && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Greeting row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{greeting},</p>
                  <h1 className="text-2xl font-bold text-gray-900">{firstName}! 👋</h1>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/attractions"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Compass className="h-4 w-4" />
                  Explore
                </Link>
                <Link
                  to="/accommodations"
                  className="px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Hotel className="h-4 w-4" />
                  Book Stay
                </Link>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {touristStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Link
                    key={stat.label}
                    to={stat.link}
                    className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`${stat.color} p-2 rounded-lg`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {stat.value}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER TRACKING ── */}
      {userType === 'tourist' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <OrderTrackingWidget />
        </div>
      )}

      {/* ── QUICK EXPLORE BANNER (replaces hero) ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full opacity-10">
            <MapPin className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Discover Mansalay</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Explore Oriental Mindoro's Hidden Paradise
            </h2>
            <p className="text-white/80 text-sm mb-4 max-w-xl">
              {attractions.length} attractions · {accommodations.length} accommodations · {products.length} local products
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/attractions" className="px-4 py-2 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors">
                View Attractions
              </Link>
              <Link to="/events" className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors border border-white/30">
                Upcoming Events
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Attractions */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Compass className="h-5 w-5 text-pink-500" />
              <h2 className="text-xl font-bold text-gray-900">Popular Attractions</h2>
            </div>
            <p className="text-sm text-gray-500">Must-visit spots in Mansalay</p>
          </div>
          <Link to="/attractions" className="text-sm text-pink-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : featuredAttractions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Compass className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No attractions available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredAttractions.map((attraction) => (
              <Link key={attraction.id} to="/attractions" className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                  {getImageUrl(attraction.image) ? (
                    <img src={getImageUrl(attraction.image)!} alt={attraction.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = '/assets/default-attraction.jpg'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-50">
                      <MapPin className="h-12 w-12 text-pink-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-pink-500 transition-colors">{attraction.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">{attraction.description || 'Discover this amazing place'}</p>
                  <div className="flex items-center gap-1 text-xs text-yellow-500 mt-2">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-yellow-400" />)}
                    <span className="text-gray-500 ml-1">(4.8)</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Local Products */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-5 w-5 text-pink-500" />
              <h2 className="text-xl font-bold text-gray-900">Local Products</h2>
            </div>
            <p className="text-sm text-gray-500">Support local Mansalay businesses</p>
          </div>
          <Link to="/products" className="text-sm text-pink-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1">
            Shop All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No products available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <Link key={product.id} to="/products" className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {getImageUrl(product.image) ? (
                    <img src={getImageUrl(product.image)!} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = '/assets/default-product.jpg'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-50">
                      <Package className="h-12 w-12 text-pink-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[40px] group-hover:text-pink-500 transition-colors">{product.name}</h3>
                  <div className="flex items-baseline gap-0.5 mt-2">
                    <span className="text-pink-500 text-xs">₱</span>
                    <span className="text-pink-500 font-bold text-base">{Number(product.price).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>4.8</span>
                    <span className="mx-1">|</span>
                    <span className={product.stock === 0 ? 'text-red-500' : 'text-gray-500'}>
                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Accommodations */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="h-5 w-5 text-pink-500" />
              <h2 className="text-xl font-bold text-gray-900">Top Accommodations</h2>
            </div>
            <p className="text-sm text-gray-500">Find your perfect stay in Mansalay</p>
          </div>
          <Link to="/accommodations" className="text-sm text-pink-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1">
            Browse All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : featuredAccommodations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Hotel className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No accommodations available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredAccommodations.map((acc) => {
              const accName = acc.name || acc.resort_name || 'Accommodation';
              const accPrice = acc.pricePerNight || acc.price_per_night || 0;
              const accImage = acc.image || (Array.isArray(acc.resort_images) ? acc.resort_images[0] : null);
              return (
                <Link key={acc.id} to="/accommodations" className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all">
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                    {getImageUrl(accImage) ? (
                      <img src={getImageUrl(accImage)!} alt={accName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = '/assets/default-accommodation.jpg'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-50">
                        <Hotel className="h-12 w-12 text-pink-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-pink-500 transition-colors">{accName}</h3>
                    <div className="flex items-baseline gap-0.5 mt-2">
                      <span className="text-pink-500 text-xs">₱</span>
                      <span className="text-pink-500 font-bold text-base">{Number(accPrice).toLocaleString()}</span>
                      <span className="text-xs text-gray-500 ml-1">/ night</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>4.8</span>
                      <span className="mx-1">|</span>
                      <span className="text-green-600">Available</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 py-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-pink-500" />
              <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
            </div>
            <p className="text-sm text-gray-500">Don't miss out on these exciting happenings</p>
          </div>
          <Link to="/events" className="text-sm text-pink-500 hover:text-pink-600 font-semibold inline-flex items-center gap-1">
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No upcoming events yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <Link key={event.id} to="/events" className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all">
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {getImageUrl(event.image) ? (
                    <img src={getImageUrl(event.image)!} alt={event.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = '/assets/default-event.jpg'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-50">
                      <Calendar className="h-12 w-12 text-pink-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {event.category && (
                    <span className="inline-block px-2 py-0.5 bg-pink-100 text-pink-600 text-[10px] font-bold rounded uppercase mb-2">{event.category}</span>
                  )}
                  <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-pink-500 transition-colors">{event.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">{event.description || 'Join us for this exciting event'}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                    {event.date && (
                      <>
                        <Clock className="h-3.5 w-3.5 text-pink-500" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </>
                    )}
                    {event.location && (
                      <>
                        <span className="text-gray-300">|</span>
                        <MapPin className="h-3.5 w-3.5 text-pink-500" />
                        <span className="truncate">{event.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

