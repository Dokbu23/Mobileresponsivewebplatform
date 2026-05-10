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

        // Resort owner: only their own accommodations
        if ($user && $user->role === 'resort') {
            $query = \App\Models\Accommodation::where('user_id', $user->id);
        } else {
            // Public / admin: all accommodations with owner info
            $query = \App\Models\Accommodation::with('owner:id,name,email,phone,description,listing_status');
        }

        $search = $request->input('search');

        if ($search !== null && $search !== '') {
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Resort owner view: return only their accommodations
        if ($user && $user->role === 'resort') {
            return response()->json($query->get());
        }

        $staticAccommodations = $query->get()->map(function ($item) {
            $item->type = 'static';
            return $item;
        });

        $resortQuery = \App\Models\User::where('role', 'resort')
            ->where('resort_is_setup', true)
            ->where('listing_status', 'approved');

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
                'type' => 'resort_profile',
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
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'price_per_night'=> 'required|numeric',
            'image'          => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'availability'   => 'nullable',
        ]);

        if (isset($data['availability']) && is_string($data['availability'])) {
            $decoded = json_decode($data['availability'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $data['availability'] = $decoded;
            }
        }

        $user = $request->user();

        // Handle image upload
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->storeAs('public/accommodations', $imageName);
            $data['image'] = '/storage/accommodations/' . $imageName;
        } else {
            $data['image'] = $request->input('image', '');
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
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'price_per_night'=> 'required|numeric',
            'image'          => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'availability'   => 'nullable',
        ]);

        if (isset($data['availability']) && is_string($data['availability'])) {
            $decoded = json_decode($data['availability'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $data['availability'] = $decoded;
            }
        }

        $accommodation = \App\Models\Accommodation::findOrFail($id);

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->storeAs('public/accommodations', $imageName);
            $data['image'] = '/storage/accommodations/' . $imageName;
        } else {
            unset($data['image']);
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
