import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getJSON, API_BASE } from '../lib/api';

export interface ProductVariation {
  id: number;
  name: string;
  value: string;
  price: number | null;
  stock: number;
  image?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  variations?: ProductVariation[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariation?: {
    id?: number;
    name: string;
    value: string;
    price?: number | null;
  } | null;
}

export interface Accommodation {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  image: string;
  availability: { [date: string]: 'available' | 'booked' | 'full' };
  user_id?: number;
  is_registered?: boolean;
  type?: 'static' | 'resort_profile';
  resort_amenities?: string[];
  resort_facilities?: string | null;
  resort_policies?: string | null;
  resort_images?: string[];
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentMethod: 'online' | 'otc' | 'cod';
  date: string;
}

export interface Booking {
  id: string;
  accommodation: Accommodation;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed';
  paymentMethod: 'online' | 'otc' | 'cod';
  total: number;
}

export interface WishlistItem {
  id: string | number;
  type: 'attraction' | 'accommodation' | 'product' | 'event';
  title: string;
  image?: string;
  category?: string;
  price?: number;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'tourist' | 'admin' | 'resort' | 'enterprise' | 'pending' | null;
  avatar?: string | null;
  phone?: string;
  barangay?: string;
  listing_status?: string;
  subscription_status?: string;
  resort_name?: string;
  store_name?: string;
  address?: string;
  facebook_link?: string;
  instagram_link?: string;
  description?: string;
}

interface AppContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariation?: CartItem['selectedVariation']) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date'>) => void;
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id'>) => void;
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  userType: 'tourist' | 'admin' | 'resort' | 'enterprise' | 'pending' | null;
  setUserType: (type: 'tourist' | 'admin' | 'resort' | 'enterprise' | 'pending' | null) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string | number, type: string) => void;
  isInWishlist: (id: string | number, type: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USER_TYPE_STORAGE_KEY = 'discover-mansalay:userType';
const IS_ADMIN_STORAGE_KEY = 'discover-mansalay:isAdmin';
const CART_STORAGE_KEY = 'discover-mansalay:cart';
const CURRENT_USER_STORAGE_KEY = 'discover-mansalay:currentUser';

function readStoredCart(userType: string | null): CartItem[] {
  if (typeof window === 'undefined' || userType !== 'tourist') {
    return [];
  }

  try {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart) as CartItem[];
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
}

function getWishlistStorageKey(user: CurrentUser | null, role: string | null): string | null {
  if (!user || !user.id || role !== 'tourist') {
    return null;
  }
  return `discover-mansalay:wishlist_user_${user.id}`;
}

function readStoredWishlist(user: CurrentUser | null, role: string | null): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  const key = getWishlistStorageKey(user, role);
  if (!key) return [];
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [userType, setUserType] = useState<'tourist' | 'admin' | 'resort' | 'enterprise' | 'pending' | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedUserType = window.localStorage.getItem(USER_TYPE_STORAGE_KEY);
    return storedUserType === 'tourist' || storedUserType === 'admin' || storedUserType === 'resort' || storedUserType === 'enterprise' || storedUserType === 'pending'
      ? (storedUserType as 'tourist' | 'admin' | 'resort' | 'enterprise' | 'pending')
      : null;
  });

  const [currentUser, setCurrentUser] = useState<AppContextType['currentUser']>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const storedUser = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart(userType));
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => readStoredWishlist(currentUser, userType));
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(IS_ADMIN_STORAGE_KEY) === 'true';
  });

  // Clean up legacy unscoped wishlist key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('discover-mansalay:wishlist');
    }
  }, []);

  // Synchronize user-scoped wishlist whenever currentUser or userType changes
  useEffect(() => {
    if (userType === 'tourist' && currentUser?.id) {
      setWishlist(readStoredWishlist(currentUser, userType));
    } else {
      setWishlist([]);
    }
  }, [currentUser?.id, userType]);

  // Persist user-specific wishlist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = getWishlistStorageKey(currentUser, userType);
      if (key) {
        window.localStorage.setItem(key, JSON.stringify(wishlist));
      }
    }
  }, [wishlist, currentUser, userType]);

  useEffect(() => {
    if (userType) {
      window.localStorage.setItem(USER_TYPE_STORAGE_KEY, userType);
      
      // Clear cart when switching to business accounts (enterprise/resort)
      if (userType === 'enterprise' || userType === 'resort') {
        setCart([]);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } else {
      window.localStorage.removeItem(USER_TYPE_STORAGE_KEY);
    }
  }, [userType]);

  useEffect(() => {
    window.localStorage.setItem(IS_ADMIN_STORAGE_KEY, String(isAdmin));
  }, [isAdmin]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    // Only save cart for tourists
    if (userType === 'tourist') {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, userType]);

  // Note: Orders and bookings are no longer loaded from API since this is now a display-only platform

  const addToCart = (
    product: Product,
    quantity: number = 1,
    selectedVariation?: CartItem['selectedVariation'],
  ) => {
    // Only tourists can add to cart
    if (userType !== 'tourist') {
      return;
    }

    const qty = Math.max(1, quantity);

    // Variation key lets the same product with different variations live as
    // separate cart lines (Shopee-style). Empty string when no variation.
    const variationKey = selectedVariation
      ? `${selectedVariation.name}:${selectedVariation.value}`
      : '';

    // Cart line identifier - composite of product id + variation. This keeps
    // distinct sizes/colors separate but ensures duplicate adds merge.
    const cartLineId = variationKey
      ? `${product.id}__${variationKey}`
      : String(product.id);

    // Effective unit price: variation price override if set, else base price.
    const effectivePrice =
      selectedVariation && selectedVariation.price != null
        ? Number(selectedVariation.price)
        : product.price;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartLineId);

      if (existing) {
        return prev.map(item =>
          item.id === cartLineId
            ? { ...item, quantity: Math.min(item.quantity + qty, product.stock) }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          id: cartLineId,
          price: effectivePrice,
          quantity: Math.min(qty, product.stock),
          selectedVariation: selectedVariation ?? null,
        } as CartItem,
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    // Only tourists can modify cart
    if (userType !== 'tourist') {
      return;
    }
    
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    // Only tourists can modify cart
    if (userType !== 'tourist') {
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) } : item
      ).filter(item => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  const addOrder = (orderData: Omit<Order, 'id' | 'date'>) => {
    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
    };
    setOrders(prev => [...prev, newOrder]);
  };

  const addBooking = (bookingData: Omit<Booking, 'id'>) => {
    const newBooking: Booking = {
      ...bookingData,
      id: `BKG-${Date.now()}`,
    };
    setBookings(prev => [...prev, newBooking]);
  };

  const addToWishlist = (item: WishlistItem) => {
    if (userType !== 'tourist' || !currentUser?.id) {
      return;
    }
    setWishlist(prev => {
      if (prev.some(w => String(w.id) === String(item.id) && w.type === item.type)) {
        return prev;
      }
      return [...prev, item];
    });

    // Real-time Wishlist Counter updates & instant broadcast
    try {
      const countsStr = window.localStorage.getItem('discover-mansalay:wishlist_counts');
      const counts = countsStr ? JSON.parse(countsStr) : {};
      const key = `${item.type || 'attraction'}_${item.id}`;
      counts[key] = (counts[key] || 0) + 1;
      window.localStorage.setItem('discover-mansalay:wishlist_counts', JSON.stringify(counts));

      // Non-blocking backend sync
      fetch(`${API_BASE}/api/public/wishlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          item_type: item.type || 'attraction',
          action: 'save',
        }),
      }).catch(() => {});

      // Real-time reactive notification
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { item, action: 'save', newCount: counts[key] } }));
      window.dispatchEvent(new Event('contentUpdated'));
    } catch {}
  };

  const removeFromWishlist = (id: string | number, type: string) => {
    if (userType !== 'tourist' || !currentUser?.id) {
      return;
    }
    setWishlist(prev => prev.filter(w => !(String(w.id) === String(id) && w.type === type)));

    // Real-time Wishlist Counter updates & instant broadcast
    try {
      const countsStr = window.localStorage.getItem('discover-mansalay:wishlist_counts');
      const counts = countsStr ? JSON.parse(countsStr) : {};
      const key = `${type || 'attraction'}_${id}`;
      counts[key] = Math.max(0, (counts[key] || 1) - 1);
      window.localStorage.setItem('discover-mansalay:wishlist_counts', JSON.stringify(counts));

      // Non-blocking backend sync
      fetch(`${API_BASE}/api/public/wishlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: id,
          item_type: type || 'attraction',
          action: 'unsave',
        }),
      }).catch(() => {});

      // Real-time reactive notification
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { id, type, action: 'unsave', newCount: counts[key] } }));
      window.dispatchEvent(new Event('contentUpdated'));
    } catch {}
  };

  const isInWishlist = (id: string | number, type: string) => {
    if (userType !== 'tourist' || !currentUser?.id) return false;
    return wishlist.some(w => String(w.id) === String(id) && w.type === type);
  };

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        orders,
        addOrder,
        bookings,
        addBooking,
        isAdmin,
        setIsAdmin,
        userType,
        setUserType,
        currentUser,
        setCurrentUser,
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
