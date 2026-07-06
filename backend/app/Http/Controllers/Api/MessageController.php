<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    /**
     * Send a message to another user
     */
    public function send(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'receiver_id' => 'required|exists:users,id',
            'message' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Prevent sending messages to self
            if ($user->id == $request->receiver_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot send message to yourself'
                ], 400);
            }

            // Verify receiver exists
            $receiver = User::where('id', $request->receiver_id)
                ->whereIn('role', ['enterprise', 'resort', 'tourist', 'admin'])
                ->first();

            if (!$receiver) {
                return response()->json([
                    'success' => false,
                    'message' => 'Receiver not found'
                ], 404);
            }

            $message = Message::create([
                'sender_id' => $user->id,
                'receiver_id' => $request->receiver_id,
                'message' => $request->message,
                'is_read' => false,
            ]);

            $message->load('sender:id,name,role', 'receiver:id,name,role');

            // Notify receiver about new message
            try {
                $senderName = $user->name ?? 'Someone';
                $preview = mb_strimwidth($request->message, 0, 60, '...');
                Notification::notify(
                    $request->receiver_id,
                    'message_received',
                    'New Message',
                    "{$senderName} sent you a message: {$preview}",
                    ['sender_id' => $user->id, 'message_id' => $message->id],
                    '/messages'
                );
            } catch (\Throwable $e) {
                \Log::warning('Message notification failed', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Message sent',
                'data' => $message
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send message',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get conversation between current user and another user
     */
    public function getConversation(Request $request, $otherUserId)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Get all messages between two users
            $messages = Message::where(function ($query) use ($user, $otherUserId) {
                    $query->where('sender_id', $user->id)
                          ->where('receiver_id', $otherUserId);
                })
                ->orWhere(function ($query) use ($user, $otherUserId) {
                    $query->where('sender_id', $otherUserId)
                          ->where('receiver_id', $user->id);
                })
                ->with('sender:id,name,role', 'receiver:id,name,role')
                ->orderBy('created_at', 'asc')
                ->get();

            // Mark messages as read
            Message::where('sender_id', $otherUserId)
                ->where('receiver_id', $user->id)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            // Get other user info
            $otherUser = User::where('id', $otherUserId)
                ->select('id', 'name', 'role', 'email', 'phone')
                ->first();

            return response()->json([
                'success' => true,
                'messages' => $messages,
                'other_user' => $otherUser,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch conversation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all conversations for the current user (inbox)
     */
    public function getInbox(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Get all unique conversation partners
            $sentToIds = Message::where('sender_id', $user->id)
                ->pluck('receiver_id');
            $receivedFromIds = Message::where('receiver_id', $user->id)
                ->pluck('sender_id');

            $partnerIds = $sentToIds->merge($receivedFromIds)->unique()->values();

            // Get conversations with last message and unread count
            $conversations = [];
            foreach ($partnerIds as $partnerId) {
                $partner = User::where('id', $partnerId)
                    ->select('id', 'name', 'role', 'email')
                    ->first();

                if (!$partner) continue;

                $lastMessage = Message::where(function ($query) use ($user, $partnerId) {
                        $query->where('sender_id', $user->id)
                              ->where('receiver_id', $partnerId);
                    })
                    ->orWhere(function ($query) use ($user, $partnerId) {
                        $query->where('sender_id', $partnerId)
                              ->where('receiver_id', $user->id);
                    })
                    ->orderBy('created_at', 'desc')
                    ->first();

                $unreadCount = Message::where('sender_id', $partnerId)
                    ->where('receiver_id', $user->id)
                    ->where('is_read', false)
                    ->count();

                $conversations[] = [
                    'partner' => $partner,
                    'last_message' => $lastMessage,
                    'unread_count' => $unreadCount,
                ];
            }

            // Sort by last message time
            usort($conversations, function ($a, $b) {
                $aTime = $a['last_message'] ? strtotime($a['last_message']->created_at) : 0;
                $bTime = $b['last_message'] ? strtotime($b['last_message']->created_at) : 0;
                return $bTime - $aTime;
            });

            return response()->json([
                'success' => true,
                'conversations' => $conversations,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch inbox',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unread message count for current user
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $count = Message::where('receiver_id', $user->id)
                ->where('is_read', false)
                ->count();

            return response()->json([
                'success' => true,
                'unread_count' => $count,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch unread count',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
