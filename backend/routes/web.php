<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return response()->json(['status' => 'ok', 'app' => 'DiscoverMansalay API']);
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    $file = file_get_contents($fullPath);
    $type = mime_content_type($fullPath) ?: 'image/jpeg';
    return response($file, 200)->header('Content-Type', $type);
})->where('path', '.*');
