<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

use App\Http\Controllers\Api\AttractionController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\AccommodationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\BookingController;

Route::apiResource('attractions', AttractionController::class)->only(['index','show']);
Route::apiResource('events', EventController::class)->only(['index','show']);
Route::apiResource('products', ProductController::class)->only(['index','show']);
Route::apiResource('accommodations', AccommodationController::class)->only(['index','show']);

Route::post('orders', [OrderController::class, 'store']);
Route::get('orders', [OrderController::class, 'index']);

Route::post('bookings', [BookingController::class, 'store']);
Route::get('bookings', [BookingController::class, 'index']);
