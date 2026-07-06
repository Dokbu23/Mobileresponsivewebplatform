import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks (must be declared before imports that use them) ──────────────────

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

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock ReviewModal to avoid deep dependency tree
vi.mock('../../components/ReviewModal', () => ({
  default: () => null,
}));

// ── Imports after mocks ────────────────────────────────────────────────────

import { OrderStatus } from './OrderStatus';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { getJSON, postJSON } from '../../lib/api';
import { showConfirmDialog } from '../../lib/sweetAlert';
import { toast } from 'sonner';

const mockUseApp = useApp as ReturnType<typeof vi.fn>;
const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;
const mockGetJSON = getJSON as ReturnType<typeof vi.fn>;
const mockPostJSON = postJSON as ReturnType<typeof vi.fn>;
const mockShowConfirmDialog = showConfirmDialog as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OrderStatus — Cancel Order button visibility', () => {
  it('renders "Cancel Order" button for a pending order', async () => {
    setupMocks([buildOrder('pending')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.getByText('Cancel Order')).toBeInTheDocument();
    });
  });

  it('renders "Cancel Order" button for a confirmed order', async () => {
    setupMocks([buildOrder('confirmed')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.getByText('Cancel Order')).toBeInTheDocument();
    });
  });

  it('does NOT render "Cancel Order" button for a shipped order', async () => {
    setupMocks([buildOrder('shipped')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
    });
  });

  it('does NOT render "Cancel Order" button for a delivered order', async () => {
    setupMocks([buildOrder('delivered')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
    });
  });

  it('does NOT render "Cancel Order" button for a cancelled order', async () => {
    setupMocks([buildOrder('cancelled')]);
    render(<OrderStatus />);
    await waitFor(() => {
      expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
    });
  });
});

describe('OrderStatus — Cancel Order interaction', () => {
  it('shows SweetAlert2 confirmation dialog before calling the API', async () => {
    setupMocks([buildOrder('pending')]);
    // User dismisses the dialog — confirm returns false
    mockShowConfirmDialog.mockResolvedValue(false);

    render(<OrderStatus />);
    const cancelBtn = await screen.findByText('Cancel Order');

    await userEvent.click(cancelBtn);

    expect(mockShowConfirmDialog).toHaveBeenCalledWith(
      'Cancel Order',
      'Are you sure you want to cancel this order? This cannot be undone.',
      'Yes, Cancel Order',
      'Keep Order',
    );
    // API should NOT be called because user dismissed
    expect(mockPostJSON).not.toHaveBeenCalled();
  });

  it('updates order status to cancelled and removes button when API succeeds', async () => {
    setupMocks([buildOrder('pending', 42)]);
    mockShowConfirmDialog.mockResolvedValue(true);
    mockPostJSON.mockResolvedValue({ success: true, message: 'Order cancelled successfully.' });

    render(<OrderStatus />);
    const cancelBtn = await screen.findByText('Cancel Order');

    await userEvent.click(cancelBtn);

    await waitFor(() => {
      // Button should be gone after cancellation
      expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
    });

    expect(mockPostJSON).toHaveBeenCalledWith('/orders/42/cancel', {});
    expect(toast.success).toHaveBeenCalledWith('Order cancelled successfully.');
  });

  it('shows error toast and does not change order status when API returns an error', async () => {
    setupMocks([buildOrder('pending', 99)]);
    mockShowConfirmDialog.mockResolvedValue(true);
    mockPostJSON.mockRejectedValue(new Error('Server error'));

    render(<OrderStatus />);
    const cancelBtn = await screen.findByText('Cancel Order');

    await userEvent.click(cancelBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server error');
    });

    // Button should still be present — order status unchanged
    expect(screen.getByText('Cancel Order')).toBeInTheDocument();
  });
});
