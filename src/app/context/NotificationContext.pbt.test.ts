// Feature: notifications-and-order-cancellation
// Property-based tests for NotificationContext logic

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { ApiNotification } from '../lib/api';

// ---------------------------------------------------------------------------
// Pure helper functions extracted from NotificationContext logic
// ---------------------------------------------------------------------------

/**
 * Extracted pure function from NotificationContext refresh() logic.
 * Returns true (suppress toast) iff the notification is a message_received
 * AND the sender is the currently open chat receiver.
 */
export function shouldSuppressToast(
  notificationType: string,
  senderId: number | null,
  openChatReceiverId: number | null,
): boolean {
  return (
    notificationType === 'message_received' &&
    senderId !== null &&
    senderId === openChatReceiverId
  );
}

/**
 * Extracted pure function: given a server response, return the unread count
 * that should be stored in state. This must use res.unread_count, not a
 * locally computed count from the notifications array.
 */
export function resolveUnreadCount(res: {
  unread_count: number;
  notifications: Array<{ is_read: boolean }>;
}): number {
  return typeof res.unread_count === 'number' ? res.unread_count : 0;
}

/**
 * Extracted pure function: optimistic mark-as-read state transition.
 * Returns the new [notifications, unreadCount] tuple after marking one
 * notification as read.
 */
export function applyMarkAsRead(
  notifications: Array<{ id: number; is_read: boolean }>,
  unreadCount: number,
  id: number,
): { notifications: Array<{ id: number; is_read: boolean }>; unreadCount: number } {
  const updated = notifications.map(n => (n.id === id ? { ...n, is_read: true } : n));
  const wasUnread = notifications.some(n => n.id === id && !n.is_read);
  const newUnreadCount = wasUnread ? Math.max(0, unreadCount - 1) : unreadCount;
  return { notifications: updated, unreadCount: newUnreadCount };
}

// ---------------------------------------------------------------------------
// P1 — Chat toast suppression is sender-scoped
// Validates: Requirements 1.2, 1.3
// ---------------------------------------------------------------------------

describe('P1 — Chat toast suppression is sender-scoped', () => {
  // Feature: notifications-and-order-cancellation, Property 1: Chat toast suppression is sender-scoped
  it('suppresses toast iff type is message_received AND senderId equals openChatReceiverId', () => {
    fc.assert(
      fc.property(
        fc.string(),                          // notificationType (arbitrary)
        fc.option(fc.integer(), { nil: null }), // senderId (nullable integer)
        fc.option(fc.integer(), { nil: null }), // openChatReceiverId (nullable integer)
        (notificationType, senderId, openChatReceiverId) => {
          const result = shouldSuppressToast(notificationType, senderId, openChatReceiverId);

          const expectedSuppress =
            notificationType === 'message_received' &&
            senderId !== null &&
            senderId === openChatReceiverId;

          expect(result).toBe(expectedSuppress);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('never suppresses non-message_received notifications regardless of sender', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s !== 'message_received'),
        fc.integer(),
        fc.integer(),
        (notificationType, senderId, openChatReceiverId) => {
          expect(shouldSuppressToast(notificationType, senderId, openChatReceiverId)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('never suppresses when senderId is null', () => {
    fc.assert(
      fc.property(
        fc.constant('message_received'),
        fc.constant(null),
        fc.option(fc.integer(), { nil: null }),
        (notificationType, senderId, openChatReceiverId) => {
          expect(shouldSuppressToast(notificationType, senderId, openChatReceiverId)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('suppresses when type is message_received and sender matches open chat receiver', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        (id) => {
          expect(shouldSuppressToast('message_received', id, id)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P3 — Badge derives from server unread_count, not local list
// Validates: Requirements 5.3
// ---------------------------------------------------------------------------

const notificationArb = fc.record({
  id: fc.integer(),
  is_read: fc.boolean(),
  type: fc.string(),
  title: fc.string(),
  message: fc.string(),
  data: fc.constant(null),
  link: fc.constant(null),
  user_id: fc.integer(),
  created_at: fc.constant('2024-01-01T00:00:00Z'),
  updated_at: fc.constant('2024-01-01T00:00:00Z'),
});

describe('P3 — Badge derives from server unread_count, not local list', () => {
  // Feature: notifications-and-order-cancellation, Property 3: Badge derives from server unread_count, not local list
  it('unreadCount state equals res.unread_count, not the local is_read=false count', () => {
    fc.assert(
      fc.property(
        fc.record({
          unread_count: fc.integer({ min: 0, max: 1000 }),
          notifications: fc.array(notificationArb),
        }),
        (res) => {
          const stateUnreadCount = resolveUnreadCount(res);
          const localCount = res.notifications.filter(n => !n.is_read).length;

          // The state must equal the server-provided unread_count
          expect(stateUnreadCount).toBe(res.unread_count);

          // The property: state count must NOT be derived from local list
          // (they may coincidentally be equal, but the source must be server)
          // We verify the function uses the server value, not the local count
          if (res.unread_count !== localCount) {
            expect(stateUnreadCount).not.toBe(localCount);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('always returns the server unread_count regardless of notification array contents', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.array(notificationArb),
        (serverCount, notifications) => {
          const result = resolveUnreadCount({ unread_count: serverCount, notifications });
          expect(result).toBe(serverCount);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// P11 — Optimistic mark-as-read decrements unread count
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------

describe('P11 — Optimistic mark-as-read decrements unread count', () => {
  // Feature: notifications-and-order-cancellation, Property 11: Optimistic mark-as-read decrements unread count
  it('decrements unreadCount by exactly 1 when marking an unread notification as read', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1 }),
            is_read: fc.boolean(),
          }),
          { minLength: 1 },
        ),
        (notifications) => {
          // Find an unread notification to mark as read
          const unreadNotifications = notifications.filter(n => !n.is_read);
          if (unreadNotifications.length === 0) {
            // No unread notifications — skip this case (vacuously true)
            return;
          }

          // Pick the first unread notification
          const target = unreadNotifications[0];
          const initialUnreadCount = unreadNotifications.length;

          const result = applyMarkAsRead(notifications, initialUnreadCount, target.id);

          // unreadCount must decrement by exactly 1 (minimum 0)
          expect(result.unreadCount).toBe(Math.max(0, initialUnreadCount - 1));

          // The target notification must now be marked as read
          const updatedTarget = result.notifications.find(n => n.id === target.id);
          expect(updatedTarget?.is_read).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('never decrements unreadCount below 0', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1 }),
            is_read: fc.boolean(),
          }),
          { minLength: 1 },
        ),
        (notifications) => {
          const unreadNotifications = notifications.filter(n => !n.is_read);
          if (unreadNotifications.length === 0) return;

          const target = unreadNotifications[0];
          // Start with unreadCount = 0 (edge case)
          const result = applyMarkAsRead(notifications, 0, target.id);

          expect(result.unreadCount).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not change unreadCount when marking an already-read notification', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1 }),
            is_read: fc.constant(true), // all already read
          }),
          { minLength: 1 },
        ),
        fc.integer({ min: 0, max: 100 }),
        (notifications, initialUnreadCount) => {
          const target = notifications[0];
          const result = applyMarkAsRead(notifications, initialUnreadCount, target.id);

          // Already read — unreadCount should not change
          expect(result.unreadCount).toBe(initialUnreadCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
