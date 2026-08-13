// Feature: notifications-and-order-cancellation
// Property-based tests for NotificationBell badge rendering

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

import { NotificationBell } from './NotificationBell';
import { useNotifications } from '../context/NotificationContext';

const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;

function buildMockContext(unreadCount: number) {
  return {
    notifications: [],
    unreadCount,
    loading: false,
    refresh: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    setChatOpen: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// P2 — Unread badge cap at "9+"
// Validates: Requirements 1.5, 1.6
// ---------------------------------------------------------------------------

describe('P2 — Unread badge cap at "9+"', () => {
  // Feature: notifications-and-order-cancellation, Property 2: Unread badge cap at "9+"

  it('badge text is "9+" for any unreadCount > 9', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1000 }),
        (unreadCount) => {
          mockUseNotifications.mockReturnValue(buildMockContext(unreadCount));
          const { unmount } = render(<NotificationBell />);
          const badge = screen.queryByText('9+');
          expect(badge).not.toBeNull();
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge text is the exact count as a string for 1 ≤ unreadCount ≤ 9', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        (unreadCount) => {
          mockUseNotifications.mockReturnValue(buildMockContext(unreadCount));
          const { unmount } = render(<NotificationBell />);
          const badge = screen.queryByText(String(unreadCount));
          expect(badge).not.toBeNull();
          // Also ensure "9+" is NOT shown
          expect(screen.queryByText('9+')).toBeNull();
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge element is absent when unreadCount === 0', () => {
    fc.assert(
      fc.property(
        fc.constant(0),
        (unreadCount) => {
          mockUseNotifications.mockReturnValue(buildMockContext(unreadCount));
          const { unmount } = render(<NotificationBell />);
          // No badge text should be present
          expect(screen.queryByText('0')).toBeNull();
          expect(screen.queryByText('9+')).toBeNull();
          // The bell button should still be present
          expect(screen.getByRole('button', { name: /notifications/i })).toBeTruthy();
          unmount();
        },
      ),
      { numRuns: 10 },
    );
  });

  it('badge is never shown for unreadCount === 0 (exhaustive check)', () => {
    mockUseNotifications.mockReturnValue(buildMockContext(0));
    render(<NotificationBell />);
    const button = screen.getByRole('button', { name: /notifications/i });
    // The badge span is only rendered when unreadCount > 0
    const badgeSpan = button.querySelector('span');
    expect(badgeSpan).toBeNull();
  });
});
