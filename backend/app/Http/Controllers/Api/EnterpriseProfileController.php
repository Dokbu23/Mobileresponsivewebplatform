<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EnterpriseProfileController extends Controller
{
    /**
     * GET /api/enterprise-profile
     * Returns the authenticated enterprise user's store profile.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'store_name'        => $user->store_name,
            'store_description' => $user->store_description,
            'store_logo'        => $user->store_logo,
            'store_banner'      => $user->store_banner,
            'store_is_setup'    => (bool) $user->store_is_setup,
            'name'              => $user->name,
            'email'             => $user->email,
            'phone'             => $user->phone,
            'address'           => $user->address,
            'barangay'          => $user->barangay,
            'description'       => $user->description,
            'facebook_link'     => $user->facebook_link,
            'instagram_link'    => $user->instagram_link,
            'latitude'          => $user->latitude,
            'longitude'         => $user->longitude,
        ]);
    }

    /**
     * POST /api/enterprise-profile/setup
     * Initial store setup — sets store_is_setup = true.
     */
    public function setup(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'store_name'        => 'nullable|string|max:255',
            'store_description' => 'nullable|string',
            'logo'              => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'banner'            => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('enterprise/logos', 'public');
            $data['store_logo'] = '/storage/' . $path;
        }

        if ($request->hasFile('banner')) {
            $path = $request->file('banner')->store('enterprise/banners', 'public');
            $data['store_banner'] = '/storage/' . $path;
        }

        $user->update([
            'store_name'        => ($data['store_name'] && $data['store_name'] !== 'default') ? $data['store_name'] : ($user->store_name ?: $user->name),
            'store_description' => $data['store_description'] ?? ($user->store_description ?: $user->description),
            'store_logo'        => $data['store_logo'] ?? $user->store_logo,
            'store_banner'      => $data['store_banner'] ?? $user->store_banner,
            'store_is_setup'    => true,
        ]);

        return response()->json([
            'message'        => 'Store profile set up successfully.',
            'store_is_setup' => true,
            'store_name'     => $user->fresh()->store_name,
            'store_logo'     => $user->fresh()->store_logo,
            'store_banner'   => $user->fresh()->store_banner,
        ], 201);
    }

    /**
     * PUT /api/enterprise-profile
     * Update store profile.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'store_name'        => 'sometimes|required|string|max:255',
            'store_description' => 'nullable|string',
            'phone'             => 'nullable|string|max:20',
            'address'           => 'nullable|string|max:500',
            'barangay'          => 'nullable|string|max:100',
            'facebook_link'     => 'nullable|string|max:500',
            'instagram_link'    => 'nullable|string|max:500',
            'latitude'          => 'nullable|numeric',
            'longitude'         => 'nullable|numeric',
            'logo'              => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'banner'            => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('enterprise/logos', 'public');
            $data['store_logo'] = '/storage/' . $path;
        }

        if ($request->hasFile('banner')) {
            $path = $request->file('banner')->store('enterprise/banners', 'public');
            $data['store_banner'] = '/storage/' . $path;
        }

        $updateData = array_filter([
            'store_name'        => $data['store_name'] ?? null,
            'store_description' => $data['store_description'] ?? null,
            'store_logo'        => $data['store_logo'] ?? null,
            'store_banner'      => $data['store_banner'] ?? null,
            'phone'             => $data['phone'] ?? null,
            'address'           => $data['address'] ?? null,
            'barangay'          => $data['barangay'] ?? null,
            'facebook_link'     => $data['facebook_link'] ?? null,
            'instagram_link'    => $data['instagram_link'] ?? null,
            'latitude'          => $data['latitude'] ?? null,
            'longitude'         => $data['longitude'] ?? null,
        ], fn($v) => $v !== null);

        $user->update($updateData);

        return response()->json([
            'message' => 'Store profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * GET /api/public/business/enterprise/{userId}
     * Public enterprise business profile — no auth required.
     * Returns store info + products added by this enterprise.
     */
    public function publicProfile(int $userId)
    {
        $owner = \App\Models\User::where('id', $userId)
            ->where('role', 'enterprise')
            ->where('listing_status', 'approved')
            ->firstOrFail();

        $products = \App\Models\Product::where('user_id', $userId)
            ->get()
            ->map(function ($p) {
                return [
                    'id'          => $p->id,
                    'name'        => $p->name,
                    'description' => $p->description,
                    'price'       => (float) $p->price,
                    'stock'       => (int) $p->stock,
                    'category'    => $p->category,
                    'image'       => $p->image,
                ];
            });

        return response()->json([
            'owner' => [
                'id'               => $owner->id,
                'name'             => $owner->name,
                'email'            => $owner->email,
                'phone'            => $owner->phone,
                'address'          => $owner->address,
                'barangay'         => $owner->barangay,
                'description'      => $owner->store_description ?? $owner->description,
                'store_name'       => $owner->store_name,
                'store_description'=> $owner->store_description,
                'store_logo'       => $owner->store_logo,
                'store_banner'     => $owner->store_banner,
                'store_is_setup'   => (bool) $owner->store_is_setup,
                'facebook_link'    => $owner->facebook_link,
                'instagram_link'   => $owner->instagram_link,
                'last_active_at'   => $owner->updated_at,
                'created_at'       => $owner->created_at,
            ],
            'products'      => $products,
            'is_registered' => true,
        ]);
    }
}
