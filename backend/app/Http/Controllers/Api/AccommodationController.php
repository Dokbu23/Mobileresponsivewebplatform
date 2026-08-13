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

        $resortProfiles = $resortQuery->get()->map(function ($user) {
            $images = $user->resort_images ?? [];
            $primaryImage = is_array($images) && count($images) > 0 ? $images[0] : '';

            return [
                'id' => $user->id,
                'name' => $user->resort_name ?? $user->name,
                'description' => $user->resort_description ?? $user->description,
                'price_per_night' => $user->resort_price_per_night,
                'image' => $primaryImage,
                'resort_images' => $images,
                'resort_amenities' => $user->resort_amenities ?? [],
                'resort_facilities' => $user->resort_facilities,
                'resort_policies' => $user->resort_policies,
                'availability' => (object) [],
                'user_id' => $user->id,
                'is_registered' => true,
                'type' => 'Beach Resort',
                'category' => 'Beach Resort',
                'latitude' => $user->latitude,
                'longitude' => $user->longitude,
                'video' => $user->video ?? $user->video_url ?? null,
            ];
        });

        $merged = $staticAccommodations->concat($resortProfiles)->values();

        return response()->json($merged);
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
     * Remove an accommodation.
     */
    public function destroy(int $id)
    {
        $accommodation = \App\Models\Accommodation::findOrFail($id);
        $accommodation->delete();

        return response()->json(['message' => 'Accommodation deleted']);
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
            ->where('listing_status', 'approved')
            ->select(
                'id',
                'name',
                'email',
                'phone',
                'address',
                'barangay',
                'description',
                'payment_details',
                'resort_name',
                'resort_description',
                'resort_price_per_night',
                'resort_images',
                'resort_amenities',
                'resort_facilities',
                'resort_policies',
                'resort_is_setup'
            )
            ->firstOrFail();

        $accommodations = collect();

        if ($owner->resort_is_setup) {
            $images = $owner->resort_images ?? [];
            $primaryImage = is_array($images) && count($images) > 0 ? $images[0] : '';

            $accommodations = collect([
                [
                    'id' => $owner->id,
                    'name' => $owner->resort_name ?? $owner->name,
                    'description' => $owner->resort_description ?? $owner->description,
                    'price_per_night' => $owner->resort_price_per_night,
                    'image' => $primaryImage,
                    'resort_images' => $images,
                    'resort_amenities' => $owner->resort_amenities ?? [],
                    'resort_facilities' => $owner->resort_facilities,
                    'resort_policies' => $owner->resort_policies,
                    'type' => 'resort_profile',
                ],
            ]);
        }

        $ownerResponse = [
            'id' => $owner->id,
            'name' => $owner->resort_name ?? $owner->name,
            'email' => $owner->email,
            'phone' => $owner->phone,
            'address' => $owner->address,
            'barangay' => $owner->barangay,
            'description' => $owner->resort_description ?? $owner->description,
            'payment_details' => $owner->payment_details,
        ];

        return response()->json([
            'owner'          => $ownerResponse,
            'accommodations' => $accommodations,
            'is_registered'  => true,
        ]);
    }
}
