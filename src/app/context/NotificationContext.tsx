import { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'order_status_changed' | 'order_placed' | 'booking_status_changed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  bookingId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  showOrderStatusNotification: (orderId: string, oldStatus: string, newStatus: string) => void;
  showOrderPlacedNotification: (orderId: string, businessName: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = 'discover-mansalay:notifications';

function readStoredNotifications(): Notification[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as Notification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => readStoredNotifications());

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only last 50 notifications
      const limited = updated.slice(0, 50);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limited));
      }
      
      return limited;
    });

    // Show toast notification
    toast.success(notificationData.title, {
      description: notificationData.message,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      );
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notif => ({ ...notif, read: true }));
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  const showOrderStatusNotification = (orderId: string, oldStatus: string, newStatus: string) => {
    const statusMessages = {
      pending: 'Your order is being processed',
      confirmed: 'Your order has been confirmed and is being prepared',
      shipped: 'Your order has been shipped and is on the way',
      delivered: 'Your order has been delivered successfully'
    };

    const statusEmojis = {
      pending: '⏳',
      confirmed: '✅',
      shipped: '🚚',
      delivered: '📦'
    };

    addNotification({
      type: 'order_status_changed',
      title: `${statusEmojis[newStatus as keyof typeof statusEmojis]} Order #${orderId} ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: statusMessages[newStatus as keyof typeof statusMessages] || `Order status updated to ${newStatus}`,
      orderId,
    });
  };

  const showOrderPlacedNotification = (orderId: string, businessName: string) => {
    addNotification({
      type: 'order_placed',
      title: `🛍️ New Order Received`,
      message: `Order #${orderId} has been placed by a customer`,
      orderId,
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        unreadCount,
        showOrderStatusNotification,
        showOrderPlacedNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}