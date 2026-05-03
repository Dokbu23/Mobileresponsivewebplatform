import { Link, useLocation, useNavigate } from 'react-router';
import { ShoppingCart, Menu, X, MapPin, User, LogOut, Shield, Hotel, Store } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { cart, userType, setUserType, setIsAdmin } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/attractions', label: 'Attractions' },
    { path: '/events', label: 'Events' },
    { path: '/products', label: 'Products' },
    { path: '/accommodations', label: 'Accommodations' },
  ];

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    setUserType(null);
    setIsAdmin(false);
    setShowUserMenu(false);
    navigate('/select-role');
  };

  const getRoleInfo = () => {
    switch (userType) {
      case 'tourist':
        return { icon: User, label: 'Tourist', color: 'text-blue-600' };
      case 'admin':
        return { icon: Shield, label: 'Admin', color: 'text-purple-600' };
      case 'resort':
        return { icon: Hotel, label: 'Resort Owner', color: 'text-green-600' };
      case 'enterprise':
        return { icon: Store, label: 'Enterprise', color: 'text-pink-600' };
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

            {userType ? (
              <Link to="/cart" className="relative">
                <ShoppingCart className="h-6 w-6 text-foreground hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            ) : null}

            {/* User Role Menu */}
            <div className="relative">
              <button
                onClick={() => userType ? setShowUserMenu(!showUserMenu) : navigate('/select-role')}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-2 border-primary/20 rounded-lg hover:border-primary transition-colors"
              >
                <RoleIcon className={`h-5 w-5 ${roleInfo.color}`} />
                <span className="text-sm">{roleInfo.label}</span>
              </button>

              {showUserMenu && userType && (
                <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-primary/20 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-primary/20 bg-primary/5">
                    <p className="text-sm">Current Role</p>
                    <p className={`flex items-center gap-2 ${roleInfo.color}`}>
                      <RoleIcon className="h-4 w-4" />
                      {roleInfo.label}
                    </p>
                  </div>
                  {userType === 'admin' && (
                    <>
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/admin/listings"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Manage Listings
                      </Link>
                      <Link
                        to="/admin/orders"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Manage Orders
                      </Link>
                    </>
                  )}
                  {userType === 'resort' && (
                    <>
                      <Link
                        to="/resort/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/resort/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Manage Profile
                      </Link>
                    </>
                  )}
                  {userType === 'enterprise' && (
                    <>
                      <Link
                        to="/enterprise/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/enterprise/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                      >
                        Manage Products
                      </Link>
                    </>
                  )}
                  {userType === 'tourist' && (
                    <Link
                      to="/status"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-3 hover:bg-primary/5 transition-colors"
                    >
                      My Orders & Bookings
                    </Link>
                  )}
                  <Link
                    to="/select-role"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-3 hover:bg-primary/5 transition-colors border-t border-primary/20"
                  >
                    Switch Role
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center gap-2 text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
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
            {userType && (
              <Link
                to="/cart"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
              >
                Cart ({cartCount})
              </Link>
            )}
            {userType === 'tourist' && (
              <Link
                to="/status"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
              >
                My Orders & Bookings
              </Link>
            )}
            {userType === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/listings"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Manage Listings
                </Link>
                <Link
                  to="/admin/orders"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Manage Orders
                </Link>
              </>
            )}
            {userType === 'resort' && (
              <>
                <Link
                  to="/resort/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Dashboard
                </Link>
                <Link
                  to="/resort/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Manage Profile
                </Link>
              </>
            )}
            {userType === 'enterprise' && (
              <>
                <Link
                  to="/enterprise/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Dashboard
                </Link>
                <Link
                  to="/enterprise/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 rounded text-foreground hover:bg-primary/5"
                >
                  Manage Products
                </Link>
              </>
            )}
            <Link
              to="/select-role"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 bg-white border-2 border-primary text-primary rounded-lg text-center"
            >
              Switch Role
            </Link>
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
