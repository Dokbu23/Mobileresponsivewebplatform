import { Link } from 'react-router';
import { MapPin, Calendar, ShoppingBag, Hotel, ArrowRight, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Home() {
  const { userType } = useApp();
  const features = [
    {
      icon: MapPin,
      title: 'Attractions',
      description: 'Explore breathtaking natural wonders and cultural sites',
      path: '/attractions',
      color: 'bg-pink-50',
    },
    {
      icon: Calendar,
      title: 'Events',
      description: 'Discover upcoming festivals and local celebrations',
      path: '/events',
      color: 'bg-pink-50',
    },
    {
      icon: ShoppingBag,
      title: 'Local Products',
      description: 'Shop authentic handicrafts and local specialties',
      path: '/products',
      color: 'bg-pink-50',
    },
    {
      icon: Hotel,
      title: 'Accommodations',
      description: 'Find the perfect place to stay during your visit',
      path: '/accommodations',
      color: 'bg-pink-50',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Role Selection Banner */}
      {!userType && (
        <div className="bg-primary/10 border-b-2 border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm">Welcome! Please select your role to get the full experience</p>
                </div>
              </div>
              <Link
                to="/select-role"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Select Role
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl mb-6 text-foreground">
            Welcome to DiscoverMansalay
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your gateway to experiencing the rich culture, stunning landscapes,
            and warm hospitality of Mansalay
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/attractions"
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              Start Exploring
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/accommodations"
              className="px-8 py-3 bg-white text-primary border-2 border-primary rounded-lg hover:bg-primary/5 transition-colors"
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
                <h3 className="mb-2">{feature.title}</h3>
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

      {/* Call to Action for Businesses */}
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
    </div>
  );
}
