import { useNavigate } from 'react-router';
import { MapPin, Shield, Hotel, Store, LogIn, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState } from 'react';

// Real Mansalay photos for the collage background
const collageImages = [
  '/assets/products/beach and resorts/footprints.jpg',
  '/assets/products/attraction/Oriental Mindoro Heritage and Cultural Center.png',
  '/assets/products/beach and resorts/go beach resort.jpg',
  '/assets/products/DINING/Princess Ayline Bed & Breakfast.jpg',
  '/assets/products/beach and resorts/mahalta glamping.jpg',
  '/assets/products/attraction/buktot_beach.jpg',
  '/assets/products/beach and resorts/sidell beach.jpg',
  '/assets/products/MOUNTAIN AND FARM RESORTS/melzar mountain.jpg',
  '/assets/products/beach and resorts/sky and shore.jpg',
  '/assets/products/attraction/mangyan village.jpg',
  '/assets/products/beach and resorts/teresa by the sea.png',
  '/assets/products/ACCOMMODATIONS/nel travellers inn.jpg',
];

export function RoleSelection() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [showRoles, setShowRoles] = useState(false);

  const roles = [
    {
      type: 'tourist',
      icon: MapPin,
      title: 'Tourist',
      description: 'Explore attractions, book accommodations, and shop local products',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200 hover:border-blue-400',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      loginPath: '/tourist/login',
      hasRegister: false,
      isPopular: true,
    },
    {
      type: 'admin',
      icon: Shield,
      title: 'Admin',
      description: 'Manage platform, approve listings, and view analytics',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200 hover:border-purple-400',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
      loginPath: '/admin/login',
      hasRegister: false,
      isPopular: false,
    },
    {
      type: 'resort',
      icon: Hotel,
      title: 'Resort Owner',
      description: 'Register your resort and manage bookings',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200 hover:border-green-400',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-600',
      loginPath: '/resort/login',
      registerPath: '/resort/register',
      hasRegister: true,
      isPopular: false,
    },
    {
      type: 'enterprise',
      icon: Store,
      title: 'Enterprise',
      description: 'Sell local products and manage your inventory',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200 hover:border-pink-400',
      gradientFrom: 'from-pink-500',
      gradientTo: 'to-pink-600',
      loginPath: '/enterprise/login',
      registerPath: '/enterprise/register',
      hasRegister: true,
      isPopular: false,
    },
  ];

  // Already logged in
  if (currentUser) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-4">You're already logged in!</h1>
          <p className="text-lg text-muted-foreground mb-8">Welcome back, {currentUser.name}</p>
          <button
            onClick={() => {
              switch (currentUser.role) {
                case 'admin': navigate('/admin/dashboard'); break;
                case 'enterprise': navigate('/enterprise/dashboard'); break;
                case 'resort': navigate('/resort/dashboard'); break;
                default: navigate('/dashboard');
              }
            }}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">

        {/* Photo collage grid background */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-0.5">
          {collageImages.map((src, i) => (
            <div key={i} className="overflow-hidden">
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Welcome to DiscoverMansalay
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 drop-shadow">
            Your gateway to experiencing the rich culture, stunning landscapes, and warm hospitality of Mansalay
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/tourist/login')}
              className="px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              Start Exploring →
            </button>
            <button
              onClick={() => navigate('/accommodations')}
              className="px-8 py-3.5 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full border-2 border-white/60 hover:bg-white/30 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Book Your Stay
            </button>
          </div>

          {/* Scroll hint */}
          <button
            onClick={() => setShowRoles(true)}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 hover:text-white transition-colors flex flex-col items-center gap-1 text-sm"
          >
            <span>Login / Register</span>
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Role Selection Section ── */}
      <div id="roles" className="bg-gray-50 px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Choose Your Role</h2>
            <p className="text-gray-600">Select how you'd like to experience Mansalay</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.type}
                  className={`relative bg-white border-2 ${role.borderColor} rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                >
                  {role.isPopular && (
                    <span className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  )}

                  <div className={`${role.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`h-7 w-7 ${role.iconColor}`} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">{role.title}</h3>
                  <p className="text-sm text-gray-500 mb-5">{role.description}</p>

                  {role.hasRegister ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(role.loginPath)}
                        className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <LogIn className="h-4 w-4" /> Login
                      </button>
                      <button
                        onClick={() => navigate(role.registerPath!)}
                        className={`flex-1 py-2.5 bg-gradient-to-r ${role.gradientFrom} ${role.gradientTo} text-white rounded-xl hover:shadow-md transition-all text-sm font-medium flex items-center justify-center gap-2`}
                      >
                        <UserPlus className="h-4 w-4" /> Register
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(role.loginPath)}
                      className={`w-full py-2.5 bg-gradient-to-r ${role.gradientFrom} ${role.gradientTo} text-white rounded-xl hover:shadow-md transition-all text-sm font-medium flex items-center justify-center gap-2`}
                    >
                      <LogIn className="h-4 w-4" />
                      {role.type === 'tourist' ? 'Get Started' : 'Login'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-500 hover:text-primary transition-colors text-sm underline-offset-4 hover:underline"
            >
              Skip and browse as guest →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
