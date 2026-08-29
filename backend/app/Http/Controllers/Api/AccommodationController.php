<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

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
                $item->type = 'static';
                return $item;
            });

            // Resort profiles query (only approved & paid resorts)
            $resortQuery = \App\Models\User::where('role', 'resort')
                ->where('resort_is_setup', true)
                ->where('listing_status', 'approved')
                ->whereIn('subscription_status', ['paid', 'active']);

            if ($search !== null && $search !== '') {
                $resortQuery->where(function($q) use ($search) {
                    $q->where('resort_name', 'LIKE', "%{$search}%")
                      ->orWhere('resort_description', 'LIKE', "%{$search}%");
                });
            }

            $resortsList = $resortQuery->get();

            // Resort rooms query (only from approved & paid resorts)
            $individualRooms = collect();
            foreach ($resortsList as $user) {
                $rooms = \App\Models\ResortRoom::where('user_id', $user->id)
                    ->where('is_available', true)
                    ->orderBy('price_per_night', 'asc')
                    ->get();

                $images = $user->resort_images ?? [];
                $primaryImage = is_array($images) && count($images) > 0 ? $images[0] : '';

                if ($rooms->count() > 0) {
                    foreach ($rooms as $room) {
                        $individualRooms->push([
                            'id' => 'room-' . $room->id,
                            'room_id' => $room->id,
                            'name' => $room->name,
                            'resort_name' => $user->resort_name ?? $user->name,
                            'description' => $room->description ?: ($user->resort_description ?? ''),
                            'price_per_night' => (float) $room->price_per_night,
                            'price' => (float) $room->price_per_night,
                            'image' => $room->image ?: $primaryImage,
                            'images' => $room->image ? [$room->image] : $images,
                            'resort_amenities' => $user->resort_amenities ?? [],
                            'user_id' => $user->id,
                            'is_registered' => true,
                            'type' => $room->type ?: 'Resort Room',
                            'category' => $room->type ?: 'Rooms & Suites',
                            'badge' => $user->resort_name ?? 'Resort Stay',
                            'capacity' => $room->capacity,
                            'is_room' => true,
                            'barangay' => $user->barangay,
                            'latitude' => $user->latitude,
                            'longitude' => $user->longitude,
                        ]);
                    }
                } else {
                    // If resort has not uploaded rooms yet, show resort stay
                    $individualRooms->push([
                        'id' => $user->id,
                        'name' => $user->resort_name ?? $user->name,
                        'resort_name' => $user->resort_name ?? $user->name,
                        'description' => $user->resort_description ?? $user->description,
                        'price_per_night' => (float) ($user->resort_price_per_night ?: 0),
                        'price' => (float) ($user->resort_price_per_night ?: 0),
                        'image' => $primaryImage,
                        'images' => $images,
                        'resort_amenities' => $user->resort_amenities ?? [],
                        'user_id' => $user->id,
                        'is_registered' => true,
                        'type' => 'Beach Resort',
                        'category' => 'Beach Resort',
                        'badge' => $user->resort_name ?? 'Resort Stay',
                        'capacity' => 2,
                        'is_room' => false,
                        'barangay' => $user->barangay,
                        'latitude' => $user->latitude,
                        'longitude' => $user->longitude,
                    ]);
                }
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
                    $fileName = time() . '_' . rand(1000, 9999) . '_' . $file->getClientOriginalName();
                    $file->storeAs('public/accommodations', $fileName);
                    $imagePaths[] = '/storage/accommodations/' . $fileName;
                }
            }
        }
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->storeAs('public/accommodations', $imageName);
            $singlePath = '/storage/accommodations/' . $imageName;
            if (!in_array($singlePath, $imagePaths)) {
                array_unshift($imagePaths, $singlePath);
            }
            $data['image'] = $singlePath;
        } elseif (!empty($imagePaths)) {
            $data['image'] = $imagePaths[0];
        } elseif (is_string($request->input('image'))) {
            $data['image'] = $request->input('image');
        }

        if (!empty($imagePaths)) {
            $data['images'] = $imagePaths;
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
        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $fileName = time() . '_' . rand(1000, 9999) . '_' . $file->getClientOriginalName();
                    $file->storeAs('public/accommodations', $fileName);
                    $imagePaths[] = '/storage/accommodations/' . $fileName;
                }
            }
        }
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->storeAs('public/accommodations', $imageName);
            $singlePath = '/storage/accommodations/' . $imageName;
            if (!in_array($singlePath, $imagePaths)) {
                array_unshift($imagePaths, $singlePath);
            }
            $data['image'] = $singlePath;
        } elseif (!empty($imagePaths)) {
            $data['image'] = $imagePaths[0];
        }

        if (!empty($imagePaths)) {
            $data['images'] = $imagePaths;
        }

        if ($request->hasFile('video')) {
            $video = $request->file('video');
            $videoName = time() . '_' . $video->getClientOriginalName();
            $video->storeAs('public/accommodations/videos', $videoName);
            $data['video'] = '/storage/accommodations/videos/' . $videoName;
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
            ->where('role', 'resort')
            ->firstOrFail();

        $rooms = \App\Models\ResortRoom::where('user_id', $userId)
            ->where('is_available', true)
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
                    'is_available'    => (bool) $r->is_available,
                ];
            });

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
            'resort_images'      => $images,
            'resort_amenities'   => $owner->resort_amenities ?? [],
            'resort_facilities'  => $owner->resort_facilities,
            'resort_policies'    => $owner->resort_policies,
            'facebook_link'      => $owner->facebook_link,
            'instagram_link'     => $owner->instagram_link,
            'latitude'           => $owner->latitude,
            'longitude'          => $owner->longitude,
            'last_active_at'     => $owner->updated_at,
            'created_at'         => $owner->created_at,
            'payment_details'    => $owner->payment_details,
        ];

        $promoCodes = \App\Models\PromoCode::where('user_id', $userId)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->get()
            ->map(function ($c) {
                return [
                    'id'          => $c->id,
                    'code'        => $c->code,
                    'description' => $c->description,
                    'type'        => $c->type,
                    'value'       => (float) $c->value,
                    'min_amount'  => (float) $c->min_amount,
                    'expires_at'  => $c->expires_at,
                ];
            });

        return response()->json([
            'owner'          => $ownerResponse,
            'accommodations' => $rooms,
            'rooms'          => $rooms,
            'promo_codes'    => $promoCodes,
            'is_registered'  => true,
        ]);
    }
}
