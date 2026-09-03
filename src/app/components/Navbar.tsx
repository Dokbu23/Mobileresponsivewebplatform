import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, X, MapPin, User, LogOut, Shield, Hotel, Store, Moon, Sun, Search, Heart, ChevronDown, Plus, LayoutDashboard, Calendar, CreditCard, Settings, Package, ShoppingBag, Bed } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

import { showLogoutConfirm, showLogoutSuccess } from '../lib/sweetAlert';
import { API_BASE, postJSON, removeAuthToken, formatImageUrl } from '../lib/api';

import { NotificationBell } from './NotificationBell';
import { isBerMonths } from './ChristmasHolidayTheme';

type RoleType = 'tourist' | 'admin' | 'resort' | 'enterprise';

type RoleMenuItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { userType, setUserType, setIsAdmin, setCurrentUser, currentUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Dark mode
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('discover-mansalay:dark') === 'true' ||
      document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('discover-mansalay:dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('discover-mansalay:dark', 'false');
    }
  }, [isDark]);

  const toggleDark = () => setIsDark(prev => !prev);

  const isBusinessUser = userType === 'resort' || userType === 'enterprise';

  const navLinks = [
    { path: '/dashboard', label: 'Home' },
    { path: '/attractions', label: 'Attractions' },
    { path: '/events', label: 'Events' },
    { path: '/products', label: 'Products' },
    { path: '/accommodations', label: 'Stays' },
    { path: '/itinerary', label: 'Itinerary' },
    { path: '/map', label: 'Map' },
  ];

  const roleMenuItems: Record<RoleType, RoleMenuItem[]> = {
    tourist: [
      { to: '/profile', label: 'My Profile', icon: User },
      { to: '/wishlist', label: 'My Wishlist', icon: Heart },
      { to: '/itinerary', label: 'My Itineraries', icon: Calendar },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/users', label: 'Account Management', icon: User },
      { to: '/admin/subscriptions', label: 'Manage Subscriptions', icon: CreditCard },
      { to: '/admin/publish', label: 'Publish Content', icon: Plus },
      { to: '/wishlist', label: 'Most Saved & Analytics', icon: Heart },
    ],
    resort: [
      { to: '/resort/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: `/business/resort/${currentUser?.id ?? ''}?manage=true`, label: 'My Shop Profile', icon: Hotel },
      { to: '/resort/profile', label: 'Manage Rooms', icon: Bed },
      { to: '/wishlist', label: 'Wishlist Analytics & Trends', icon: Heart },
    ],
    enterprise: [
      { to: '/enterprise/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: `/business/enterprise/${currentUser?.id ?? ''}?manage=true`, label: 'My Shop Profile', icon: Store },
      { to: '/enterprise/profile', label: 'Manage Products', icon: Package },
      { to: '/wishlist', label: 'Wishlist Analytics & Trends', icon: Heart },
    ],
  };

  const activeRoleItems = userType ? roleMenuItems[userType as RoleType] : [];

  const handleLogout = async () => {
    const result = await showLogoutConfirm();
    if (!result.isConfirmed) {
      return;
    }

    removeAuthToken();
    setUserType(null);
    setIsAdmin(false);
    setCurrentUser(null);
    window.localStorage.removeItem('discover-mansalay:userType');
    window.localStorage.removeItem('discover-mansalay:isAdmin');
    window.localStorage.removeItem('discover-mansalay:user');
    window.localStorage.removeItem('discover-mansalay:currentUser');
    window.localStorage.removeItem('user');
    setShowUserMenu(false);
    await showLogoutSuccess();
    navigate('/login');
  };

  const closeMenus = () => {
    setShowUserMenu(false);
    setIsOpen(false);
  };

  const getRoleInfo = () => {
    const name = currentUser?.name?.split(' ')[0] || (userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : 'Guest');
    const initial = name.charAt(0).toUpperCase();

    switch (userType) {
      case 'tourist':
        return { initial, label: name, bg: 'bg-blue-500', color: 'text-blue-600' };
      case 'admin':
        return { initial, label: 'Admin', bg: 'bg-purple-500', color: 'text-purple-600' };
      case 'resort': {
        const shopName = (currentUser as any)?.resort_name || name;
        return { initial: shopName.charAt(0).toUpperCase(), label: shopName, bg: 'bg-emerald-500', color: 'text-emerald-600' };
      }
      case 'enterprise': {
        const shopName = (currentUser as any)?.store_name || name;
        return { initial: shopName.charAt(0).toUpperCase(), label: shopName, bg: 'bg-amber-500', color: 'text-amber-600' };
      }
      default:
        return { initial: 'G', label: 'Guest', bg: 'bg-gray-400', color: 'text-gray-600' };
    }
  };

  const roleInfo = getRoleInfo();
  const isHoliday = isBerMonths();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
      {/* Top Pink Line */}
      <div className="h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 w-full" />

      {/* ── ACCUMULATED SNOW MOUNDS ON TOP OF NAVBAR (NAKAUMPOK NA SNOW) ── */}
      {isHoliday && (
        <div className="absolute -top-3 left-0 right-0 overflow-hidden pointer-events-none z-20 select-none">
          <svg
            className="w-full h-3.5 block text-white fill-current filter drop-shadow-[0_2px_3px_rgba(2,132,199,0.35)]"
            viewBox="0 0 1440 24"
            preserveAspectRatio="none"
          >
            {/* Base snow mound with gentle curves */}
            <path
              d="M0,12 Q30,2 60,10 Q90,18 120,6 Q150,0 180,8 Q210,18 240,12 Q270,4 300,10 Q330,20 360,8 Q390,2 420,14 Q450,22 480,10 Q510,4 540,12 Q570,18 600,6 Q630,0 660,10 Q690,20 720,8 Q750,2 780,14 Q810,20 840,10 Q870,4 900,12 Q930,18 960,6 Q990,0 1020,10 Q1050,20 1080,8 Q1110,2 1140,14 Q1170,22 1200,10 Q1230,4 1260,12 Q1290,18 1320,6 Q1350,2 1380,10 Q1410,18 1440,8 L1440,24 L0,24 Z"
              fill="#ffffff"
            />
            {/* Frosty icy-blue accent layer */}
            <path
              d="M0,14 Q30,5 60,12 Q90,20 120,9 Q150,2 180,10 Q210,20 240,14 Q270,6 300,12 Q330,22 360,11 Q390,4 420,16 Q450,24 480,13 Q510,6 540,14 Q570,20 600,9 Q630,2 660,12 Q690,22 720,11 Q750,4 780,16 Q810,22 840,13 Q870,6 900,14 Q930,20 960,9 Q990,2 1020,12 Q1050,22 1080,11 Q1110,4 1140,16 Q1170,24 1200,13 Q1230,6 1260,14 Q1290,20 1320,9 Q1350,4 1380,12 Q1410,20 1440,10 L1440,24 L0,24 Z"
              fill="#e0f2fe"
              opacity="0.8"
            />
          </svg>
        </div>
      )}

      {/* ── SOFT ICICLE / SNOW DRIFTS ALONG BOTTOM OF NAVBAR ── */}
      {isHoliday && (
        <div className="absolute -bottom-2 left-0 right-0 overflow-hidden pointer-events-none z-20 select-none">
          <svg
            className="w-full h-2.5 block text-white fill-current filter drop-shadow-[0_1px_2px_rgba(2,132,199,0.25)]"
            viewBox="0 0 1440 16"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 L1440,0 L1440,4 Q1415,14 1390,3 Q1365,12 1340,4 Q1315,15 1290,5 Q1265,11 1240,3 Q1215,14 1190,4 Q1165,12 1140,3 Q1115,16 1090,4 Q1065,11 1040,3 Q1015,15 990,4 Q965,11 940,3 Q915,14 890,4 Q865,11 840,3 Q815,15 790,4 Q765,12 740,3 Q715,16 690,4 Q665,11 640,3 Q615,14 590,4 Q565,11 540,3 Q515,15 490,4 Q465,12 440,3 Q415,14 390,4 Q365,11 340,3 Q315,15 290,4 Q265,12 240,3 Q215,14 190,4 Q165,11 140,3 Q115,14 90,4 Q65,11 40,3 Q15,11 0,3 Z"
              fill="#ffffff"
            />
            <path
              d="M0,0 L1440,0 L1440,2 Q1415,9 1390,2 Q1365,8 1340,3 Q1315,10 1290,3 Q1265,7 1240,2 Q1215,9 1190,3 Q1165,8 1140,2 Q1115,11 1090,3 Q1065,7 1040,2 Q1015,10 990,3 Q965,7 940,2 Q915,9 890,3 Q865,7 840,2 Q815,10 790,3 Q765,8 740,2 Q715,11 690,3 Q665,7 640,2 Q615,9 590,3 Q565,7 540,2 Q515,10 490,3 Q465,8 440,2 Q415,9 390,3 Q365,7 340,2 Q315,10 290,3 Q265,8 240,2 Q215,9 190,3 Q165,7 140,2 Q115,9 90,3 Q65,7 40,2 Q15,7 0,2 Z"
              fill="#bae6fd"
              opacity="0.7"
            />
          </svg>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo with Christmas Santa Hat */}
          <Link to="/dashboard" className="flex items-center gap-2 group relative">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                <MapPin className="h-5 w-5 fill-white stroke-pink-500" />
              </div>
              {isHoliday && (
                <span className="absolute -top-3.5 -left-2 text-xl select-none pointer-events-none transform -rotate-12 filter drop-shadow">
                  🎅
                </span>
              )}
            </div>
            <span className="text-lg font-extrabold tracking-tight relative">
              <span className="text-pink-500">Discover</span>
              <span className="text-pink-600 dark:text-pink-400">Mansalay</span>
              {isHoliday && (
                <span className="absolute -top-2.5 -right-3.5 text-xs select-none pointer-events-none">
                  ❄️
                </span>
              )}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path || (link.label === 'Home' && (location.pathname === '/' || location.pathname === '/dashboard'));
              const isProtectedLink = (link.path === '/map' || link.path === '/itinerary');

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => {
                    if (isProtectedLink && !currentUser) {
                      e.preventDefault();
                      toast.error(`Please log in to access ${link.label}`);
                      navigate('/login');
                    }
                  }}
                  className={`text-xs xl:text-sm font-semibold transition-all px-3 py-1.5 rounded-full relative ${
                    isActive
                      ? 'bg-pink-100/70 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50/50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {isHoliday && isActive && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] select-none pointer-events-none">
                      ❄️
                    </span>
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Action Icons & Profile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search Button */}
            <button
              onClick={() => navigate('/attractions')}
              className="p-2 text-gray-600 dark:text-slate-300 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Wishlist Button - Only shown when logged in */}
            {currentUser && (
              <button
                onClick={() => navigate('/wishlist')}
                className="p-2 text-gray-600 dark:text-slate-300 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition-colors relative"
                title={userType === 'admin' ? 'Most Saved & Analytics' : isBusinessUser ? 'Most Saved & Trends' : 'Wishlist'}
              >
                <Heart className="h-5 w-5" />
              </button>
            )}

            {/* Notification Bell - Only shown when logged in */}
            {currentUser && <NotificationBell />}

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
              )}
            </button>

            {/* User Role Dropdown Pill */}
            {userType ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-pink-50/60 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700 hover:border-pink-300 rounded-full transition-all text-xs font-semibold text-gray-700 dark:text-slate-200 shadow-2xs"
                >
                  {currentUser?.avatar ? (
                    <img
                      src={formatImageUrl(currentUser.avatar)}
                      alt="avatar"
                      className="w-6 h-6 rounded-full object-cover border border-pink-200"
                    />
                  ) : (
                    <div className={`w-6 h-6 rounded-full ${roleInfo.bg} text-white flex items-center justify-center text-[11px] font-bold`}>
                      {roleInfo.initial}
                    </div>
                  )}
                  <span className="font-bold text-gray-800 dark:text-slate-100">{roleInfo.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-pink-100/80 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150 p-2 font-sans">
                      {/* Header Avatar Card */}
                      <div className="p-3 flex items-center gap-3">
                        {currentUser?.avatar ? (
                          <img
                            src={formatImageUrl(currentUser.avatar)}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover border-2 border-pink-100 dark:border-slate-700"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${roleInfo.bg} text-white font-extrabold flex items-center justify-center text-base shadow-xs`}>
                            {roleInfo.initial}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-slate-100 leading-tight">
                            {userType === 'enterprise'
                              ? ((currentUser as any)?.store_name || currentUser?.name)
                              : userType === 'resort'
                              ? ((currentUser as any)?.resort_name || currentUser?.name)
                              : (currentUser?.name || roleInfo.label)}
                          </h4>
                          <p className="text-xs text-gray-400 font-medium capitalize">{userType}</p>
                        </div>
                      </div>

                      <div className="border-t border-pink-100/60 dark:border-slate-800 my-1" />

                      {/* Main Menu Items with dynamic Icons */}
                      <div className="space-y-0.5">
                        {activeRoleItems.map((item) => {
                          const IconComp = item.icon;
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-pink-50/60 dark:hover:bg-slate-800 rounded-2xl transition-colors text-xs font-semibold text-gray-700 dark:text-slate-200 hover:text-pink-600 dark:hover:text-pink-400"
                            >
                              <IconComp className="h-4 w-4 text-pink-500 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="border-t border-pink-100/60 dark:border-slate-800 my-1" />

                      {/* Logout */}
                      <div className="space-y-0.5">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition-colors text-xs font-bold text-rose-600 dark:text-rose-400"
                        >
                          <LogOut className="h-4 w-4 text-rose-500 flex-shrink-0" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full transition-all text-xs font-semibold shadow-md shadow-pink-500/25 active:scale-95"
              >
                <User className="h-3.5 w-3.5" />
                <span>Login / Register</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            {currentUser && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden pb-4 pt-2 space-y-1.5 border-t border-gray-100 dark:border-slate-800">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => {
                  setIsOpen(false);
                  if ((link.path === '/map' || link.path === '/itinerary') && !currentUser) {
                    e.preventDefault();
                    toast.error(`Please log in to access ${link.label}`);
                    navigate('/login');
                  }
                }}
                className={`block px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  location.pathname === link.path
                    ? 'bg-pink-100/70 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400'
                    : 'text-gray-700 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {userType ? (
              <>
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-0.5">
                  <div className="px-4 py-2 flex items-center gap-3 mb-1 bg-pink-50/40 dark:bg-slate-800/40 rounded-xl">
                    {currentUser?.avatar ? (
                      <img
                        src={formatImageUrl(currentUser.avatar)}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover border border-pink-200"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full ${roleInfo.bg} text-white font-bold flex items-center justify-center text-xs shadow-xs`}>
                        {roleInfo.initial}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-slate-100 leading-tight">
                        {currentUser?.name || roleInfo.label}
                      </p>
                      <p className="text-[10px] text-gray-400 capitalize">{userType}</p>
                    </div>
                  </div>
                  {activeRoleItems.map(item => {
                    const IconComp = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={closeMenus}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-pink-50/60 dark:hover:bg-slate-800"
                      >
                        <IconComp className="h-4 w-4 text-pink-500 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className="w-full mt-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center py-2.5 bg-pink-500 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/25 mt-2"
              >
                Login / Register
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

