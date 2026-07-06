import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import {
  ApiNotification,
  deleteNotification as apiDeleteNotification,
  getAuthToken,
  getNotifications as apiGetNotifications,
  markAllNotificationsAsRead as apiMarkAllRead,
  markNotificationAsRead as apiMarkRead,
} from '../lib/api';

const POLL_INTERVAL_MS = 15000;

interface NotificationContextType {
  notifications: ApiNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  setChatOpen: (receiverId: number | null) => void;
  // Backward-compatible client-side toast helpers (used across the app)
  showOrderStatusNotification: (orderId: string, oldStatus: string, newStatus: string) => void;
  showOrderPlacedNotification: (orderId: string, businessName: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openChatReceiverId, setOpenChatReceiverId] = useState<number | null>(null);

  // Ref mirror of openChatReceiverId so refresh() can read it without a stale closure
  const openChatReceiverIdRef = useRef<number | null>(null);

  // Keep the ref in sync with the state
  useEffect(() => {
    openChatReceiverIdRef.current = openChatReceiverId;
  }, [openChatReceiverId]);

  // Track previous unread count so we can surface a toast when new items arrive
  const prevUnreadRef = useRef<number>(0);
  const prevTopIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const refresh = useCallback(async () => {
    // Only fetch if there's an auth token
    if (!getAuthToken()) {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
      prevTopIdRef.current = null;
      return;
    }

    try {
      setLoading(true);
      const res = await apiGetNotifications();
      const list = Array.isArray(res?.notifications) ? res.notifications : [];
      const nextUnread = typeof res?.unread_count === 'number' ? res.unread_count : 0;
      const topId = list.length > 0 ? list[0].id : null;

      // Fire a toast if a new notification arrived after the first load
      if (initializedRef.current && topId !== null && prevTopIdRef.current !== topId && nextUnread > prevUnreadRef.current) {
        const latest = list[0];
        if (latest) {
          if (latest.type === 'message_received') {
            const senderId = latest.data?.sender_id ?? null;
            // Suppress toast if ChatModal is open for this sender's conversation
            if (senderId !== null && senderId === openChatReceiverIdRef.current) {
              // suppress — user is already viewing this conversation
            } else {
              toast.info(latest.title, {
                description: latest.message,
              });
            }
          } else {
            toast.info(latest.title, {
              description: latest.message,
            });
          }
        }
      }

      setNotifications(list);
      setUnreadCount(nextUnread);
      prevUnreadRef.current = nextUnread;
      prevTopIdRef.current = topId;
      initializedRef.current = true;
    } catch (error) {
      // Silent fail — keep previous state
      console.warn('Failed to refresh notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    // Re-fetch when the window regains focus
    const handleFocus = () => refresh();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await apiMarkRead(id);
    } catch (error) {
      console.warn('Failed to mark notification as read:', error);
      // Refresh to re-sync
      refresh();
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await apiMarkAllRead();
    } catch (error) {
      console.warn('Failed to mark all as read:', error);
      refresh();
    }
  }, [refresh]);

  const deleteNotification = useCallback(async (id: number) => {
    const previous = notifications;
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    const removed = previous.find(n => n.id === id);
    if (removed && !removed.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await apiDeleteNotification(id);
    } catch (error) {
      console.warn('Failed to delete notification:', error);
      refresh();
    }
  }, [notifications, refresh]);

  const setChatOpen = useCallback((receiverId: number | null) => {
    setOpenChatReceiverId(receiverId);
  }, []);

  // -------------------------------------------------------------------------
  // Backward-compatible helpers that show a local toast only.
  // Real persistence now happens server-side via backend triggers.
  // -------------------------------------------------------------------------

  const showOrderStatusNotification = useCallback(
    (orderId: string, _oldStatus: string, newStatus: string) => {
      const statusEmojis: Record<string, string> = {
        pending: '⏳',
        confirmed: '✅',
        shipped: '🚚',
        delivered: '📦',
      };
      const emoji = statusEmojis[newStatus] ?? '🔔';
      toast.info(`${emoji} Order #${orderId} ${newStatus}`, {
        description: `Order status is now ${newStatus}.`,
      });
    },
    []
  );

  const showOrderPlacedNotification = useCallback(
    (orderId: string, _businessName: string) => {
      toast.success('🛍️ New Order Received', {
        description: `Order #${orderId} has been placed by a customer.`,
      });
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        setChatOpen,
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
