import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import type { ApiNotification } from '../lib/api';

// Mock react-router's useNavigate
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock the NotificationContext
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteNotification = vi.fn();

function buildMockContext(unreadCount: number, notifications: ApiNotification[] = []) {
  return {
    notifications,
    unreadCount,
    loading: false,
    refresh: vi.fn(),
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    setChatOpen: vi.fn(),
    showOrderStatusNotification: vi.fn(),
    showOrderPlacedNotification: vi.fn(),
  };
}

vi.mock('../context/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

import { useNotifications } from '../context/NotificationContext';

const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationBell badge rendering', () => {
  it('renders the exact count when unreadCount is 1', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(1));
    render(<NotificationBell />);
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
  });

  it('renders the exact count when unreadCount is 5', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(5));
    render(<NotificationBell />);
    const badge = screen.getByText('5');
    expect(badge).toBeInTheDocument();
  });

  it('renders the exact count when unreadCount is 9', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(9));
    render(<NotificationBell />);
    const badge = screen.getByText('9');
    expect(badge).toBeInTheDocument();
  });

  it('renders "9+" when unreadCount is 10', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(10));
    render(<NotificationBell />);
    const badge = screen.getByText('9+');
    expect(badge).toBeInTheDocument();
  });

  it('renders "9+" when unreadCount is 100', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(100));
    render(<NotificationBell />);
    const badge = screen.getByText('9+');
    expect(badge).toBeInTheDocument();
  });

  it('does not render a badge when unreadCount is 0', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(0));
    render(<NotificationBell />);
    // The badge span is only rendered when unreadCount > 0
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    // Verify no numeric badge text is present
    const button = screen.getByRole('button', { name: /notifications/i });
    // The badge span should not exist — check that no span with a number is rendered
    expect(button.querySelector('span')).toBeNull();
  });

  it('badge text is derived from unread_count field, not from counting is_read === false items', () => {
    // Server says unread_count = 3, but there are 5 notifications with is_read === false
    // The badge should show 3 (from unread_count), not 5 (from local count)
    const notifications: ApiNotification[] = [
      { id: 1, user_id: 1, type: 'order_status', title: 'T1', message: 'M1', data: null, link: null, is_read: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 2, user_id: 1, type: 'order_status', title: 'T2', message: 'M2', data: null, link: null, is_read: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 3, user_id: 1, type: 'order_status', title: 'T3', message: 'M3', data: null, link: null, is_read: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 4, user_id: 1, type: 'order_status', title: 'T4', message: 'M4', data: null, link: null, is_read: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 5, user_id: 1, type: 'order_status', title: 'T5', message: 'M5', data: null, link: null, is_read: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ];

    // unreadCount = 3 (from server), but 5 items have is_read === false
    mockUseNotifications.mockReturnValue(buildMockContext(3, notifications));
    render(<NotificationBell />);

    // Badge should show "3" (from unread_count), not "5" (from local count)
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
});
