<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class AccommodationController extends Controller
{
    /**
     * Display a listing of accommodations.
     * - Public: all accommodations (both static and registered)
     * - Resort owner: only their own accommodations
     * - Admin: all accommodations
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $query = \App\Models\Accommodation::with('owner:id,name,email,phone,description,listing_status');
            // Public / non-admin: only show accommodations from admin OR approved & paid resort accounts
            if (!$user || $user->role !== 'admin') {
                $query->where(function($q) {
                    $q->whereNull('user_id')
                      ->orWhereHas('owner', function($userQuery) {
                          $userQuery->where('role', 'admin')
                                    ->orWhere(function($bq) {
                                        $bq->where('listing_status', 'approved')
                                           ->whereIn('subscription_status', ['paid', 'active']);
                                    });
                      });
                });
            }

            $search = $request->input('search');

            if ($search !== null && $search !== '') {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            $staticAccommodations = $query->get()->map(function ($item) {
                // Add cached view count for static accommodations (view_count col may not exist)
                $cachedViews = (int) Cache::get("view_count_accommodation_{$item->id}", 0);
                $dbViews = 0;
                try {
                    if (Schema::hasColumn('accommodations', 'view_count')) {
                        $dbViews = (int) ($item->view_count ?? 0);
                    }
                } catch (\Throwable $e) {}
                $item->view_count = max($dbViews, $cachedViews);
                $item->views = $item->view_count;
                $item->type = 'static';
                return $item;
            });

            // Resort rooms query (from registered resort accounts)
            $roomsQuery = \App\Models\ResortRoom::with('owner')
                ->where('is_available', true);

            if ($search !== null && $search !== '') {
                $roomsQuery->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%")
                      ->orWhere('type', 'LIKE', "%{$search}%");
                });
            }

            $allRooms = $roomsQuery->orderBy('created_at', 'desc')->get();
            $handledResortIds = [];
            $roomGroups = [];

            foreach ($allRooms as $room) {
                $owner = $room->owner;
                $ownerImages = $owner && is_array($owner->resort_images) ? $owner->resort_images : [];
                $primaryOwnerImage = count($ownerImages) > 0 ? $ownerImages[0] : '';
                
                $roomImages = $room->images ?? ($room->image ? [$room->image] : ($primaryOwnerImage ? [$primaryOwnerImage] : []));
                if (is_string($roomImages)) {
                    try {
                        $parsed = json_decode($roomImages, true);
                        if (is_array($parsed)) $roomImages = $parsed;
                        else $roomImages = [$roomImages];
                    } catch (\Throwable $e) {
                        $roomImages = [$roomImages];
                    }
                }
                if (!is_array($roomImages)) {
                    $roomImages = [];
                }
                if ($room->image && !in_array($room->image, $roomImages)) {
                    array_unshift($roomImages, $room->image);
                }

                $cleanRoomImages = array_values(array_unique(array_filter($roomImages)));
                $groupKey = $room->user_id . '_' . strtolower(trim($room->name));

                if (isset($roomGroups[$groupKey])) {
                    // Merge images into existing room group to prevent duplicate cards
                    $existing = $roomGroups[$groupKey];
                    $mergedImages = array_values(array_unique(array_filter(array_merge($existing['images'], $cleanRoomImages))));
                    $existing['images'] = $mergedImages;
                    if (empty($existing['image']) && count($mergedImages) > 0) {
                        $existing['image'] = $mergedImages[0];
                    }
                    $roomGroups[$groupKey] = $existing;
                    continue;
                }

                // Read cached views: tries view_count_accommodation_room-{id} key first, then room-level key
                $roomCacheKey = "view_count_accommodation_room-{$room->id}";
                $roomCachedViews = (int) Cache::get($roomCacheKey, 0);
                // Also check owner-level resort views as fallback
                $ownerCachedViews = $owner ? (int) Cache::get("view_count_resort_{$owner->id}", 0) : 0;
                // Count wishlist saves for this room (stored as item_id='room-{id}', item_type='accommodation')
                $roomSaves = 0;
                try {
                    if (Schema::hasTable('wishlist_items')) {
                        $roomSaves = (int) \App\Models\WishlistItem::where('item_id', 'room-' . $room->id)
                            ->where('item_type', 'accommodation')
                            ->count();
                        if ($roomSaves === 0) {
                            $roomSaves = (int) \App\Models\WishlistItem::where('item_id', (string)$room->id)
                                ->where('item_type', 'accommodation')
                                ->count();
                        }
                    }
                } catch (\Throwable $e) {}

                $handledResortIds[] = $room->user_id;

                $roomItem = [
                    'id'               => 'room-' . $room->id,
                    'room_id'          => $room->id,
                    'name'             => $room->name,
                    'resort_name'      => $owner ? ($owner->resort_name ?? $owner->name) : 'Resort Stay',
                    'description'      => $room->description ?: ($owner ? ($owner->resort_description ?? '') : ''),
                    'full_description' => $room->description ?: ($owner ? ($owner->resort_description ?? '') : ''),
                    'price_per_night'  => (float) $room->price_per_night,
                    'price'            => (float) $room->price_per_night,
                    'image'            => $room->image ?: ($primaryOwnerImage ?: (count($cleanRoomImages) > 0 ? $cleanRoomImages[0] : '')),
                    'images'           => count($cleanRoomImages) > 0 ? $cleanRoomImages : ($room->image ? [$room->image] : $ownerImages),
                    'resort_amenities' => $owner ? ($owner->resort_amenities ?? []) : [],
                    'user_id'          => $room->user_id,
                    'is_registered'    => true,
                    'type'             => $room->type ?: 'Resort Room',
                    'category'         => $room->type ?: 'Rooms & Suites',
                    'badge'            => $owner ? ($owner->resort_name ?? 'Resort Stay') : 'Resort Stay',
                    'capacity'         => $room->capacity,
                    'is_room'          => true,
                    'location'         => $owner ? ($owner->barangay ? "{$owner->barangay}, Mansalay, Oriental Mindoro" : ($owner->address ?: 'Mansalay, Oriental Mindoro')) : 'Mansalay, Oriental Mindoro',
                    'barangay'         => $owner ? $owner->barangay : null,
                    'latitude'         => $owner ? $owner->latitude : null,
                    'longitude'        => $owner ? $owner->longitude : null,
                    'phone'            => $owner ? ($owner->phone ?? null) : null,
                    'contact_number'   => $owner ? ($owner->phone ?? null) : null,
                    'facebook'         => $owner ? ($owner->facebook_link ?? null) : null,
                    'instagram'        => $owner ? ($owner->instagram_link ?? null) : null,
                    'website'          => $owner ? ($owner->website ?? null) : null,
                    'virtual_tour_video' => $owner ? ($owner->virtual_tour_video ?? ($owner->video ?? null)) : null,
                    'virtual_tour_scenes' => $room->virtual_tour_scenes ?? ($owner ? ($owner->virtual_tour_scenes ?? []) : []),
                    'view_count'       => max($roomCachedViews, 0),
                    'views'            => max($roomCachedViews, 0),
                    'likes'            => $roomSaves,
                ];

                $roomGroups[$groupKey] = $roomItem;
            }

            $individualRooms = collect(array_values($roomGroups));

            // Also check for registered resorts that haven't added individual rooms yet
            $resortQuery = \App\Models\User::where('role', 'resort')
                ->where('resort_is_setup', true);

            if (!empty($handledResortIds)) {
                $resortQuery->whereNotIn('id', array_unique($handledResortIds));
            }

            if ($search !== null && $search !== '') {
                $resortQuery->where(function($q) use ($search) {
                    $q->where('resort_name', 'LIKE', "%{$search}%")
                      ->orWhere('resort_description', 'LIKE', "%{$search}%");
                });
            }

            $resortsWithoutRooms = $resortQuery->get();

            foreach ($resortsWithoutRooms as $resortOwner) {
                $images = $resortOwner->resort_images ?? [];
                $primaryImage = is_array($images) && count($images) > 0 ? $images[0] : '';
                // Views: check cache keys for this resort owner
                $resortCachedViews = (int) Cache::get("view_count_resort_{$resortOwner->id}", 0);
                $resortAccViews = (int) Cache::get("view_count_accommodation_{$resortOwner->id}", 0);
                $totalResortViews = max($resortCachedViews, $resortAccViews);
                // Saves: count wishlist_items for this resort owner's user id
                $resortSaves = 0;
                try {
                    if (Schema::hasTable('wishlist_items')) {
                        $resortSaves = (int) \App\Models\WishlistItem::where('item_id', (string)$resortOwner->id)
                            ->where('item_type', 'accommodation')
                            ->count();
                    }
                } catch (\Throwable $e) {}

                $individualRooms->push([
                    'id'               => $resortOwner->id,
                    'name'             => $resortOwner->resort_name ?? $resortOwner->name,
                    'resort_name'      => $resortOwner->resort_name ?? $resortOwner->name,
                    'description'      => $resortOwner->resort_description ?? $resortOwner->description,
                    'full_description' => $resortOwner->resort_description ?? $resortOwner->description,
                    'price_per_night'  => (float) ($resortOwner->resort_price_per_night ?: 0),
                    'price'            => (float) ($resortOwner->resort_price_per_night ?: 0),
                    'image'            => $primaryImage,
                    'images'           => $images,
                    'resort_amenities' => $resortOwner->resort_amenities ?? [],
                    'user_id'          => $resortOwner->id,
                    'is_registered'    => true,
                    'type'             => 'Beach Resort',
                    'category'         => 'Beach Resort',
                    'badge'            => $resortOwner->resort_name ?? 'Resort Stay',
                    'capacity'         => 2,
                    'is_room'          => false,
                    'location'         => $resortOwner->barangay ? "{$resortOwner->barangay}, Mansalay, Oriental Mindoro" : ($resortOwner->address ?: 'Mansalay, Oriental Mindoro'),
                    'barangay'         => $resortOwner->barangay,
                    'latitude'         => $resortOwner->latitude,
                    'longitude'        => $resortOwner->longitude,
                    'phone'            => $resortOwner->phone,
                    'contact_number'   => $resortOwner->phone,
                    'facebook'         => $resortOwner->facebook_link,
                    'instagram'        => $resortOwner->instagram_link,
                    'website'          => $resortOwner->website ?? null,
                    'virtual_tour_video' => $resortOwner->virtual_tour_video ?? ($resortOwner->video ?? null),
                    'virtual_tour_scenes' => $resortOwner->virtual_tour_scenes ?? [],
                    'view_count'       => $totalResortViews,
                    'views'            => $totalResortViews,
                    'likes'            => $resortSaves,
                ]);
            }

            $merged = $staticAccommodations
                ->concat($individualRooms)
                ->values();

            return response()->json($merged);
        } catch (\Throwable $e) {
            \Log::error('Accommodation index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Store a new accommodation.
     * - Resort owner: sets user_id and is_registered = true
     * - Admin: sets is_registered = false (static listing)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'full_description'=> 'nullable|string',
            'location'        => 'nullable|string|max:255',
            'category'        => 'nullable|string|max:255',
            'type'            => 'nullable|string|max:255',
            'operating_hours' => 'nullable|string|max:255',
            'contact_number'  => 'nullable|string|max:255',
            'facebook'        => 'nullable|string|max:255',
            'instagram'       => 'nullable|string|max:255',
            'website'         => 'nullable|string|max:255',
            'price_per_night' => 'nullable|numeric',
            'price'           => 'nullable|numeric',
            'image'           => 'nullable',
            'video'           => 'nullable',
            'availability'    => 'nullable',
        ]);

        if (!isset($data['price_per_night']) && isset($data['price'])) {
            $data['price_per_night'] = $data['price'];
        }
        if (!isset($data['price_per_night'])) {
            $data['price_per_night'] = 0;
        }

        if (isset($data['availability']) && is_string($data['availability'])) {
            $decoded = json_decode($data['availability'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $data['availability'] = $decoded;
            }
        }

        $user = $request->user();

        // Handle image / multiple images upload
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('accommodations', 'public');
                    $imagePaths[] = '/storage/' . $path;
                }
            }
        }
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $path = $image->store('accommodations', 'public');
            $singlePath = '/storage/' . $path;
            if (!in_array($singlePath, $imagePaths)) {
                array_unshift($imagePaths, $singlePath);
            }
            $data['image'] = $singlePath;
        } elseif (!empty($imagePaths)) {
            $data['image'] = $imagePaths[0];
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
        }

        if (!empty($imagePaths)) {
            $data['images'] = array_values(array_unique(array_filter($imagePaths)));
        }

        // Handle video upload
        if ($request->hasFile('video')) {
            $video = $request->file('video');
            $videoName = time() . '_' . $video->getClientOriginalName();
            $video->storeAs('public/accommodations/videos', $videoName);
            $data['video'] = '/storage/accommodations/videos/' . $videoName;
        } elseif (is_string($request->input('video'))) {
            $data['video'] = $request->input('video');
        }

        // Resort owner creates a registered listing; admin creates a static listing
        $data['user_id']       = ($user && $user->role === 'resort') ? $user->id : null;
        $data['is_registered'] = ($user && $user->role === 'resort');

        $accommodation = \App\Models\Accommodation::create($data);

        return response()->json($accommodation, 201);
    }

    /**
     * Show a single accommodation with owner info.
     */
    public function show(int $id)
    {
        $item = \App\Models\Accommodation::with('owner:id,name,email,phone,description,listing_status,payment_details')
            ->findOrFail($id);
        return response()->json($item);
    }

    /**
     * Update an accommodation.
     */
    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'            => 'sometimes|required|string|max:255',
            'description'     => 'sometimes|nullable|string',
            'full_description'=> 'sometimes|nullable|string',
            'location'        => 'sometimes|nullable|string|max:255',
            'category'        => 'sometimes|nullable|string|max:255',
            'type'            => 'sometimes|nullable|string|max:255',
            'operating_hours' => 'sometimes|nullable|string|max:255',
            'contact_number'  => 'sometimes|nullable|string|max:255',
            'facebook'        => 'sometimes|nullable|string|max:255',
            'instagram'       => 'sometimes|nullable|string|max:255',
            'website'         => 'sometimes|nullable|string|max:255',
            'price_per_night' => 'sometimes|nullable|numeric',
            'price'           => 'sometimes|nullable|numeric',
            'image'           => 'sometimes|nullable',
            'images'          => 'sometimes|nullable',
            'video'           => 'sometimes|nullable',
            'availability'    => 'sometimes|nullable',
        ]);

        if (isset($data['price']) && !isset($data['price_per_night'])) {
            $data['price_per_night'] = $data['price'];
        }

        if (isset($data['availability']) && is_string($data['availability'])) {
            $decoded = json_decode($data['availability'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $data['availability'] = $decoded;
            }
        }

        $accommodation = \App\Models\Accommodation::findOrFail($id);

        $imagePaths = [];
        $hasNewFileUpload = false;

        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('accommodations', 'public');
                    $imagePaths[] = '/storage/' . $path;
                    $hasNewFileUpload = true;
                }
            }
        }

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $path = $image->store('accommodations', 'public');
            $singlePath = '/storage/' . $path;
            $imagePaths[] = $singlePath;
            $data['image'] = $singlePath;
            $hasNewFileUpload = true;
        }

        // Merge existing retained images if provided
        if ($request->has('existing_images')) {
            $existing = $request->input('existing_images');
            $existingArr = [];
            if (is_string($existing)) {
                $decoded = json_decode($existing, true);
                if (is_array($decoded)) {
                    $existingArr = $decoded;
                }
            } elseif (is_array($existing)) {
                $existingArr = $existing;
            }

            $cleanedExisting = array_map(function($img) {
                if (is_string($img)) {
                    return preg_replace('#^https?://[^/]+#', '', $img);
                }
                return $img;
            }, $existingArr);

            if ($hasNewFileUpload) {
                $imagePaths = array_merge($imagePaths, $cleanedExisting);
            } else {
                $imagePaths = array_merge($cleanedExisting, $imagePaths);
            }
        }

        if (!$hasNewFileUpload && $request->filled('image') && is_string($request->input('image'))) {
            $cleanImg = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $data['image'] = $cleanImg;
            if (!in_array($cleanImg, $imagePaths)) {
                array_unshift($imagePaths, $cleanImg);
            }
        }

        if (!empty($imagePaths)) {
            $imagePaths = array_values(array_unique(array_filter($imagePaths)));
            $data['images'] = $imagePaths;
            if (empty($data['image'])) {
                $data['image'] = $imagePaths[0];
            }
        }

        if ($request->hasFile('video')) {
            $video = $request->file('video');
            $path = $video->store('accommodations/videos', 'public');
            $data['video'] = '/storage/' . $path;
        } elseif ($request->filled('video') && is_string($request->input('video'))) {
            $data['video'] = $request->input('video');
        }

        $accommodation->update($data);

        return response()->json($accommodation);
    }

    /**
     * Remove an accommodation (static accommodation, resort room, or resort profile listing).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        // 1. Check if ID is formatted as 'room-{id}'
        if (is_string($id) && str_starts_with($id, 'room-')) {
            $roomId = (int) str_replace('room-', '', $id);
            $room = \App\Models\ResortRoom::find($roomId);
            if ($room) {
                if ($user && $user->role !== 'admin' && (int)$room->user_id !== (int)$user->id) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }
                $room->delete();
                return response()->json(['message' => 'Resort room deleted']);
            }
        }

        // 2. Check in Accommodation model (static listings)
        $accommodation = \App\Models\Accommodation::find($id);
        if ($accommodation) {
            if ($user && $user->role !== 'admin' && (int)$accommodation->user_id !== (int)$user->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            $accommodation->delete();
            return response()->json(['message' => 'Accommodation deleted']);
        }

        // 3. Check in ResortRoom model directly by numerical ID
        $room = \App\Models\ResortRoom::find($id);
        if ($room) {
            if ($user && $user->role !== 'admin' && (int)$room->user_id !== (int)$user->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            $room->delete();
            return response()->json(['message' => 'Resort room deleted']);
        }

        // 4. Check if ID corresponds to a Resort User account
        $resortUser = \App\Models\User::where('id', $id)->where('role', 'resort')->first();
        if ($resortUser) {
            if ($user && $user->role !== 'admin' && (int)$resortUser->id !== (int)$user->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            // Reset resort profile & unpublish listing
            $resortUser->update([
                'resort_is_setup' => false,
                'listing_status' => 'pending',
            ]);
            \App\Models\ResortRoom::where('user_id', $resortUser->id)->delete();
            return response()->json(['message' => 'Resort listing removed']);
        }

        return response()->json(['message' => 'Accommodation already removed or not found'], 200);
    }

    /**
     * Get public business profile for a resort owner.
     * Returns owner info + all their accommodations.
     * Used for the dedicated business page visible to tourists.
     */
    public function businessProfile(int $userId)
    {
        $owner = \App\Models\User::where('id', $userId)
            ->whereIn('role', ['resort', 'admin'])
            ->first();

        if (!$owner) {
            return response()->json(['message' => 'Resort profile not found'], 404);
        }

        // Auto-sync any room posts created by this resort owner into ResortRoom
        try {
            $roomPosts = \App\Models\EnterprisePost::where('user_id', $userId)
                ->where(function($q) {
                    $q->where('type', 'rooms')
                      ->orWhere('type', 'room');
                })
                ->get();
            foreach ($roomPosts as $rp) {
                EnterprisePostController::syncRoomFromPost($rp, $owner);
            }
        } catch (\Throwable $e) {
            // ignore
        }

        $rooms = \App\Models\ResortRoom::where('user_id', $userId)
            ->where(function($q) {
                $q->where('is_available', true)
                  ->orWhereNull('is_available');
            })
            ->orderBy('price_per_night', 'asc')
            ->get()
            ->map(function ($r) {
                return [
                    'id'              => $r->id,
                    'name'            => $r->name,
                    'type'            => $r->type ?: 'Room',
                    'description'     => $r->description,
                    'price_per_night' => (float) $r->price_per_night,
                    'price'           => (float) $r->price_per_night,
                    'capacity'        => (int) $r->capacity,
                    'image'           => $r->image,
                    'images'          => $r->images ?? [],
                    'is_available'    => (bool) $r->is_available,
                ];
            });

        // Merge any registered Accommodation model entries belonging to this user
        $staticAccs = \App\Models\Accommodation::where('user_id', $userId)->get();
        if ($staticAccs->isNotEmpty()) {
            $existingNames = $rooms->pluck('name')->map(fn($n) => strtolower(trim($n)))->toArray();
            foreach ($staticAccs as $acc) {
                if (!in_array(strtolower(trim($acc->name)), $existingNames)) {
                    $rooms->push([
                        'id'              => 'acc_' . $acc->id,
                        'name'            => $acc->name,
                        'type'            => $acc->type ?: 'Room',
                        'description'     => $acc->description,
                        'price_per_night' => (float) ($acc->price_per_night ?: $acc->price ?: 1500),
                        'price'           => (float) ($acc->price_per_night ?: $acc->price ?: 1500),
                        'capacity'        => 2,
                        'image'           => $acc->image,
                        'images'          => is_array($acc->images) ? $acc->images : (!empty($acc->image) ? [$acc->image] : []),
                        'is_available'    => true,
                    ]);
                }
            }
        }

        $images = $owner->resort_images ?? [];
        $primaryImage = is_array($images) && count($images) > 0 ? $images[0] : '';
        $logo = $owner->store_logo ?: $primaryImage;
        $banner = $owner->store_banner ?: $primaryImage;

        $ownerResponse = [
            'id'                 => $owner->id,
            'name'               => $owner->name,
            'email'              => $owner->email,
            'phone'              => $owner->phone,
            'address'            => $owner->address,
            'barangay'           => $owner->barangay,
            'description'        => $owner->resort_description ?? $owner->description,
            'resort_name'        => $owner->resort_name ?? $owner->name,
            'resort_description' => $owner->resort_description ?? $owner->description,
            'store_name'         => $owner->resort_name ?? $owner->name,
            'store_description'  => $owner->resort_description ?? $owner->description,
            'store_logo'         => $logo,
            'store_banner'       => $banner,
            'resort_logo'        => $logo,
            'resort_banner'      => $banner,
            'logo'               => $logo,
            'banner'             => $banner,
            'resort_images'      => $images,
            'resort_amenities'   => $owner->resort_amenities ?? [],
            'resort_facilities'  => $owner->resort_facilities,
            'resort_policies'    => $owner->resort_policies,
            'resort_is_setup'    => (bool) $owner->resort_is_setup,
            'facebook_link'      => $owner->facebook_link,
            'instagram_link'     => $owner->instagram_link,
            'latitude'           => $owner->latitude,
            'longitude'          => $owner->longitude,
            'video'              => $owner->video ?? $owner->video_url,
            'video_url'          => $owner->video_url ?? $owner->video,
            'video_tour'         => $owner->video ?? $owner->video_url,
            'virtual_tour_scenes'=> $owner->virtual_tour_scenes ?? [],
            'last_active_at'     => $owner->updated_at,
            'created_at'         => $owner->created_at,
            'payment_details'    => $owner->payment_details,
        ];

        return response()->json([
            'owner'          => $ownerResponse,
            'accommodations' => $rooms,
            'rooms'          => $rooms,
            'is_registered'  => true,
        ]);
    }
}
