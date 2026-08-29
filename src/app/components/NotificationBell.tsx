import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  Package,
  Hotel,
  CreditCard,
  Star,
  MessageCircle,
  UserPlus,
  BadgeCheck,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { getAuthToken, type ApiNotification } from '../lib/api';

function getIcon(type: string) {
  switch (type) {
    case 'order_new':
    case 'order_status':
      return <Package className="h-4 w-4 text-pink-500" />;
    case 'booking_new':
    case 'booking_status':
      return <Hotel className="h-4 w-4 text-pink-500" />;
    case 'payment_submitted':
    case 'payment_verified':
      return <CreditCard className="h-4 w-4 text-pink-500" />;
    case 'subscription_paid':
      return <BadgeCheck className="h-4 w-4 text-pink-500" />;
    case 'review_received':
      return <Star className="h-4 w-4 text-pink-500" />;
    case 'message_received':
      return <MessageCircle className="h-4 w-4 text-pink-500" />;
    case 'user_registered':
      return <UserPlus className="h-4 w-4 text-pink-500" />;
    case 'order_cancelled':
      return <Package className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4 text-pink-500" />;
  }
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const { currentUser } = useApp();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  if (!currentUser && !getAuthToken()) {
    return null;
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = async (notification: ApiNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      navigate(notification.link);
    }
  };

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    await deleteNotification(id);
  };

  const handleMarkAll = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await markAllAsRead();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors rounded-full hover:bg-pink-50 dark:hover:bg-pink-500/10"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white dark:border-gray-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[360px] sm:w-[400px] bg-white dark:bg-[#16213e] rounded-xl shadow-2xl border border-pink-100 dark:border-pink-500/20 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-pink-100 dark:border-pink-500/20 bg-gradient-to-r from-pink-50 dark:from-pink-500/10 to-white dark:to-[#16213e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-pink-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <span className="ml-1 text-[10px] font-bold bg-pink-500 text-white rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs text-pink-500 hover:text-pink-600 font-medium inline-flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="h-10 w-10 mx-auto mb-2 text-pink-200 dark:text-pink-500/30" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  We'll let you know when something happens.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-pink-50 dark:divide-pink-500/10">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    onClick={() => handleItemClick(notification)}
                    className={`group px-4 py-3 cursor-pointer transition-colors ${
                      notification.is_read
                        ? 'hover:bg-gray-50 dark:hover:bg-white/5'
                        : 'bg-pink-50/50 dark:bg-pink-500/8 hover:bg-pink-50 dark:hover:bg-pink-500/12'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${
                          notification.is_read
                            ? 'bg-gray-100 dark:bg-white/10'
                            : 'bg-pink-100 dark:bg-pink-500/20'
                        }`}
                      >
                        {getIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm dark:text-gray-100 ${
                              notification.is_read
                                ? 'font-normal text-gray-900'
                                : 'font-semibold text-gray-900'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 mt-1.5 bg-pink-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
