import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { MapPin, Calendar, ShoppingBag, Hotel, ArrowRight, Users, ShoppingCart, Star, TrendingUp, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPublicJSON } from '../../lib/api';
import { OrderTrackingWidget } from '../../components/OrderTrackingWidget';

export function Dashboard() {
  const { userType, cart, bookings } = useApp();
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

  const features = [
    {
      icon: MapPin,
      title: 'Attractions',
      description: 'Explore breathtaking natural wonders and cultural sites',
      path: '/attractions',
      color: 'bg-pink-50',
      count: attractions.length,
    },
    {
      icon: Calendar,
      title: 'Events',
      description: 'Discover upcoming festivals and local celebrations',
      path: '/events',
      color: 'bg-pink-50',
      count: events.length,
    },
    {
      icon: ShoppingBag,
      title: 'Local Products',
      description: 'Shop authentic handicrafts and local specialties',
      path: '/products',
      color: 'bg-pink-50',
      count: products.length,
    },
    {
      icon: Hotel,
      title: 'Accommodations',
      description: 'Find the perfect place to stay during your visit',
      path: '/accommodations',
      color: 'bg-pink-50',
      count: accommodations.length,
    },
  ];

  const touristStats = [
    {
      icon: ShoppingCart,
      label: 'Items in Cart',
      value: String(cart.length),
      subtext: `₱${cartTotal.toLocaleString()} total`,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Hotel,
      label: 'My Bookings',
      value: String(totalBookings),
      subtext: `₱${totalBookingValue.toLocaleString()} total`,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: MapPin,
      label: 'Attractions',
      value: String(attractions.length),
      subtext: 'Places to visit',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: Package,
      label: 'Products',
      value: String(products.length),
      subtext: 'Local items',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Tourist Stats (only show if logged in as tourist) */}
      {userType === 'tourist' && (
        <div className="bg-gradient-to-r from-primary/5 to-secondary/10 border-b-2 border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h2 className="mb-4">Your Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {touristStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-white border-2 border-primary/20 rounded-lg p-4 hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`${stat.color} p-2 rounded-lg`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-xl text-primary">{stat.value}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Order Tracking Widget (only show if logged in as tourist) */}
      {userType === 'tourist' && (
        <div className="bg-gradient-to-r from-primary/5 to-secondary/10 border-b-2 border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <OrderTrackingWidget />
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section 
        className="relative py-20 px-4"
        style={{
          backgroundImage: 'url(http://localhost:8000/background_landingpage/mansalay.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        
        {/* Content */}
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl mb-6 text-white drop-shadow-lg">
            Welcome to DiscoverMansalay
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 drop-shadow-md">
            Your gateway to experiencing the rich culture, stunning landscapes,
            and warm hospitality of Mansalay
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/attractions"
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 shadow-lg"
            >
              Start Exploring
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/accommodations"
              className="px-8 py-3 bg-white text-primary border-2 border-white rounded-lg hover:bg-white/90 transition-colors shadow-lg"
            >
              Book Your Stay
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-center mb-12">Discover Everything Mansalay Has to Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.path}
                to={feature.path}
                className="group bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all"
              >
                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3>{feature.title}</h3>
                  <span className="text-sm text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {feature.count}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center gap-2 text-primary text-sm">
                  Explore
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Actions for Tourists */}
      {userType === 'tourist' && (
        <section className="bg-gradient-to-r from-primary/5 to-secondary/10 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center mb-8">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/checkout"
                className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all text-center"
              >
                <ShoppingCart className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="mb-2">Checkout Cart</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete your purchase of {cart.length} items
                </p>
                <p className="text-primary">₱{cartTotal.toLocaleString()}</p>
              </Link>

              <Link
                to="/status"
                className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all text-center"
              >
                <Hotel className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="mb-2">My Bookings</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  View your {totalBookings} booking(s)
                </p>
                <p className="text-primary">₱{totalBookingValue.toLocaleString()}</p>
              </Link>

              <Link
                to="/attractions"
                className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all text-center"
              >
                <Star className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="mb-2">Top Attractions</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Explore {attractions.length} amazing places
                </p>
                <p className="text-primary">Start exploring</p>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Call to Action for Businesses (only show if not logged in or not business account) */}
      {(!userType || userType === 'tourist') && (
        <section className="bg-gradient-to-r from-primary/5 to-secondary/10 py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="mb-4">Are You a Business Owner?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join DiscoverMansalay and showcase your resort or products to thousands of visitors
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/resort/register"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Register Your Resort
              </Link>
              <Link
                to="/enterprise/register"
                className="px-6 py-3 bg-white text-primary border-2 border-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Register Your Enterprise
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
