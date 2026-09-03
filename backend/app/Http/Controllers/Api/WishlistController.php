<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WishlistItem;
use App\Models\Product;
use App\Models\Attraction;
use App\Models\Accommodation;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class WishlistController extends Controller
{
    /**
     * Ensure database schema / migrations are up to date.
     */
    protected static function ensureSchema()
    {
        static $checked = false;
        if ($checked) {
            return;
        }
        $checked = true;

        try {
            $needsMigration = !Schema::hasTable('wishlist_items') 
                || !Schema::hasColumn('products', 'likes')
                || !Schema::hasColumn('accommodations', 'likes')
                || !Schema::hasColumn('attractions', 'likes')
                || !Schema::hasColumn('events', 'likes');

            if ($needsMigration) {
                Artisan::call('migrate', ['--force' => true]);
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist schema auto-migration failed or skipped: ' . $e->getMessage());
        }
    }

    /**
     * Toggle item in wishlist (save / unsave / like).
     */
    public function toggle(Request $request)
    {
        self::ensureSchema();

        $request->validate([
            'item_id'   => 'required',
            'item_type' => 'required|string',
            'action'    => 'nullable|string|in:save,unsave,toggle',
        ]);

        $itemId   = (string)$request->input('item_id');
        $itemType = strtolower((string)$request->input('item_type'));
        $action   = $request->input('action', 'save');
        $user     = null;

        try {
            $user = $request->user();
        } catch (\Throwable $e) {
            $user = null;
        }

        // Determine Model
        $model = null;
        try {
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
        } catch (\Throwable $e) {
            Log::warning("Could not find model for wishlist {$itemType} {$itemId}: " . $e->getMessage());
        }

        $hasWishlistTable = false;
        try {
            $hasWishlistTable = Schema::hasTable('wishlist_items');
        } catch (\Throwable $e) {
            $hasWishlistTable = false;
        }

        // If action is toggle, determine current state
        if ($action === 'toggle') {
            if ($user && $hasWishlistTable) {
                try {
                    $exists = WishlistItem::where('user_id', $user->id)
                        ->where('item_id', $itemId)
                        ->where('item_type', $itemType)
                        ->exists();
                    $action = $exists ? 'unsave' : 'save';
                } catch (\Throwable $e) {
                    $action = 'save';
                }
            } else {
                $action = 'save';
            }
        }

        $finalCount = 0;

        if ($action === 'save') {
            if ($user && $hasWishlistTable) {
                try {
                    WishlistItem::firstOrCreate([
                        'user_id'   => $user->id,
                        'item_id'   => $itemId,
                        'item_type' => $itemType,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('WishlistItem create error: ' . $e->getMessage());
                }
            }

            if ($model) {
                try {
                    $tableName = $model->getTable();
                    if (Schema::hasColumn($tableName, 'likes')) {
                        $model->increment('likes');
                        $finalCount = (int)$model->likes;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Model increment likes error: ' . $e->getMessage());
                }
            }

            if ($finalCount === 0 && $hasWishlistTable) {
                try {
                    $finalCount = max(1, WishlistItem::where('item_id', $itemId)->where('item_type', $itemType)->count());
                } catch (\Throwable $e) {}
            }

            if ($finalCount === 0) {
                $finalCount = 1;
            }
        } else {
            // Unsave / remove from wishlist
            if ($user && $hasWishlistTable) {
                try {
                    WishlistItem::where('user_id', $user->id)
                        ->where('item_id', $itemId)
                        ->where('item_type', $itemType)
                        ->delete();
                } catch (\Throwable $e) {
                    Log::warning('WishlistItem delete error: ' . $e->getMessage());
                }
            }

            if ($model) {
                try {
                    $tableName = $model->getTable();
                    if (Schema::hasColumn($tableName, 'likes') && $model->likes > 0) {
                        $model->decrement('likes');
                        $finalCount = (int)$model->likes;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Model decrement likes error: ' . $e->getMessage());
                }
            }

            if ($finalCount === 0 && $hasWishlistTable) {
                try {
                    $finalCount = WishlistItem::where('item_id', $itemId)->where('item_type', $itemType)->count();
                } catch (\Throwable $e) {}
            }
        }

        try {
            Cache::forever("wishlist_saves_{$itemType}_{$itemId}", $finalCount);
        } catch (\Throwable $e) {}

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
        self::ensureSchema();

        $counts = [];

        // Products
        try {
            if (Schema::hasTable('products')) {
                $hasLikes = Schema::hasColumn('products', 'likes');
                $products = $hasLikes 
                    ? Product::select('id', 'likes')->get() 
                    : Product::select('id')->get();

                foreach ($products as $p) {
                    $counts["product_{$p->id}"] = (int)($p->likes ?? 0);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist counts products error: ' . $e->getMessage());
        }

        // Attractions
        try {
            if (Schema::hasTable('attractions')) {
                $hasLikes = Schema::hasColumn('attractions', 'likes');
                $attractions = $hasLikes 
                    ? Attraction::select('id', 'likes')->get() 
                    : Attraction::select('id')->get();

                foreach ($attractions as $a) {
                    $counts["attraction_{$a->id}"] = (int)($a->likes ?? 0);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist counts attractions error: ' . $e->getMessage());
        }

        // Accommodations
        try {
            if (Schema::hasTable('accommodations')) {
                $hasLikes = Schema::hasColumn('accommodations', 'likes');
                $accommodations = $hasLikes 
                    ? Accommodation::select('id', 'likes')->get() 
                    : Accommodation::select('id')->get();

                foreach ($accommodations as $acc) {
                    $counts["accommodation_{$acc->id}"] = (int)($acc->likes ?? 0);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist counts accommodations error: ' . $e->getMessage());
        }

        // Events
        try {
            if (Schema::hasTable('events')) {
                $hasLikes = Schema::hasColumn('events', 'likes');
                $events = $hasLikes 
                    ? Event::select('id', 'likes')->get() 
                    : Event::select('id')->get();

                foreach ($events as $e) {
                    $counts["event_{$e->id}"] = (int)($e->likes ?? 0);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist counts events error: ' . $e->getMessage());
        }

        // Merge with WishlistItem direct counts if table exists
        try {
            if (Schema::hasTable('wishlist_items')) {
                $wishlistGrouped = WishlistItem::selectRaw('item_type, item_id, count(*) as total')
                    ->groupBy('item_type', 'item_id')
                    ->get();

                foreach ($wishlistGrouped as $w) {
                    $key = "{$w->item_type}_{$w->item_id}";
                    $counts[$key] = max((int)($counts[$key] ?? 0), (int)$w->total);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist counts wishlist_items error: ' . $e->getMessage());
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
        self::ensureSchema();

        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([]);
            }

            if (!Schema::hasTable('wishlist_items')) {
                return response()->json([]);
            }

            $items = WishlistItem::where('user_id', $user->id)->get();
            return response()->json($items);
        } catch (\Throwable $e) {
            Log::warning('userWishlist error: ' . $e->getMessage());
            return response()->json([]);
        }
    }
}
