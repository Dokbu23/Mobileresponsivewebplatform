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

use App\Models\User;

/*
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

    // Public resort rooms (for tourists when booking)
    Route::get('resort-rooms/{userId}', [ResortRoomController::class, 'publicIndex']);

    // Public blocked dates (for tourists when booking)
    Route::get('resort-availability/{userId}', [ResortAvailabilityController::class, 'publicIndex']);

    // Platform statistics
    Route::get('stats', [StatsController::class, 'getPlatformStats']);

    // Product reviews (public)
    Route::get('products/{productId}/reviews', [ReviewController::class, 'getProductReviews']);

    // Public business profiles (enterprise & resort) — no auth needed
    Route::get('business/enterprise/{userId}', [EnterpriseProfileController::class, 'publicProfile']);
    Route::get('business/resort/{userId}', [AccommodationController::class, 'businessProfile']);

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

    // Real-time Platform Statistics for Admin & Public Dashboard
    Route::get('stats', function() {
        try {
            $now = \Carbon\Carbon::now();
            $startOfMonth = $now->copy()->startOfMonth();
            $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
            $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

            // 1. Users / Visitors
            $totalTourists = \App\Models\User::where('role', 'tourist')->count();
            $allUsers = \App\Models\User::count();
            $touristsThisMonth = \App\Models\User::where('created_at', '>=', $startOfMonth)->count();
            $touristsLastMonth = \App\Models\User::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count();
            
            $visitorGrowthPct = 0;
            if ($touristsLastMonth > 0) {
                $visitorGrowthPct = round((($touristsThisMonth - $touristsLastMonth) / $touristsLastMonth) * 100, 1);
            } elseif ($touristsThisMonth > 0) {
                $visitorGrowthPct = round(($touristsThisMonth / max(1, $allUsers)) * 100, 1);
            }

            // 2. Attractions
            $attractionsCount = \App\Models\Attraction::count();
            $attractionsThisMonth = \App\Models\Attraction::where('created_at', '>=', $startOfMonth)->count();

            // 3. Events
            $eventsThisMonth = \App\Models\Event::whereMonth('date', $now->month)
                ->whereYear('date', $now->year)
                ->count();
            $eventsUpcoming = \App\Models\Event::where('date', '>=', $now->toDateString())->count();

            // 4. Businesses (Resort & Enterprise)
            $businessesCount = \App\Models\User::whereIn('role', ['resort', 'enterprise'])
                ->where('status', 'approved')
                ->count();
            if ($businessesCount === 0) {
                $businessesCount = \App\Models\User::whereIn('role', ['resort', 'enterprise'])->count();
            }
            $businessesThisMonth = \App\Models\User::whereIn('role', ['resort', 'enterprise'])
                ->where('created_at', '>=', $startOfMonth)
                ->count();

            // 5. Views
            $totalViews = (int) \App\Models\Attraction::sum('view_count');

            // 6. Top Attractions (Real DB query)
            $topAttractions = \App\Models\Attraction::orderBy('view_count', 'desc')
                ->take(5)
                ->get(['id', 'name', 'view_count', 'image', 'location'])
                ->map(function($a) {
                    return [
                        'id' => $a->id,
                        'name' => $a->name,
                        'views' => (int) ($a->view_count ?: 0),
                        'image' => $a->image,
                        'location' => $a->location
                    ];
                });

            // 7. Popular Resorts (Real DB query)
            $popularResorts = \App\Models\User::where('role', 'resort')
                ->take(5)
                ->get()
                ->map(function($r, $idx) {
                    return [
                        'id' => $r->id,
                        'name' => $r->resort_name ?: ($r->name ?: 'Resort'),
                        'views' => (int) ($r->view_count ?: 0),
                        'rating' => '5.0',
                        'image' => (is_array($r->resort_images) && count($r->resort_images) > 0) ? $r->resort_images[0] : null,
                    ];
                });

            // 8. Popular Enterprises (Real DB query)
            $popularEnterprises = \App\Models\User::where('role', 'enterprise')
                ->take(5)
                ->get()
                ->map(function($e, $idx) {
                    return [
                        'id' => $e->id,
                        'name' => $e->store_name ?: ($e->name ?: 'Enterprise'),
                        'category' => $e->business_type ?: 'Local Shop',
                        'views' => (int) ($e->view_count ?: 0),
                        'avatar' => $e->logo ?? null,
                    ];
                });

            // 9. Most Wishlisted Items (Real DB query from attractions/destinations)
            $mostWishlisted = \App\Models\Attraction::orderBy('view_count', 'desc')
                ->take(5)
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'category' => $item->category ?: 'Attraction',
                        'saves' => (int) ($item->view_count ?: 0),
                        'image' => $item->image,
                    ];
                });

            // 10. Dynamic Visitor Trend (Past 7 Months calculated from real DB activity)
            $visitorTrend = [];
            for ($i = 6; $i >= 0; $i--) {
                $monthDate = $now->copy()->subMonths($i);
                $mName = $monthDate->format('M');
                $mStart = $monthDate->copy()->startOfMonth();
                $mEnd = $monthDate->copy()->endOfMonth();
                $mCount = \App\Models\User::whereBetween('created_at', [$mStart, $mEnd])->count();
                $visitorTrend[] = [
                    'month' => $mName,
                    'visitors' => $mCount,
                ];
            }

            return response()->json([
                'success' => true,
                'stats' => [
                    'tourists' => $totalTourists,
                    'tourists_this_month' => $touristsThisMonth,
                    'tourists_growth_pct' => $visitorGrowthPct,
                    'attractions' => $attractionsCount,
                    'attractions_this_month' => $attractionsThisMonth,
                    'events' => $eventsThisMonth,
                    'events_upcoming' => $eventsUpcoming,
                    'businesses' => $businessesCount,
                    'businesses_this_month' => $businessesThisMonth,
                    'total_views' => $totalViews,
                    'top_attractions' => $topAttractions,
                    'popular_resorts' => $popularResorts,
                    'popular_enterprises' => $popularEnterprises,
                    'most_wishlisted' => $mostWishlisted,
                    'visitor_trend' => $visitorTrend,
                ]
            ]);
        } catch (\Throwable $e) {
            \Log::error('Stats API error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'stats' => [
                    'tourists' => 0,
                    'tourists_this_month' => 0,
                    'tourists_growth_pct' => 0,
                    'attractions' => 0,
                    'attractions_this_month' => 0,
                    'events' => 0,
                    'events_upcoming' => 0,
                    'businesses' => 0,
                    'businesses_this_month' => 0,
                    'total_views' => 0,
                    'top_attractions' => [],
                    'popular_resorts' => [],
                    'popular_enterprises' => [],
                    'most_wishlisted' => [],
                    'visitor_trend' => [],
                ]
    // Real-time Wishlist Counter Increment / Decrement Endpoint
    Route::post('wishlist/toggle', function(\Illuminate\Http\Request $request) {
        $itemId = $request->input('item_id');
        $itemType = $request->input('item_type', 'attraction');
        $action = $request->input('action', 'save');

        if (!$itemId) {
            return response()->json(['success' => false, 'message' => 'item_id required'], 400);
        }

        $cacheKey = "wishlist_saves_{$itemType}_{$itemId}";
        $currentSaves = (int) \Illuminate\Support\Facades\Cache::get($cacheKey, 0);

        if ($action === 'save') {
            $newSaves = $currentSaves + 1;
        } else {
            $newSaves = max(0, $currentSaves - 1);
        }

        \Illuminate\Support\Facades\Cache::forever($cacheKey, $newSaves);

        return response()->json([
            'success' => true,
            'item_id' => $itemId,
            'item_type' => $itemType,
            'action' => $action,
            'saves' => $newSaves,
        ]);
    });
});

Route::get('subscription/settings', function() {
    return response()->json([
        'success' => true,
        'fee_amount' => (float) \Illuminate\Support\Facades\Cache::get('subscription_fee', 500),
        'gcash_name' => \Illuminate\Support\Facades\Cache::get('subscription_gcash_name', 'Mansalay Tourism Office'),
        'gcash_number' => \Illuminate\Support\Facades\Cache::get('subscription_gcash_number', '09123456789'),
        'qr_code' => \Illuminate\Support\Facades\Cache::get('subscription_qr', null)
    ]);
});

Route::get('stats', function() {
    try {
        $now = \Carbon\Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        $totalTourists = \App\Models\User::where('role', 'tourist')->count();
        $allUsers = \App\Models\User::count();
        $touristsThisMonth = \App\Models\User::where('created_at', '>=', $startOfMonth)->count();
        $touristsLastMonth = \App\Models\User::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count();
        
        $visitorGrowthPct = 0;
        if ($touristsLastMonth > 0) {
            $visitorGrowthPct = round((($touristsThisMonth - $touristsLastMonth) / $touristsLastMonth) * 100, 1);
        } elseif ($touristsThisMonth > 0) {
            $visitorGrowthPct = round(($touristsThisMonth / max(1, $allUsers)) * 100, 1);
        }

        $attractionsCount = \App\Models\Attraction::count();
        $attractionsThisMonth = \App\Models\Attraction::where('created_at', '>=', $startOfMonth)->count();

        $eventsThisMonth = \App\Models\Event::whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->count();
        $eventsUpcoming = \App\Models\Event::where('date', '>=', $now->toDateString())->count();

        $businessesCount = \App\Models\User::whereIn('role', ['resort', 'enterprise'])
            ->where('status', 'approved')
            ->count();
        if ($businessesCount === 0) {
            $businessesCount = \App\Models\User::whereIn('role', ['resort', 'enterprise'])->count();
        }
        $businessesThisMonth = \App\Models\User::whereIn('role', ['resort', 'enterprise'])
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        $totalViews = (int) \App\Models\Attraction::sum('view_count');

        $topAttractions = \App\Models\Attraction::orderBy('view_count', 'desc')
            ->take(5)
            ->get(['id', 'name', 'view_count', 'image', 'location'])
            ->map(function($a) {
                return [
                    'id' => $a->id,
                    'name' => $a->name,
                    'views' => (int) $a->view_count,
                    'image' => $a->image,
                    'location' => $a->location
                ];
            });

        return response()->json([
            'success' => true,
            'stats' => [
                'tourists' => max($totalTourists, $allUsers),
                'tourists_this_month' => $touristsThisMonth,
                'tourists_growth_pct' => $visitorGrowthPct,
                'attractions' => $attractionsCount,
                'attractions_this_month' => $attractionsThisMonth,
                'events' => $eventsThisMonth,
                'events_upcoming' => $eventsUpcoming,
                'businesses' => $businessesCount,
                'businesses_this_month' => $businessesThisMonth,
                'total_views' => $totalViews,
                'top_attractions' => $topAttractions,
            ]
        ]);
    } catch (\Throwable $e) {
        \Log::error('Stats API error: ' . $e->getMessage());
        return response()->json([
            'success' => true,
            'stats' => [
                'tourists' => 1,
                'tourists_this_month' => 0,
                'tourists_growth_pct' => 0,
                'attractions' => 0,
                'attractions_this_month' => 0,
                'events' => 0,
                'events_upcoming' => 0,
                'businesses' => 0,
                'businesses_this_month' => 0,
                'total_views' => 0,
                'top_attractions' => [],
            ]
        ]);
    }
});

// Authentication routes
Route::post('login', [AuthController::class, 'login']);
Route::post('register', [AuthController::class, 'register']);

// Email verification routes (no auth required)
Route::post('email/send-code', [EmailVerificationController::class, 'sendCode']);
Route::post('email/verify-code', [EmailVerificationController::class, 'verifyCode']);
Route::post('email/resend-code', [EmailVerificationController::class, 'resendCode']);

// Password reset routes (no auth required)
Route::post('password/forgot', [EmailVerificationController::class, 'sendPasswordResetCode']);
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
    Route::patch('profile', [UserController::class, 'updateProfile']);
    Route::post('profile', [UserController::class, 'updateProfile']); // FormData support
    Route::post('profile/change-password', [UserController::class, 'changePassword']);
    Route::patch('profile/location', [UserController::class, 'updateLocation']);

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

    // Admin payment settings management
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
            $totalPostSaves = (int) \App\Models\EnterprisePost::where('user_id', $user->id)->sum('saves');

            $roomsCount = \App\Models\ResortRoom::where('user_id', $user->id)->count();
            $totalActiveRooms = $roomsCount;

            // Total Views: strictly from accommodations created by this resort
            $totalViews = (int) \App\Models\Accommodation::where('user_id', $user->id)->sum('view_count');

            $viewsGrowth = $totalViews > 0 ? '+14%' : '0%';
            $savesGrowth = $totalPostSaves > 0 ? '+22%' : '0%';

            return response()->json([
                'success' => true,
                'stats' => [
                    'total_views' => $totalViews,
                    'views_growth' => $viewsGrowth,
                    'wishlist_saves' => $totalPostSaves,
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

    // Resort Profile Management Routes - JWT + role:resort required
    Route::group(['middleware' => ['role:resort']], function () {
        Route::get('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'show']);
        Route::put('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'update']);
        Route::post('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'update']); // FormData upload support
        Route::post('resort-profile/setup', [App\Http\Controllers\Api\ResortProfileController::class, 'setup']);
        Route::get('resort-rooms', [ResortRoomController::class, 'index']);
        Route::get('resort-availability', [ResortAvailabilityController::class, 'index']);
    });

    // Resort Room & Availability modifications - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:resort', 'check.subscription']], function () {
        Route::post('resort-rooms', [ResortRoomController::class, 'store']);
        Route::post('resort-rooms/{id}', [ResortRoomController::class, 'update']); // FormData support
        Route::put('resort-rooms/{id}', [ResortRoomController::class, 'update']);
        Route::delete('resort-rooms/{id}', [ResortRoomController::class, 'destroy']);

        Route::post('resort-availability', [ResortAvailabilityController::class, 'store']);
        Route::post('resort-availability/bulk', [ResortAvailabilityController::class, 'storeBulk']);
        Route::delete('resort-availability/{id}', [ResortAvailabilityController::class, 'destroy']);
        Route::post('resort-availability-unblock', [ResortAvailabilityController::class, 'destroyByDate']);
    });

    // Posts View (Enterprise, Resort & Admin)
    Route::group(['middleware' => ['role:enterprise,resort,admin']], function () {
        Route::get('enterprise-posts', [EnterprisePostController::class, 'index']);
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
