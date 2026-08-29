import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, X, MapPin, User, LogOut, Shield, Hotel, Store, Moon, Sun, Search, Heart, ChevronDown, Plus, LayoutDashboard, Calendar, CreditCard, Settings, Package, ShoppingBag, Bed } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

import { showLogoutConfirm, showLogoutSuccess } from '../lib/sweetAlert';
import { API_BASE, postJSON, removeAuthToken } from '../lib/api';

import { NotificationBell } from './NotificationBell';

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

  const navLinks = [
    { path: '/dashboard', label: 'Home' },
    { path: '/attractions', label: 'Attractions' },
    { path: '/events', label: 'Events' },
    { path: '/products', label: 'Products' },
    { path: '/accommodations', label: 'Stays' },
    { path: '/map', label: 'Map' },
    ...(currentUser && userType === 'tourist' ? [{ path: '/itinerary', label: 'Itinerary' }] : []),
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
      { to: '/admin/events', label: 'Manage Events', icon: Calendar },
    ],
    resort: [
      { to: '/resort/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: `/business/resort/${currentUser?.id ?? ''}?manage=true`, label: 'My Shop Profile', icon: Hotel },
      { to: '/resort/profile', label: 'Manage Rooms', icon: Bed },
    ],
    enterprise: [
      { to: '/enterprise/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: `/business/enterprise/${currentUser?.id ?? ''}?manage=true`, label: 'My Shop Profile', icon: Store },
      { to: '/enterprise/profile', label: 'Manage Products', icon: Package },
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

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
      {/* Top Pink Line */}
      <div className="h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
              <MapPin className="h-5 w-5 fill-white stroke-pink-500" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-pink-500">Discover</span>
              <span className="text-pink-600 dark:text-pink-400">Mansalay</span>
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
                      navigate('/tourist/login');
                    }
                  }}
                  className={`text-xs xl:text-sm font-semibold transition-all px-3 py-1.5 rounded-full ${
                    isActive
                      ? 'bg-pink-100/70 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50/50 dark:hover:bg-slate-800/60'
                  }`}
                >
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
                title="Wishlist"
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
                      src={currentUser.avatar.startsWith('http') ? currentUser.avatar : `${API_BASE}${currentUser.avatar}`}
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
                            src={currentUser.avatar.startsWith('http') ? currentUser.avatar : `${API_BASE}${currentUser.avatar}`}
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
                    navigate('/tourist/login');
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

