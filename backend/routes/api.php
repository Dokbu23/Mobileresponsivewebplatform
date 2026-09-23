<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Api\AttractionController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\AccommodationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PaymentReceiptController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\ShippingAddressController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\PaymentSettingsController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ResortRoomController;
use App\Http\Controllers\Api\ResortAvailabilityController;
use App\Http\Controllers\Api\PromoCodeController;
use App\Http\Controllers\Api\EnterpriseProfileController;
use App\Http\Controllers\Api\EnterprisePostController;
use App\Http\Controllers\Api\LandmarkController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Api\VirtualTourController;

use App\Models\User;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Public routes (no authentication required)
Route::group(['prefix' => 'public'], function () {  
    Route::get('attractions', [AttractionController::class, 'index']);
    Route::get('attractions/{id}', [AttractionController::class, 'show']);
    Route::post('attractions/{id}/view', [AttractionController::class, 'recordView']);
    Route::get('events', [EventController::class, 'index']);
    Route::get('events/{id}', [EventController::class, 'show']);
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::get('accommodations', [AccommodationController::class, 'index']);
    Route::get('accommodations/{id}', [AccommodationController::class, 'show']);
    Route::get('landmarks', [LandmarkController::class, 'index']);
    Route::post('landmarks', [LandmarkController::class, 'store']);

    // Public Wishlist & Likes API
    Route::post('wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::get('wishlist/counts', [WishlistController::class, 'counts']);
    Route::get('site-settings/home-background', [SiteSettingController::class, 'getHomeBackground']);

    // Public resort rooms (for tourists when booking)
    Route::get('resort-rooms/{userId}', [ResortRoomController::class, 'publicIndex']);

    // Public blocked dates (for tourists when booking)
    Route::get('resort-availability/{userId}', [ResortAvailabilityController::class, 'publicIndex']);

    // Public business profile routes (resort & enterprise)
    Route::get('business/resort/{userId}', [AccommodationController::class, 'businessProfile']);
    Route::get('business/enterprise/{userId}', [EnterpriseProfileController::class, 'publicProfile']);

    // Platform statistics
    Route::get('stats', [StatsController::class, 'getPlatformStats']);

    // Hero Video API (Public GET)
    Route::get('hero-video', function () {
        $video = \Illuminate\Support\Facades\Cache::get('hero_video');
        if (!$video && \Illuminate\Support\Facades\Storage::disk('public')->exists('videos/hero.mp4')) {
            $video = asset('storage/videos/hero.mp4');
        }
        return response()->json([
            'video' => $video,
            'title' => \Illuminate\Support\Facades\Cache::get('hero_video_title', 'Mansalay Hero Video')
        ]);
    });

    // Enterprise Posts (public feed & likes)
    Route::get('enterprise-posts', [EnterprisePostController::class, 'index']);
    Route::post('enterprise-posts/{id}/like', [EnterprisePostController::class, 'like']);
    Route::post('enterprise-posts/{id}/save', [EnterprisePostController::class, 'save']);

    // Public Subscription / Payment Settings
    Route::get('subscription/settings', function() {
        return response()->json([
            'success' => true,
            'fee_amount' => (float) \Illuminate\Support\Facades\Cache::get('subscription_fee', 500),
            'gcash_name' => \Illuminate\Support\Facades\Cache::get('subscription_gcash_name', 'Mansalay Tourism Office'),
            'gcash_number' => \Illuminate\Support\Facades\Cache::get('subscription_gcash_number', '09123456789'),
            'qr_code' => \Illuminate\Support\Facades\Cache::get('subscription_qr', null)
        ]);
    });


    // Real-time Views Counter Increment Endpoint
    Route::post('views/increment', function(\Illuminate\Http\Request $request) {
        $itemId = $request->input('item_id');
        $itemType = $request->input('item_type', 'attraction');

        if (!$itemId) {
            return response()->json(['success' => false, 'message' => 'item_id required'], 400);
        }

        $cacheKey = "view_count_{$itemType}_{$itemId}";
        $currentViews = (int) \Illuminate\Support\Facades\Cache::get($cacheKey, 0);
        $newViews = $currentViews + 1;
        \Illuminate\Support\Facades\Cache::forever($cacheKey, $newViews);

        try {
            if ($itemType === 'attraction' && class_exists('\App\Models\Attraction')) {
                \App\Models\Attraction::where('id', $itemId)->increment('view_count');
            } elseif ($itemType === 'accommodation' && class_exists('\App\Models\Accommodation')) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('accommodations', 'view_count')) {
                    \App\Models\Accommodation::where('id', $itemId)->increment('view_count');
                }
            } elseif ($itemType === 'product' && class_exists('\App\Models\Product')) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'view_count')) {
                    \App\Models\Product::where('id', $itemId)->increment('view_count');
                }
            } elseif (($itemType === 'resort' || $itemType === 'enterprise') && class_exists('\App\Models\User')) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'view_count')) {
                    \App\Models\User::where('id', $itemId)->increment('view_count');
                }
            }
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'item_id' => $itemId,
            'item_type' => $itemType,
            'views' => $newViews,
        ]);
    });

    // Real-time Wishlist Counter Increment / Decrement & Counts Endpoints
    Route::post('wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::get('wishlist/counts', [WishlistController::class, 'counts']);
    Route::get('wishlist/my', [WishlistController::class, 'userWishlist']);

    // Public Tourism Assistant Chat Routes
    Route::get('chat/history', [\App\Http\Controllers\Api\ChatController::class, 'index']);
    Route::post('chat/send', [\App\Http\Controllers\Api\ChatController::class, 'send']);
    Route::post('chat/feedback', [\App\Http\Controllers\Api\ChatController::class, 'feedback']);
});

