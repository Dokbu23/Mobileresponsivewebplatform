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
});

// Authentication routes
Route::post('login', [AuthController::class, 'login']);

// Protected routes (authentication required)
Route::group(['middleware' => ['jwt.auth']], function () {
    
    // Auth management
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('refresh', [AuthController::class, 'refresh']);

    // Tourist-only routes
    Route::group(['middleware' => ['role:tourist']], function () {
        Route::post('orders', [OrderController::class, 'store']);
        Route::post('bookings', [BookingController::class, 'store']);
    });

    // Enterprise-only routes (admin allowed)
    Route::group(['middleware' => ['role:enterprise,admin']], function () {
        Route::post('products', [ProductController::class, 'store']);
        Route::post('products/{id}', [ProductController::class, 'update']); // FormData upload
        Route::put('products/{id}', [ProductController::class, 'update']);
        Route::delete('products/{id}', [ProductController::class, 'destroy']);
    });

    // Resort-only routes (admin allowed)
    Route::group(['middleware' => ['role:resort,admin']], function () {
        Route::post('accommodations', [AccommodationController::class, 'store']);
        Route::put('accommodations/{id}', [AccommodationController::class, 'update']);
        Route::delete('accommodations/{id}', [AccommodationController::class, 'destroy']);
        Route::patch('bookings/{id}', [BookingController::class, 'update']);
    });

    // Admin-only routes
    Route::group(['middleware' => ['role:admin']], function () {
        Route::post('attractions', [AttractionController::class, 'store']);
        Route::put('attractions/{id}', [AttractionController::class, 'update']);
        Route::delete('attractions/{id}', [AttractionController::class, 'destroy']);
        Route::post('events', [EventController::class, 'store']);
        Route::put('events/{id}', [EventController::class, 'update']);
        Route::delete('events/{id}', [EventController::class, 'destroy']);
        Route::get('orders', [OrderController::class, 'index']);
        Route::patch('orders/{id}', [OrderController::class, 'update']);
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

    // Multi-role routes (admin + business owners)
    Route::group(['middleware' => ['role:admin,enterprise,resort']], function () {
        Route::get('orders/my', [OrderController::class, 'index']);
        Route::get('bookings/my', [BookingController::class, 'index']);
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
