import { Link, useLocation, useNavigate } from 'react-router';
import { ShoppingCart, Menu, X, MapPin, User, LogOut, Shield, Hotel, Store } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NotificationBell } from './NotificationBell';
import { showLogoutConfirm, showLogoutSuccess } from '../lib/sweetAlert';

type RoleType = 'tourist' | 'admin' | 'resort' | 'enterprise';

type RoleMenuItem = {
  to: string;
  label: string;
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { cart, userType, setUserType, setIsAdmin, clearCart, setCurrentUser, currentUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = (() => {
    switch (userType) {
      case 'admin':
        return '/admin/dashboard';
      case 'resort':
        return '/resort/dashboard';
      case 'enterprise':
        return '/enterprise/dashboard';
      case 'tourist':
      default:
        return '/';
    }
  })();

  const navLinks = [
    { path: dashboardPath, label: 'Home' },
    { path: '/attractions', label: 'Attractions' },
    { path: '/events', label: 'Events' },
    { path: '/products', label: 'Products' },
    { path: '/accommodations', label: 'Accommodations' },
  ];

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const roleMenuItems: Record<RoleType, RoleMenuItem[]> = {
    tourist: [
      { to: '/', label: 'Dashboard' },
      { to: '/status', label: 'My Orders & Bookings' },
      { to: '/settings', label: 'Settings' },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/listings', label: 'Manage Listings' },
      { to: '/admin/events', label: 'Manage Events' },
      { to: '/admin/users', label: 'User Management' },
      { to: '/admin/subscriptions', label: 'Subscriptions' },
      { to: '/admin/payment-settings', label: 'Payment Settings' },
    ],
    resort: [
      { to: '/resort/dashboard', label: 'Dashboard' },
      { to: '/resort/profile', label: 'Manage Profile' },
    ],
    enterprise: [
      { to: '/enterprise/dashboard', label: 'Dashboard' },
      { to: '/enterprise/profile', label: 'Manage Products' },
      { to: '/enterprise/orders', label: 'Manage Orders' },
    ],
  };

  const activeRoleItems = userType ? roleMenuItems[userType as RoleType] : [];

  const handleLogout = async () => {
    const result = await showLogoutConfirm();
    if (!result.isConfirmed) {
      return;
    }

    setUserType(null);
    setIsAdmin(false);
    setCurrentUser(null);
    clearCart();
    window.localStorage.removeItem('discover-mansalay:userType');
    window.localStorage.removeItem('discover-mansalay:isAdmin');
    setShowUserMenu(false);
    await showLogoutSuccess();
    navigate('/select-role');
  };

  const closeMenus = () => {
    setShowUserMenu(false);
    setIsOpen(false);
  };

  const getRoleInfo = () => {
    switch (userType) {
      case 'tourist':
        return { icon: User, label: currentUser?.name || 'Tourist', color: 'text-blue-600' };
      case 'admin':
        return { icon: Shield, label: currentUser?.name || 'Admin', color: 'text-purple-600' };
      case 'resort':
        return { icon: Hotel, label: currentUser?.name || 'Resort Owner', color: 'text-green-600' };
      case 'enterprise':
        return { icon: Store, label: currentUser?.name || 'Enterprise', color: 'text-pink-600' };
      default:
        return { icon: User, label: 'Guest', color: 'text-gray-600' };
    }
  };

  const roleInfo = getRoleInfo();
  const RoleIcon = roleInfo.icon;

  return (
    <nav className="bg-white border-b-2 border-primary/20 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            <span className="text-xl text-primary">DiscoverMansalay</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary'
                    : 'text-foreground hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Show cart only for tourists */}
            {userType === 'tourist' ? (
              <Link to="/cart" className="relative">
                <ShoppingCart className="h-6 w-6 text-foreground hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            ) : null}

            {/* Notification Bell - Show for all logged in users */}
            {userType && <NotificationBell />}

            {/* User Role Menu */}
            {userType ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-2 border-primary/20 rounded-lg hover:border-primary transition-colors"
                >
                  <RoleIcon className={`h-5 w-5 ${roleInfo.color}`} />
                  <span className="text-sm">{roleInfo.label}</span>
                </button>

                {showUserMenu && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-primary/20 rounded-lg shadow-lg overflow-hidden z-20">
                      <div className="p-3 border-b border-primary/20 bg-primary/5">
                        <p className="text-sm text-muted-foreground">Current Role</p>
                        <p className={`flex items-center gap-2 font-medium ${roleInfo.color}`}>
                          <RoleIcon className="h-4 w-4" />
                          {roleInfo.label}
                        </p>
                      </div>
                      <div className="py-1">
                        {activeRoleItems.map(item => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setShowUserMenu(false)}
                            className="block px-4 py-3 hover:bg-primary/5 transition-colors text-foreground"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-primary/20">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 hover:bg-destructive/10 transition-colors flex items-center gap-2 text-destructive font-medium"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/select-role"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-sm">Login / Register</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <div className="px-4 py-3 bg-primary/5 rounded-lg mb-2">
              <p className="text-xs text-muted-foreground">Current Role</p>
              <p className={`flex items-center gap-2 ${roleInfo.color}`}>
                <RoleIcon className="h-4 w-4" />
                {roleInfo.label}
              </p>
            </div>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 rounded ${
                  location.pathname === link.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-primary/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Show cart only for tourists in mobile */}
            {userType === 'tourist' && (
              <Link
                to="/cart"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
              >
                Cart ({cartCount})
              </Link>
            )}
            {activeRoleItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMenus}
                className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-destructive text-white rounded-lg text-center flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