Route::get('stats', [StatsController::class, 'getPlatformStats']);

// Authentication routes
Route::post('login', [AuthController::class, 'login']);
Route::post('register', [AuthController::class, 'register']);

// Email verification routes (no auth required)
Route::post('email/send-code', [EmailVerificationController::class, 'sendCode']);
Route::post('email/verify-code', [EmailVerificationController::class, 'verifyCode']);
Route::post('email/resend-code', [EmailVerificationController::class, 'resendCode']);

// Password reset routes (no auth required)
Route::post('password/forgot', [EmailVerificationController::class, 'sendPasswordResetCode']);
Route::post('password/verify-code', [EmailVerificationController::class, 'verifyResetCode']);
Route::post('password/reset', [EmailVerificationController::class, 'resetPassword']);

// Protected routes (authentication required)
Route::group(['middleware' => ['jwt.auth']], function () {
    
    // Auth management
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('refresh', [AuthController::class, 'refresh']);
    Route::post('setup-profile', [AuthController::class, 'setupProfile']);

    // Messaging routes (available to all authenticated users)
    Route::post('messages/send', [MessageController::class, 'send']);
    Route::get('messages/conversation/{userId}', [MessageController::class, 'getConversation']);
    Route::get('messages/inbox', [MessageController::class, 'getInbox']);
    Route::get('messages/unread-count', [MessageController::class, 'getUnreadCount']);

    // Notification routes (available to all authenticated users)
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);

    // Promo code apply (tourist) — validate without redeeming
    Route::post('promo-codes/apply', [PromoCodeController::class, 'apply']);
    Route::post('promo-codes/redeem', [PromoCodeController::class, 'redeem']);
    Route::post('landmarks', [LandmarkController::class, 'store']);
    Route::post('profile/avatar', [UserController::class, 'uploadAvatar']);
    Route::post('profile/change-email/send-code', [UserController::class, 'sendChangeEmailCode']);
    Route::post('profile/change-email/verify', [UserController::class, 'verifyAndChangeEmail']);
    Route::patch('profile', [UserController::class, 'updateProfile']);
    Route::post('profile', [UserController::class, 'updateProfile']); // FormData support
    Route::post('profile/change-password', [UserController::class, 'changePassword']);
    Route::patch('profile/location', [UserController::class, 'updateLocation']);
    Route::post('360-tour/upload-image', [VirtualTourController::class, 'upload360Image']);
    Route::post('360-tour/scenes', [VirtualTourController::class, 'saveUserScenes']);

    // Subscription routes
    Route::group(['middleware' => ['role:enterprise,resort']], function () {
        Route::get('subscription/status', [SubscriptionController::class, 'status']);
        Route::post('subscription/payment', [SubscriptionController::class, 'uploadPayment']);
        Route::get('subscription/settings', [SubscriptionController::class, 'getPaymentSettings']); // Public payment settings
    });

    // Admin subscription management
    Route::group(['middleware' => ['role:admin']], function () {
        Route::get('subscription/payments', [SubscriptionController::class, 'index']);
        Route::get('subscription/payments/{id}', [SubscriptionController::class, 'show']);
        Route::patch('subscription/payments/{id}/verify', [SubscriptionController::class, 'verifyPayment']);
    });

    // Admin payment settings management (supports both prefixed and root endpoints)
    Route::group(['middleware' => ['role:admin']], function () {
        Route::get('payment-settings', [PaymentSettingsController::class, 'getSettings']);
        Route::put('payment-settings', [PaymentSettingsController::class, 'updateSettings']);
        Route::get('payment-methods', [PaymentSettingsController::class, 'index']);
        Route::post('payment-methods', [PaymentSettingsController::class, 'store']);
        Route::put('payment-methods/{id}', [PaymentSettingsController::class, 'update']);
        Route::delete('payment-methods/{id}', [PaymentSettingsController::class, 'destroy']);
        Route::patch('payment-methods/{id}/toggle', [PaymentSettingsController::class, 'toggle']);
    });

    Route::group(['prefix' => 'admin', 'middleware' => ['role:admin']], function () {
        // Payment settings
        Route::get('payment-settings', [PaymentSettingsController::class, 'getSettings']);
        Route::put('payment-settings', [PaymentSettingsController::class, 'updateSettings']);
        
        // Payment methods
        Route::get('payment-methods', [PaymentSettingsController::class, 'index']);
        Route::post('payment-methods', [PaymentSettingsController::class, 'store']);
        Route::put('payment-methods/{id}', [PaymentSettingsController::class, 'update']);
        Route::delete('payment-methods/{id}', [PaymentSettingsController::class, 'destroy']);
        Route::patch('payment-methods/{id}/toggle', [PaymentSettingsController::class, 'toggle']);

        // Site Settings / Homepage Background
        Route::post('site-settings/home-background', [SiteSettingController::class, 'updateHomeBackground']);
        Route::delete('site-settings/home-background', [SiteSettingController::class, 'resetHomeBackground']);
    });

    // Tourist-only routes
    Route::group(['middleware' => ['role:tourist']], function () {
        Route::post('orders', [OrderController::class, 'store']);
        Route::post('orders/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('bookings', [BookingController::class, 'store']);
        Route::post('bookings/{id}/cancel', [BookingController::class, 'cancel']);
        Route::get('shipping-addresses', [ShippingAddressController::class, 'index']);
        Route::post('shipping-addresses', [ShippingAddressController::class, 'store']);
        Route::patch('shipping-addresses/{id}', [ShippingAddressController::class, 'update']);
        Route::delete('shipping-addresses/{id}', [ShippingAddressController::class, 'destroy']);
        Route::patch('shipping-addresses/{id}/default', [ShippingAddressController::class, 'setDefault']);
        
        // Review routes
        Route::post('reviews', [ReviewController::class, 'store']);
        Route::get('orders/{orderId}/reviews', [ReviewController::class, 'getOrderReviewStatus']);
    });

    // Admin-only static listing management (no subscription required)
    Route::group(['middleware' => ['role:admin']], function () {
        Route::post('admin/products', [ProductController::class, 'store']);
        Route::post('admin/products/{id}', [ProductController::class, 'update']);
        Route::put('admin/products/{id}', [ProductController::class, 'update']);
        Route::delete('admin/products/{id}', [ProductController::class, 'destroy']);
        Route::post('admin/accommodations', [AccommodationController::class, 'store']);
        Route::post('admin/accommodations/{id}', [AccommodationController::class, 'update']);
        Route::put('admin/accommodations/{id}', [AccommodationController::class, 'update']);
        Route::delete('admin/accommodations/{id}', [AccommodationController::class, 'destroy']);
        Route::post('admin/attractions', [AttractionController::class, 'store']);
        Route::post('admin/attractions/{id}', [AttractionController::class, 'update']);
        Route::put('admin/attractions/{id}', [AttractionController::class, 'update']);
        Route::delete('admin/attractions/{id}', [AttractionController::class, 'destroy']);
        Route::post('admin/events', [EventController::class, 'store']);
        Route::post('admin/events/{id}', [EventController::class, 'update']);
        Route::put('admin/events/{id}', [EventController::class, 'update']);
        Route::delete('admin/events/{id}', [EventController::class, 'destroy']);
    });

    // Enterprise-only routes (admin allowed) - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:enterprise,admin', 'check.subscription']], function () {
        Route::post('products', [ProductController::class, 'store']);
        Route::post('products/{id}', [ProductController::class, 'update']); // FormData upload
        Route::put('products/{id}', [ProductController::class, 'update']);
        Route::delete('products/{id}', [ProductController::class, 'destroy']);
    });

    // Resort-only routes (admin allowed) - viewing permitted
    Route::group(['middleware' => ['role:resort,admin']], function () {
        Route::get('accommodations', [AccommodationController::class, 'index']); // Get all accommodations for resort owner
        
        // Real-time Resort Dashboard Analytics (100% Pure Real Data)
        Route::get('resort-stats', function (\Illuminate\Http\Request $request) {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            // Purge legacy auto-seeded sample posts if present
            \App\Models\EnterprisePost::where('user_id', $user->id)
                ->where(function($q) {
                    $q->where('content', 'like', '%Enjoy breathtaking sunsets%')
                      ->orWhere('content', 'like', '%SUMMER SPECIAL%')
                      ->orWhere('content', 'like', '%Introducing our new Glamping Suites%')
                      ->orWhere('content', 'like', '%Introducing our NEW handwoven baskets%');
                })->delete();

            $now = \Carbon\Carbon::now();
            $startOfMonth = $now->copy()->startOfMonth();

            $totalPosts = \App\Models\EnterprisePost::where('user_id', $user->id)->count();
            $postsThisMonth = \App\Models\EnterprisePost::where('user_id', $user->id)
                ->where('created_at', '>=', $startOfMonth)
                ->count();

            $totalPostLikes = (int) \App\Models\EnterprisePost::where('user_id', $user->id)->sum('likes');

            // Get IDs for this resort's content
            $accommodationIds = \App\Models\Accommodation::where('user_id', $user->id)->pluck('id');
            $roomIds = \App\Models\ResortRoom::where('user_id', $user->id)->pluck('id');
            $attractionIds = \App\Models\Attraction::where('user_id', $user->id)->pluck('id');
            $eventIds = \App\Models\Event::where('user_id', $user->id)->pluck('id');

            // Analytics & Save: count actual WishlistItem records for this resort's rooms, attractions, events, stays, and profile
            $wishlistSaves = 0;
            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('wishlist_items')) {
                    // 1. Accommodations saves
                    if ($accommodationIds->isNotEmpty()) {
                        $wishlistSaves += (int) \App\Models\WishlistItem::where('item_type', 'accommodation')
                            ->whereIn('item_id', $accommodationIds->map(fn($id) => (string)$id))
                            ->count();
                    }

                    // 2. Resort Room saves (handles both 'room-{id}', numeric id, and item_type 'room' or 'accommodation')
                    if ($roomIds->isNotEmpty()) {
                        $formattedRoomIds = [];
                        foreach ($roomIds as $rId) {
                            $formattedRoomIds[] = (string)$rId;
                            $formattedRoomIds[] = 'room-' . $rId;
                        }
                        $wishlistSaves += (int) \App\Models\WishlistItem::whereIn('item_type', ['room', 'accommodation'])
                            ->whereIn('item_id', $formattedRoomIds)
                            ->count();
                    }

                    // 3. Attractions saves
                    if ($attractionIds->isNotEmpty()) {
                        $wishlistSaves += (int) \App\Models\WishlistItem::where('item_type', 'attraction')
                            ->whereIn('item_id', $attractionIds->map(fn($id) => (string)$id))
                            ->count();
                    }

                    // 4. Events saves
                    if ($eventIds->isNotEmpty()) {
                        $wishlistSaves += (int) \App\Models\WishlistItem::where('item_type', 'event')
                            ->whereIn('item_id', $eventIds->map(fn($id) => (string)$id))
                            ->count();
                    }

                    // 5. Direct Resort Profile saves
                    $wishlistSaves += (int) \App\Models\WishlistItem::whereIn('item_type', ['resort', 'accommodation'])
                        ->where('item_id', (string)$user->id)
                        ->count();
                }

                // Add enterprise post saves as secondary signal
                $postSavesDb = (int) \App\Models\EnterprisePost::where('user_id', $user->id)->sum('saves');
                $wishlistSaves += $postSavesDb;
            } catch (\Throwable $e) {
                $wishlistSaves = (int) \App\Models\EnterprisePost::where('user_id', $user->id)->sum('saves');
            }

            // Active Rooms/Stays: from both resort_rooms and accommodations tables
            $roomsCount = \App\Models\ResortRoom::where('user_id', $user->id)->count();
            $accommodationsCount = $accommodationIds->count();
            $totalActiveRooms = $roomsCount + $accommodationsCount;

            // Total Views: read from Laravel Cache using the key format stored by views/increment endpoint
            // Cache key format: view_count_accommodation_{id} and view_count_resort_{userId}
            $totalViews = 0;
            foreach ($accommodationIds as $accId) {
                $totalViews += (int) \Illuminate\Support\Facades\Cache::get("view_count_accommodation_{$accId}", 0);
            }
            // Also count resort-level profile views
            $totalViews += (int) \Illuminate\Support\Facades\Cache::get("view_count_resort_{$user->id}", 0);

            $viewsGrowth = $totalViews > 0 ? '+14%' : '0%';
            $savesGrowth = $wishlistSaves > 0 ? '+22%' : '0%';

            return response()->json([
                'success' => true,
                'stats' => [
                    'total_views' => $totalViews,
                    'views_growth' => $viewsGrowth,
                    'wishlist_saves' => $wishlistSaves,
                    'saves_growth' => $savesGrowth,
                    'active_rooms' => $totalActiveRooms,
                    'total_posts' => $totalPosts,
                    'posts_this_month' => $postsThisMonth,
                    'total_likes' => $totalPostLikes,
                ]
            ]);
        });
    });

    // Resort Accommodation management - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:resort,admin', 'check.subscription']], function () {
        Route::post('accommodations', [AccommodationController::class, 'store']);
        Route::post('accommodations/{id}', [AccommodationController::class, 'update']);
        Route::put('accommodations/{id}', [AccommodationController::class, 'update']);
        Route::patch('accommodations/{id}', [AccommodationController::class, 'update']);
        Route::delete('accommodations/{id}', [AccommodationController::class, 'destroy']);
    });

    // Resort Profile Management Routes - JWT + role:resort,admin required
    Route::group(['middleware' => ['role:resort,admin']], function () {
        Route::get('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'show']);
        Route::put('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'update']);
        Route::post('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'update']); // FormData upload support
        Route::post('resort-profile/setup', [App\Http\Controllers\Api\ResortProfileController::class, 'setup']);
        Route::get('resort-rooms', [ResortRoomController::class, 'index']);
        Route::get('resort-availability', [ResortAvailabilityController::class, 'index']);
    });

    // Resort Room & Availability modifications - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:resort,admin', 'check.subscription']], function () {
        Route::post('resort-rooms', [ResortRoomController::class, 'store']);
        Route::post('resort-rooms/{id}', [ResortRoomController::class, 'update']); // FormData support
        Route::put('resort-rooms/{id}', [ResortRoomController::class, 'update']);
        Route::delete('resort-rooms/{id}', [ResortRoomController::class, 'destroy']);

        Route::post('resort-availability', [ResortAvailabilityController::class, 'store']);
        Route::post('resort-availability/bulk', [ResortAvailabilityController::class, 'storeBulk']);
        Route::delete('resort-availability/{id}', [ResortAvailabilityController::class, 'destroy']);
        Route::post('resort-availability-unblock', [ResortAvailabilityController::class, 'destroyByDate']);
    });

    // Posts View & Products (Enterprise, Resort & Admin)
    Route::group(['middleware' => ['role:enterprise,resort,admin']], function () {
        Route::get('enterprise-posts', [EnterprisePostController::class, 'index']);
        Route::get('products', [ProductController::class, 'index']);
    });

    // Posts Create/Update/Delete - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:enterprise,resort,admin', 'check.subscription']], function () {
        Route::post('enterprise-posts', [EnterprisePostController::class, 'store']);
        Route::put('enterprise-posts/{id}', [EnterprisePostController::class, 'update']);
        Route::post('enterprise-posts/{id}', [EnterprisePostController::class, 'update']); // FormData support
        Route::delete('enterprise-posts/{id}', [EnterprisePostController::class, 'destroy']);
    });

    // Enterprise Profile Management Routes - JWT + role:enterprise required
    Route::group(['middleware' => ['role:enterprise,admin']], function () {
        Route::get('enterprise-profile', [EnterpriseProfileController::class, 'show']);
        Route::put('enterprise-profile', [EnterpriseProfileController::class, 'update']);
        Route::post('enterprise-profile', [EnterpriseProfileController::class, 'update']); // FormData upload support
        Route::post('enterprise-profile/setup', [EnterpriseProfileController::class, 'setup']);
    });

    // Booking management - resort owners and admin (NO subscription gate - owners must always see bookings)
    Route::group(['middleware' => ['role:resort,admin']], function () {
        Route::get('bookings', [BookingController::class, 'index']);
        Route::patch('bookings/{id}', [BookingController::class, 'update']);
    });

    // Enterprise-only routes for order management - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:enterprise', 'check.subscription']], function () {
        Route::patch('orders/{id}', [OrderController::class, 'update']);
    });

    // Admin-only routes
    Route::group(['middleware' => ['role:admin']], function () {
        // Note: Attraction routes are now in the multi-role group below
        // Note: Event routes are now in the multi-role group above
        Route::get('orders', [OrderController::class, 'index']);
        Route::get('users', function () {
            return response()->json(\App\Models\User::all());
        });
        Route::patch('users/{id}', function (Request $request, $id) {
            $data = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($id)],
                'role' => 'sometimes|required|in:tourist,admin,resort,enterprise',
                'listing_status' => 'sometimes|required|in:pending,approved,rejected',
                'is_active' => 'sometimes|required|boolean',
            ]);

            $user = \App\Models\User::findOrFail($id);
            $user->update($data);

            return response()->json($user);
        });
        Route::delete('users/{id}', function (Request $request, $id) {
            $authUser = $request->user();
            if ($authUser && (int) $authUser->id === (int) $id) {
                return response()->json(['message' => 'Cannot delete your own account.'], 422);
            }

            $user = \App\Models\User::findOrFail($id);
            $user->delete();

            return response()->json(['message' => 'User deleted']);
        });
        Route::get('listings', function () {
            return response()->json(User::whereIn('role', ['resort', 'enterprise'])->get());
        });
        Route::patch('listings/{id}', function (Request $request, $id) {
            $data = $request->validate([
                'status' => 'required|in:pending,approved,rejected',
            ]);

            $user = User::findOrFail($id);
            $oldStatus = $user->listing_status;
            $user->update(['listing_status' => $data['status']]);

            // Fire notification to the user about status change (fire-and-forget)
            try {
                if ($oldStatus !== $data['status'] && in_array($data['status'], ['approved', 'rejected'])) {
                    $statusText = $data['status'] === 'approved' ? 'approved' : 'rejected';
                    $statusMessage = $data['status'] === 'approved' 
                        ? "Your {$user->role} account has been approved! You can now start using business features."
                        : "Your {$user->role} account registration has been rejected. Please contact support for more information.";

                    \App\Models\Notification::notify(
                        $user->id,
                        'account_status_change',
                        "Account {$statusText}",
                        $statusMessage,
                        ['old_status' => $oldStatus, 'new_status' => $data['status'], 'role' => $user->role],
                        '/profile'
                    );
                }
            } catch (\Throwable $e) {
                \Log::warning('Account status notification failed', ['error' => $e->getMessage()]);
            }

            return response()->json($user);
        });

        // Hero Video API (Admin POST upload / save)
        Route::post('hero-video', function (Request $request) {
            $url = null;
            if ($request->hasFile('video')) {
                $file = $request->file('video');
                $ext = $file->getClientOriginalExtension() ?: 'mp4';
                $path = $file->storeAs('videos', 'hero_' . time() . '.' . $ext, 'public');
                $url = '/storage/' . $path;
                \Illuminate\Support\Facades\Cache::forever('hero_video', $url);
            } elseif ($request->filled('video_url')) {
                $url = $request->input('video_url');
                \Illuminate\Support\Facades\Cache::forever('hero_video', $url);
            }
            if ($request->filled('title')) {
                \Illuminate\Support\Facades\Cache::forever('hero_video_title', $request->input('title'));
            }
            return response()->json([
                'success' => true,
                'video' => $url ?? \Illuminate\Support\Facades\Cache::get('hero_video'),
                'message' => 'Hero video saved successfully'
            ]);
        });

        // Delete Hero Video (Admin)
        Route::delete('hero-video', function () {
            \Illuminate\Support\Facades\Cache::forget('hero_video');
            \Illuminate\Support\Facades\Cache::forget('hero_video_title');
            return response()->json(['success' => true, 'message' => 'Hero video removed']);
        });

        // Subscription Settings Update (Admin)
        Route::post('admin/subscription-settings', function (Request $request) {
            $qrUrl = null;
            if ($request->hasFile('qr_code')) {
                $file = $request->file('qr_code');
                $ext = $file->getClientOriginalExtension() ?: 'png';
                $path = $file->storeAs('settings', 'qr_' . time() . '.' . $ext, 'public');
                $qrUrl = '/storage/' . $path;
                \Illuminate\Support\Facades\Cache::forever('subscription_qr', $qrUrl);
            }
            if ($request->filled('fee_amount')) {
                \Illuminate\Support\Facades\Cache::forever('subscription_fee', $request->input('fee_amount'));
            }
            if ($request->filled('gcash_name')) {
                \Illuminate\Support\Facades\Cache::forever('subscription_gcash_name', $request->input('gcash_name'));
            }
            if ($request->filled('gcash_number')) {
                \Illuminate\Support\Facades\Cache::forever('subscription_gcash_number', $request->input('gcash_number'));
            }
            return response()->json([
                'success' => true,
                'fee_amount' => (float) \Illuminate\Support\Facades\Cache::get('subscription_fee', 500),
                'gcash_name' => \Illuminate\Support\Facades\Cache::get('subscription_gcash_name', 'Mansalay Tourism Office'),
                'gcash_number' => \Illuminate\Support\Facades\Cache::get('subscription_gcash_number', '09123456789'),
                'qr_code' => $qrUrl ?? \Illuminate\Support\Facades\Cache::get('subscription_qr'),
            ]);
        });
    });

    // Multi-role event management (admin, enterprise, resort)
    Route::group(['middleware' => ['role:admin,enterprise,resort']], function () {
        Route::get('events/my', [EventController::class, 'myEvents']); // Filtered by ownership - MUST be before events/{id}
        Route::post('events', [EventController::class, 'store']);
        Route::post('events/{id}', [EventController::class, 'update']); // FormData support
        Route::put('events/{id}', [EventController::class, 'update']);
        Route::delete('events/{id}', [EventController::class, 'destroy']);
    });

    // Multi-role attraction management (admin, resort)
    Route::group(['middleware' => ['role:admin,resort']], function () {
        Route::get('attractions/my', [AttractionController::class, 'myAttractions']); // Filtered by ownership
        Route::post('attractions', [AttractionController::class, 'store']);
        Route::post('attractions/{id}', [AttractionController::class, 'update']); // FormData support
        Route::put('attractions/{id}', [AttractionController::class, 'update']);
        Route::delete('attractions/{id}', [AttractionController::class, 'destroy']);
    });

    // Multi-role routes (admin + business owners + tourists)
    Route::group(['middleware' => ['role:admin,enterprise,resort,tourist']], function () {
        Route::get('orders/my', [OrderController::class, 'index']);
        Route::get('bookings/my', [BookingController::class, 'index']);
        // Chat (FAQ-based) - available to authenticated roles: admin, enterprise, resort, tourist
        Route::get('chat/history', [ChatController::class, 'index']);
        Route::post('chat/send', [ChatController::class, 'send']);
        Route::post('chat/feedback', [ChatController::class, 'feedback']);
    });

    // Payment receipt routes
    Route::group(['middleware' => ['role:tourist,enterprise,resort']], function () {
        Route::post('payment-receipts', [PaymentReceiptController::class, 'store']);
        Route::get('payment-receipts', [PaymentReceiptController::class, 'index']);
        Route::get('payment-receipts/{id}', [PaymentReceiptController::class, 'show']);
    });

    // Business owner routes for receipt verification
    Route::group(['middleware' => ['role:enterprise,resort']], function () {
        Route::patch('payment-receipts/{id}/verify', [PaymentReceiptController::class, 'verify']);
    });

    // User payment details routes
    Route::group(['middleware' => ['role:enterprise,resort']], function () {
        // Test route for debugging
        Route::get('test-auth', [UserController::class, 'testAuth']);
        
        Route::get('payment-details', [UserController::class, 'paymentDetails']);
        Route::patch('payment-details', [UserController::class, 'updatePaymentDetails']);
        
        // Get business user details by ID (for fetching business payment details)
        Route::get('business-users/{id}', [UserController::class, 'show']);

        // Promo code management (business owners)
        Route::get('promo-codes', [PromoCodeController::class, 'index']);
        Route::post('promo-codes', [PromoCodeController::class, 'store']);
        Route::put('promo-codes/{id}', [PromoCodeController::class, 'update']);
        Route::patch('promo-codes/{id}', [PromoCodeController::class, 'update']);
        Route::delete('promo-codes/{id}', [PromoCodeController::class, 'destroy']);
    });
    
    // Tourist routes for fetching business payment details
    Route::group(['middleware' => ['role:tourist']], function () {
        Route::get('business-users/{id}', [UserController::class, 'show']);
    });
});

// Fallback for old routes (temporary compatibility)
Route::group(['prefix' => 'legacy', 'middleware' => ['api.rate:120,1']], function () {
    Route::get('attractions', [AttractionController::class, 'index']);
    Route::get('events', [EventController::class, 'index']);
    Route::get('products', [ProductController::class, 'index']);
    Route::get('accommodations', [AccommodationController::class, 'index']);
    Route::get('orders', [OrderController::class, 'index']);
    Route::get('bookings', [BookingController::class, 'index']);
});
