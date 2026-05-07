import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getJSON } from '../lib/api';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Accommodation {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  image: string;
  availability: { [date: string]: 'available' | 'booked' | 'full' };
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentMethod: 'online' | 'otc';
  date: string;
}

export interface Booking {
  id: string;
  accommodation: Accommodation;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed';
  paymentMethod: 'online' | 'otc';
  total: number;
}

interface AppContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date'>) => void;
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id'>) => void;
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  userType: 'tourist' | 'admin' | 'resort' | 'enterprise' | null;
  setUserType: (type: 'tourist' | 'admin' | 'resort' | 'enterprise' | null) => void;
  currentUser: {
    id: number;
    name: string;
    email: string;
    role: 'tourist' | 'admin' | 'resort' | 'enterprise';
  } | null;
  setCurrentUser: (user: AppContextType['currentUser']) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [userType, setUserType] = useState<'tourist' | 'admin' | 'resort' | 'enterprise' | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedUserType = window.localStorage.getItem(USER_TYPE_STORAGE_KEY);
    return storedUserType === 'tourist' || storedUserType === 'admin' || storedUserType === 'resort' || storedUserType === 'enterprise'
      ? storedUserType
      : null;
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart(userType));
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(IS_ADMIN_STORAGE_KEY) === 'true';
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

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [ordersResponse, bookingsResponse] = await Promise.all([
          getJSON('/api/orders'),
          getJSON('/api/bookings'),
        ]);

        if (!isMounted) {
          return;
        }

        setOrders(
          Array.isArray(ordersResponse)
            ? ordersResponse.map((order: any) => ({
                id: String(order.id),
                items: Array.isArray(order.items) ? order.items : [],
                total: Number(order.total) || 0,
                status: order.status,
                paymentMethod: order.payment_method ?? order.paymentMethod ?? 'online',
                date: order.created_at ?? order.date ?? new Date().toISOString(),
              }))
            : []
        );

        setBookings(
          Array.isArray(bookingsResponse)
            ? bookingsResponse.map((booking: any) => ({
                id: String(booking.id),
                accommodation: {
                  id: String(booking.accommodation_snapshot?.id ?? booking.accommodation_id ?? booking.id),
                  name: booking.accommodation_snapshot?.name ?? 'Accommodation',
                  description: booking.accommodation_snapshot?.description ?? '',
                  pricePerNight: Number(booking.accommodation_snapshot?.pricePerNight ?? booking.accommodation_snapshot?.price_per_night ?? 0),
                  image: booking.accommodation_snapshot?.image ?? '',
                  availability: booking.accommodation_snapshot?.availability ?? {},
                },
                checkIn: booking.check_in,
                checkOut: booking.check_out,
                status: booking.status,
                paymentMethod: booking.payment_method ?? booking.paymentMethod ?? 'online',
                total: Number(booking.total) || 0,
              }))
            : []
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setOrders([]);
        setBookings([]);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const addToCart = (product: Product) => {
    // Only tourists can add to cart
    if (userType !== 'tourist') {
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
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
