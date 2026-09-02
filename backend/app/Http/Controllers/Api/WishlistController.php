<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WishlistItem;
use App\Models\Product;
use App\Models\Attraction;
use App\Models\Accommodation;
use App\Models\Event;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * Toggle item in wishlist (save / unsave / like).
     */
    public function toggle(Request $request)
    {
        $request->validate([
            'item_id'   => 'required',
            'item_type' => 'required|string',
            'action'    => 'nullable|string|in:save,unsave,toggle',
        ]);

        $itemId   = (string)$request->input('item_id');
        $itemType = strtolower((string)$request->input('item_type'));
        $action   = $request->input('action', 'save');
        $user     = $request->user();

        // Determine Model
        $model = null;
        switch ($itemType) {
            case 'product':
                $model = Product::find($itemId);
                break;
            case 'attraction':
                $model = Attraction::find($itemId);
                break;
            case 'accommodation':
            case 'resort':
                $model = Accommodation::find($itemId);
                break;
            case 'event':
                $model = Event::find($itemId);
                break;
        }

        // If action is toggle, determine current state
        if ($action === 'toggle') {
            if ($user) {
                $exists = WishlistItem::where('user_id', $user->id)
                    ->where('item_id', $itemId)
                    ->where('item_type', $itemType)
                    ->exists();
                $action = $exists ? 'unsave' : 'save';
            } else {
                $action = 'save';
            }
        }

        if ($action === 'save') {
            if ($user) {
                WishlistItem::firstOrCreate([
                    'user_id'   => $user->id,
                    'item_id'   => $itemId,
                    'item_type' => $itemType,
                ]);
            }

            if ($model) {
                $model->increment('likes');
            }
            $finalCount = $model ? (int)$model->likes : max(1, WishlistItem::where('item_id', $itemId)->where('item_type', $itemType)->count());
        } else {
            // Unsave / remove from wishlist
            if ($user) {
                WishlistItem::where('user_id', $user->id)
                    ->where('item_id', $itemId)
                    ->where('item_type', $itemType)
                    ->delete();
            }

            if ($model && $model->likes > 0) {
                $model->decrement('likes');
            }
            $finalCount = $model ? (int)$model->likes : WishlistItem::where('item_id', $itemId)->where('item_type', $itemType)->count();
        }

        \Illuminate\Support\Facades\Cache::forever("wishlist_saves_{$itemType}_{$itemId}", $finalCount);

        return response()->json([
            'success'     => true,
            'item_id'     => $itemId,
            'item_type'   => $itemType,
            'action'      => $action,
            'likes'       => $finalCount,
            'total_saves' => $finalCount,
        ]);
    }

    /**
     * Get all wishlist counts map.
     */
    public function counts()
    {
        $counts = [];

        // Products
        $products = Product::select('id', 'likes')->get();
        foreach ($products as $p) {
            $counts["product_{$p->id}"] = (int)($p->likes ?? 0);
        }

        // Attractions
        $attractions = Attraction::select('id', 'likes')->get();
        foreach ($attractions as $a) {
            $counts["attraction_{$a->id}"] = (int)($a->likes ?? 0);
        }

        // Accommodations
        $accommodations = Accommodation::select('id', 'likes')->get();
        foreach ($accommodations as $acc) {
            $counts["accommodation_{$acc->id}"] = (int)($acc->likes ?? 0);
        }

        // Events
        $events = Event::select('id', 'likes')->get();
        foreach ($events as $e) {
            $counts["event_{$e->id}"] = (int)($e->likes ?? 0);
        }

        // Merge with WishlistItem direct counts if higher
        $wishlistGrouped = WishlistItem::selectRaw('item_type, item_id, count(*) as total')
            ->groupBy('item_type', 'item_id')
            ->get();

        foreach ($wishlistGrouped as $w) {
            $key = "{$w->item_type}_{$w->item_id}";
            $counts[$key] = max((int)($counts[$key] ?? 0), (int)$w->total);
        }

        return response()->json([
            'success' => true,
            'counts'  => $counts,
        ]);
    }

    /**
     * Get user's personal wishlist items.
     */
    public function userWishlist(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([]);
        }

        $items = WishlistItem::where('user_id', $user->id)->get();
        return response()->json($items);
    }
}
