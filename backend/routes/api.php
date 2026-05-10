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
    Route::get('events', [EventController::class, 'index']);
    Route::get('events/{id}', [EventController::class, 'show']);
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::get('accommodations', [AccommodationController::class, 'index']);
    Route::get('accommodations/{id}', [AccommodationController::class, 'show']);


    // Public business profile pages (for registered businesses)
    // Tourists can view dedicated pages of registered resort/enterprise owners
    Route::get('business/resort/{userId}', [AccommodationController::class, 'businessProfile']);
    Route::get('business/enterprise/{userId}', [ProductController::class, 'businessProfile']);
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
        Route::post('bookings', [BookingController::class, 'store']);
        Route::get('shipping-addresses', [ShippingAddressController::class, 'index']);
        Route::post('shipping-addresses', [ShippingAddressController::class, 'store']);
        Route::patch('shipping-addresses/{id}', [ShippingAddressController::class, 'update']);
        Route::delete('shipping-addresses/{id}', [ShippingAddressController::class, 'destroy']);
        Route::patch('shipping-addresses/{id}/default', [ShippingAddressController::class, 'setDefault']);
    });

    // Enterprise-only routes (admin allowed) - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:enterprise,admin', 'check.subscription']], function () {
        Route::post('products', [ProductController::class, 'store']);
        Route::post('products/{id}', [ProductController::class, 'update']); // FormData upload
        Route::put('products/{id}', [ProductController::class, 'update']);
        Route::delete('products/{id}', [ProductController::class, 'destroy']);
    });

    // Resort-only routes (admin allowed) - view/delete access without subscription
    Route::group(['middleware' => ['role:resort,admin']], function () {
        Route::get('accommodations', [AccommodationController::class, 'index']); // Get all accommodations for resort owner
        Route::delete('accommodations/{id}', [AccommodationController::class, 'destroy']);
    });

    // Resort Profile Management Routes - JWT + role:resort required
    Route::group(['middleware' => ['role:resort']], function () {
        Route::get('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'show']);
        Route::put('resort-profile', [App\Http\Controllers\Api\ResortProfileController::class, 'update']);
        Route::post('resort-profile/setup', [App\Http\Controllers\Api\ResortProfileController::class, 'setup']);
    });

    // Resort-only routes (admin allowed) - PROTECTED BY SUBSCRIPTION
    Route::group(['middleware' => ['role:resort,admin', 'check.subscription']], function () {
        Route::post('accommodations', [AccommodationController::class, 'store']);
        Route::post('accommodations/{id}', [AccommodationController::class, 'update']); // FormData upload
        Route::put('accommodations/{id}', [AccommodationController::class, 'update']);
        Route::patch('accommodations/{id}', [AccommodationController::class, 'update']);
        Route::get('bookings', [BookingController::class, 'index']); // Get all bookings for resort owner
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
        Route::get('bookings', [BookingController::class, 'index']);
        Route::patch('bookings/{id}', [BookingController::class, 'update']);
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
            $user->update(['listing_status' => $data['status']]);

            return response()->json($user);
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
