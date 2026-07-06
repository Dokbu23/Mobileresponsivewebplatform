// Feature: notifications-and-order-cancellation
// Property-based tests for OrderStatus cancel button visibility

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../context/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  getJSON: vi.fn(),
  postJSON: vi.fn(),
  getOrderReviewStatus: vi.fn(),
}));

vi.mock('../../lib/sweetAlert', () => ({
  showConfirmDialog: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../components/ReviewModal', () => ({
  default: () => null,
}));

// ── Imports after mocks ────────────────────────────────────────────────────

import { OrderStatus } from './OrderStatus';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { getJSON } from '../../lib/api';

const mockUseApp = useApp as ReturnType<typeof vi.fn>;
const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;
const mockGetJSON = getJSON as ReturnType<typeof vi.fn>;

function buildOrder(status: string, id = 1) {
  return {
    id,
    status,
    items: [{ product_id: 10, name: 'Widget', price: 100, quantity: 2 }],
    total: 200,
    payment_method: 'cod',
    created_at: '2024-01-01T00:00:00Z',
    business_owner: { name: 'Test Shop' },
  };
}

function setupMocks(orders: any[] = []) {
  mockUseApp.mockReturnValue({
    userType: 'tourist',
    currentUser: { id: 1, name: 'Test User', email: 'test@example.com', role: 'tourist' },
  });

  mockUseNotifications.mockReturnValue({
    showOrderStatusNotification: vi.fn(),
    notifications: [],
    unreadCount: 0,
    loading: false,
    refresh: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    setChatOpen: vi.fn(),
    showOrderPlacedNotification: vi.fn(),
  });

  mockGetJSON.mockImplementation((path: string) => {
    if (path === '/orders/my') return Promise.resolve(orders);
    if (path === '/bookings/my') return Promise.resolve([]);
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// P7 — Cancel button visibility is status-driven
// Validates: Requirements 4.1, 4.2
// ---------------------------------------------------------------------------

describe('P7 — Cancel button visibility is status-driven', () => {
  // Feature: notifications-and-order-cancellation, Property 7: Cancel button visibility is status-driven

  it('"Cancel Order" button is present iff status is pending or confirmed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
        async (status) => {
          setupMocks([buildOrder(status)]);
          const { unmount } = render(<OrderStatus />);

          const shouldBePresent = status === 'pending' || status === 'confirmed';

          if (shouldBePresent) {
            await waitFor(() => {
              expect(screen.queryByText('Cancel Order')).not.toBeNull();
            });
          } else {
            await waitFor(() => {
              expect(screen.queryByText('Cancel Order')).toBeNull();
            });
          }

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('"Cancel Order" button is present for pending status', async () => {
    setupMocks([buildOrder('pending')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.getByText('Cancel Order')).toBeInTheDocument();
    });
  });

  it('"Cancel Order" button is present for confirmed status', async () => {
    setupMocks([buildOrder('confirmed')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.getByText('Cancel Order')).toBeInTheDocument();
    });
  });

  it('"Cancel Order" button is absent for shipped, delivered, cancelled statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('shipped', 'delivered', 'cancelled'),
        async (status) => {
          setupMocks([buildOrder(status)]);
          const { unmount } = render(<OrderStatus />);

          await waitFor(() => {
            expect(screen.queryByText('Cancel Order')).toBeNull();
          });

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
