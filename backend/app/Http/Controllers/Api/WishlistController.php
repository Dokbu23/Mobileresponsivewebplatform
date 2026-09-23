<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WishlistItem;
use App\Models\Product;
use App\Models\Attraction;
use App\Models\Accommodation;
use App\Models\Event;
use App\Models\ResortRoom;
use App\Models\EnterprisePost;
use App\Models\User;
use App\Models\Notification;
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

            if (Schema::hasTable('resort_rooms') && !Schema::hasColumn('resort_rooms', 'likes')) {
                Schema::table('resort_rooms', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->unsignedInteger('likes')->default(0);
                });
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

        $rawId    = (string)$request->input('item_id');
        $itemType = strtolower((string)$request->input('item_type'));
        $action   = $request->input('action', 'save');
        $user     = null;

        try {
            $user = $request->user();
            if (!$user && $request->bearerToken()) {
                $user = auth('api')->user();
            }
        } catch (\Throwable $e) {
            $user = null;
        }

        // Clean ID and detect special item categories (e.g. room-12, post_room_5)
        $cleanId = $rawId;
        $isRoomId = false;

        if (\Illuminate\Support\Str::startsWith($rawId, 'room-')) {
            $cleanId = substr($rawId, 5);
            $isRoomId = true;
        } elseif (\Illuminate\Support\Str::startsWith($rawId, 'post_room_')) {
            $cleanId = substr($rawId, 10);
            $isRoomId = true;
        } elseif (\Illuminate\Support\Str::startsWith($rawId, 'acc-')) {
            $cleanId = substr($rawId, 4);
        } elseif (\Illuminate\Support\Str::startsWith($rawId, 'resort-')) {
            $cleanId = substr($rawId, 7);
        }

        $detectedType = $isRoomId ? 'room' : $itemType;

        // Determine Model
        $model = null;
        try {
            if ($isRoomId) {
                $model = ResortRoom::find($cleanId);
                if (!$model) {
                    $model = EnterprisePost::find($cleanId);
                }
                if (!$model) {
                    $model = Accommodation::find($cleanId);
                }
                $detectedType = 'room';
            } elseif ($itemType === 'product') {
                $model = Product::find($cleanId);
                if (!$model) {
                    $model = EnterprisePost::find($cleanId);
                }
                $detectedType = 'product';
            } elseif ($itemType === 'attraction') {
                $model = Attraction::find($cleanId);
                if (!$model) {
                    $model = EnterprisePost::find($cleanId);
                }
                $detectedType = 'attraction';
            } elseif ($itemType === 'event') {
                $model = Event::find($cleanId);
                if (!$model) {
                    $model = EnterprisePost::find($cleanId);
                }
                $detectedType = 'event';
            } elseif ($itemType === 'room') {
                $model = ResortRoom::find($cleanId);
                if (!$model) {
                    $model = Accommodation::find($cleanId);
                }
                if (!$model) {
                    $model = EnterprisePost::find($cleanId);
                }
                $detectedType = 'room';
            } elseif ($itemType === 'accommodation' || $itemType === 'resort') {
                $model = Accommodation::find($cleanId);
                if ($model) {
                    $detectedType = 'accommodation';
                }
                if (!$model) {
                    $model = ResortRoom::find($cleanId);
                    if ($model) {
                        $detectedType = 'room';
                    }
                }
                if (!$model) {
                    $resortUser = User::where('role', 'resort')->find($cleanId);
                    if ($resortUser) {
                        $model = $resortUser;
                        $detectedType = 'resort';
                    }
                }
                if (!$model) {
                    $model = EnterprisePost::find($cleanId);
                    if ($model) {
                        $detectedType = ($model->type === 'rooms' || $model->type === 'room') ? 'room' : 'accommodation';
                    }
                }
            } elseif ($itemType === 'post') {
                $model = EnterprisePost::find($cleanId);
                $detectedType = 'post';
            }
        } catch (\Throwable $e) {
            Log::warning("Could not find model for wishlist {$itemType} {$rawId}: " . $e->getMessage());
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
                        ->where(function($q) use ($rawId, $cleanId) {
                            $q->where('item_id', $rawId)->orWhere('item_id', $cleanId);
                        })
                        ->where(function($q) use ($itemType, $detectedType) {
                            $q->where('item_type', $itemType)->orWhere('item_type', $detectedType);
                        })
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
                        'item_id'   => $rawId,
                        'item_type' => $itemType,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('WishlistItem create error: ' . $e->getMessage());
                }
            }

            if ($model && method_exists($model, 'getTable')) {
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
                    $finalCount = max(1, WishlistItem::where('item_id', $rawId)->where('item_type', $itemType)->count());
                    if ($finalCount <= 1 && $cleanId !== $rawId) {
                        $countClean = WishlistItem::where('item_id', $cleanId)->where('item_type', $itemType)->count();
                        $finalCount = max($finalCount, $countClean);
                    }
                } catch (\Throwable $e) {}
            }

            if ($finalCount === 0) {
                $finalCount = 1;
            }

            // Real-time Notification for Resort and Enterprise Owners
            try {
                $ownerId = null;
                $itemName = 'item';
                $link = null;

                if ($model) {
                    $ownerId = $model->user_id ?? ($model->id ?? null);
                    if ($model instanceof User) {
                        $ownerId = $model->id;
                        $itemName = $model->resort_name ?: ($model->name ?: 'Resort');
                    } else {
                        $itemName = $model->name ?? ($model->product_name ?? ($model->title ?? 'item'));
                    }
                }

                // Resolve owner if null
                if (!$ownerId && $model && !empty($itemName)) {
                    if ($detectedType === 'product') {
                        $ownerId = EnterprisePost::where('title', $itemName)
                            ->orWhere('product_name', $itemName)
                            ->value('user_id');
                        if (!$ownerId) {
                            $ownerId = User::where('role', 'enterprise')->value('id');
                        }
                    } elseif (in_array($detectedType, ['room', 'accommodation', 'resort', 'attraction'])) {
                        $ownerId = User::where('role', 'resort')
                            ->where(function($q) use ($itemName) {
                                $q->where('resort_name', $itemName)
                                  ->orWhere('name', $itemName)
                                  ->orWhere('resort_name', 'LIKE', "%{$itemName}%");
                            })->value('id');
                    }
                }

                // Determine owner details and role
                $ownerUser = $ownerId ? User::find($ownerId) : null;
                $ownerRole = $ownerUser ? $ownerUser->role : null;

                // Format tourist name
                $touristLabel = $user ? ($user->name ?: 'A tourist') : 'A tourist';

                // Determine message, title, and link based on detected item category
                $title = 'New Wishlist Save!';
                if ($detectedType === 'product') {
                    $message = "{$touristLabel} saved your product \"{$itemName}\" to their wishlist!";
                    $link = ($ownerRole === 'enterprise') ? '/enterprise/dashboard' : '/enterprise/profile';
                } elseif ($detectedType === 'room') {
                    $message = "{$touristLabel} saved your room \"{$itemName}\" to their wishlist!";
                    $link = '/resort/dashboard';
                } elseif ($detectedType === 'attraction') {
                    $message = "{$touristLabel} saved your attraction \"{$itemName}\" to their wishlist!";
                    $link = ($ownerRole === 'resort') ? '/resort/dashboard' : '/attractions';
                } elseif ($detectedType === 'event') {
                    $message = "{$touristLabel} saved your event \"{$itemName}\" to their wishlist!";
                    $link = ($ownerRole === 'enterprise') ? '/enterprise/dashboard' : (($ownerRole === 'resort') ? '/resort/dashboard' : '/events');
                } elseif ($detectedType === 'resort') {
                    $message = "{$touristLabel} saved your resort \"{$itemName}\" to their wishlist!";
                    $link = '/resort/dashboard';
                } else {
                    $message = "{$touristLabel} saved your resort stay \"{$itemName}\" to their wishlist!";
                    $link = '/resort/dashboard';
                }

                // Dispatch notification to the specific owner (resort or enterprise)
                if (!empty($ownerId) && (!$user || (int)$ownerId !== (int)$user->id)) {
                    $cacheKey = "notif_wishlist_{$ownerId}_{$detectedType}_{$cleanId}_" . ($user ? $user->id : 'guest');
                    if (!Cache::has($cacheKey)) {
                        Cache::put($cacheKey, true, now()->addSeconds(10));
                        Notification::notify(
                            $ownerId,
                            'wishlist_saved',
                            $title,
                            $message,
                            [
                                'item_id'    => $rawId,
                                'item_type'  => $detectedType,
                                'item_name'  => $itemName,
                                'saves'      => $finalCount,
                                'tourist_id' => $user ? $user->id : null,
                                'tourist'    => $touristLabel,
                            ],
                            $link
                        );
                    }
                } elseif (empty($ownerId)) {
                    // Fallback to notify admin if tourism asset has no direct resort/enterprise owner
                    Notification::notifyAdmins(
                        'wishlist_saved',
                        $title,
                        "{$touristLabel} saved \"{$itemName}\" ({$detectedType}) to their wishlist!",
                        [
                            'item_id'   => $rawId,
                            'item_type' => $detectedType,
                            'item_name' => $itemName,
                            'saves'     => $finalCount,
                        ],
                        '/admin/dashboard'
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch wishlist notification: ' . $e->getMessage());
            }
        } else {
            // Unsave / remove from wishlist
            if ($user && $hasWishlistTable) {
                try {
                    WishlistItem::where('user_id', $user->id)
                        ->where(function($q) use ($rawId, $cleanId) {
                            $q->where('item_id', $rawId)->orWhere('item_id', $cleanId);
                        })
                        ->where(function($q) use ($itemType, $detectedType) {
                            $q->where('item_type', $itemType)->orWhere('item_type', $detectedType);
                        })
                        ->delete();
                } catch (\Throwable $e) {
                    Log::warning('WishlistItem delete error: ' . $e->getMessage());
                }
            }

            if ($model && method_exists($model, 'getTable')) {
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
                    $finalCount = WishlistItem::where(function($q) use ($rawId, $cleanId) {
                            $q->where('item_id', $rawId)->orWhere('item_id', $cleanId);
                        })
                        ->where(function($q) use ($itemType, $detectedType) {
                            $q->where('item_type', $itemType)->orWhere('item_type', $detectedType);
                        })
                        ->count();
                } catch (\Throwable $e) {}
            }
        }

        try {
            Cache::forever("wishlist_saves_{$itemType}_{$rawId}", $finalCount);
            if ($cleanId !== $rawId) {
                Cache::forever("wishlist_saves_{$itemType}_{$cleanId}", $finalCount);
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'success'     => true,
            'item_id'     => $rawId,
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

        // Resort Rooms
        try {
            if (Schema::hasTable('resort_rooms')) {
                $hasLikes = Schema::hasColumn('resort_rooms', 'likes');
                $rooms = $hasLikes
                    ? ResortRoom::select('id', 'likes')->get()
                    : ResortRoom::select('id')->get();

                foreach ($rooms as $r) {
                    $l = (int)($r->likes ?? 0);
                    $counts["accommodation_room-{$r->id}"] = $l;
                    $counts["accommodation_{$r->id}"] = $l;
                    $counts["room_{$r->id}"] = $l;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist counts resort_rooms error: ' . $e->getMessage());
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

                    // Cross-map room and resort prefixes
                    if (\Illuminate\Support\Str::startsWith($w->item_id, 'room-')) {
                        $plain = substr($w->item_id, 5);
                        $counts["accommodation_{$plain}"] = max((int)($counts["accommodation_{$plain}"] ?? 0), (int)$w->total);
                        $counts["room_{$plain}"] = max((int)($counts["room_{$plain}"] ?? 0), (int)$w->total);
                    } elseif (\Illuminate\Support\Str::startsWith($w->item_id, 'resort-')) {
                        $plain = substr($w->item_id, 7);
                        $counts["accommodation_{$plain}"] = max((int)($counts["accommodation_{$plain}"] ?? 0), (int)$w->total);
                        $counts["resort_{$plain}"] = max((int)($counts["resort_{$plain}"] ?? 0), (int)$w->total);
                    } elseif (is_numeric($w->item_id) && ($w->item_type === 'accommodation' || $w->item_type === 'room')) {
                        $counts["accommodation_room-{$w->item_id}"] = max((int)($counts["accommodation_room-{$w->item_id}"] ?? 0), (int)$w->total);
                    }
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
