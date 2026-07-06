<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * Returns latest 50 notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $notifications = Notification::where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            $unreadCount = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            return response()->json([
                'success'       => true,
                'notifications' => $notifications,
                'unread_count'  => $unreadCount,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/notifications/unread-count
     * Returns the number of unread notifications for the authenticated user.
     */
    public function unreadCount(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $count = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            return response()->json([
                'success'      => true,
                'unread_count' => $count,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch unread count',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/notifications/{id}/read
     * Marks a single notification as read. Ownership verified.
     */
    public function markAsRead(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $notification = Notification::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found',
                ], 404);
            }

            $notification->update(['is_read' => true]);

            return response()->json([
                'success'      => true,
                'notification' => $notification,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark as read',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/notifications/mark-all-read
     * Marks every notification for the current user as read.
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $updated = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            return response()->json([
                'success' => true,
                'updated' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark all as read',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/notifications/{id}
     * Removes a single notification (ownership enforced).
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $notification = Notification::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found',
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Notification deleted',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete notification',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
