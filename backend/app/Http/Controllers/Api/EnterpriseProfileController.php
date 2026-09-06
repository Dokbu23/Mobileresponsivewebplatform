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
            'logo'              => 'nullable',
            'banner'            => 'nullable',
            'store_logo'        => 'nullable',
            'store_banner'      => 'nullable',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('enterprise/logos', 'public');
            $data['store_logo'] = '/storage/' . $path;
        } elseif ($request->filled('logo') && is_string($request->input('logo'))) {
            $data['store_logo'] = preg_replace('#^https?://[^/]+#', '', $request->input('logo'));
        } elseif ($request->filled('store_logo') && is_string($request->input('store_logo'))) {
            $data['store_logo'] = preg_replace('#^https?://[^/]+#', '', $request->input('store_logo'));
        }

        if ($request->hasFile('banner')) {
            $path = $request->file('banner')->store('enterprise/banners', 'public');
            $data['store_banner'] = '/storage/' . $path;
        } elseif ($request->filled('banner') && is_string($request->input('banner'))) {
            $data['store_banner'] = preg_replace('#^https?://[^/]+#', '', $request->input('banner'));
        } elseif ($request->filled('store_banner') && is_string($request->input('store_banner'))) {
            $data['store_banner'] = preg_replace('#^https?://[^/]+#', '', $request->input('store_banner'));
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
            'name'              => 'nullable|string|max:255',
            'store_name'        => 'nullable|string|max:255',
            'description'       => 'nullable|string',
            'store_description' => 'nullable|string',
            'phone'             => 'nullable|string|max:50',
            'address'           => 'nullable|string|max:500',
            'barangay'          => 'nullable|string|max:100',
            'facebook_link'     => 'nullable|string|max:500',
            'instagram_link'    => 'nullable|string|max:500',
            'latitude'          => 'nullable|numeric',
            'longitude'         => 'nullable|numeric',
            'logo'              => 'nullable',
            'banner'            => 'nullable',
            'store_logo'        => 'nullable',
            'store_banner'      => 'nullable',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('enterprise/logos', 'public');
            $data['store_logo'] = '/storage/' . $path;
        } elseif ($request->filled('logo') && is_string($request->input('logo'))) {
            $data['store_logo'] = preg_replace('#^https?://[^/]+#', '', $request->input('logo'));
        } elseif ($request->filled('store_logo') && is_string($request->input('store_logo'))) {
            $data['store_logo'] = preg_replace('#^https?://[^/]+#', '', $request->input('store_logo'));
        }

        if ($request->hasFile('banner')) {
            $path = $request->file('banner')->store('enterprise/banners', 'public');
            $data['store_banner'] = '/storage/' . $path;
        } elseif ($request->filled('banner') && is_string($request->input('banner'))) {
            $data['store_banner'] = preg_replace('#^https?://[^/]+#', '', $request->input('banner'));
        } elseif ($request->filled('store_banner') && is_string($request->input('store_banner'))) {
            $data['store_banner'] = preg_replace('#^https?://[^/]+#', '', $request->input('store_banner'));
        }

        $updateData = [];

        $storeName = $data['store_name'] ?? ($data['name'] ?? null);
        $storeDesc = $data['store_description'] ?? ($data['description'] ?? null);

        if ($storeName !== null && trim($storeName) !== '') {
            $updateData['name'] = trim($storeName);
            $updateData['store_name'] = trim($storeName);
        }

        if ($storeDesc !== null) {
            $updateData['description'] = trim($storeDesc);
            $updateData['store_description'] = trim($storeDesc);
        }

        if (!empty($data['store_logo'])) {
            $updateData['store_logo'] = $data['store_logo'];
            $updateData['avatar'] = $data['store_logo'];
        }

        if (!empty($data['store_banner'])) {
            $updateData['store_banner'] = $data['store_banner'];
        }

        // Handle video upload or link
        if ($request->hasFile('video')) {
            $path = $request->file('video')->store('enterprise/videos', 'public');
            $updateData['video'] = '/storage/' . $path;
            $updateData['video_url'] = '/storage/' . $path;
        } elseif ($request->filled('video_url')) {
            $updateData['video_url'] = $request->input('video_url');
            $updateData['video'] = $request->input('video_url');
        } elseif ($request->filled('video')) {
            $updateData['video'] = $request->input('video');
            $updateData['video_url'] = $request->input('video');
        } elseif ($request->has('video_url') && $request->input('video_url') === '') {
            $updateData['video_url'] = null;
            $updateData['video'] = null;
        }

        foreach (['phone', 'address', 'barangay', 'facebook_link', 'instagram_link', 'latitude', 'longitude'] as $field) {
            if ($request->has($field)) {
                $updateData[$field] = $request->input($field);
            }
        }

        $updateData['store_is_setup'] = true;

        if (!empty($updateData)) {
            $user->update($updateData);
        }

        $fresh = $user->fresh();
        $logo = $fresh->store_logo ?? $fresh->avatar;
        $banner = $fresh->store_banner;
        $video = $fresh->video ?? $fresh->video_url;

        return response()->json([
            'message'      => 'Store profile updated successfully.',
            'user'         => $fresh,
            'store_logo'   => $logo,
            'store_banner' => $banner,
            'logo'         => $logo,
            'banner'       => $banner,
            'video'        => $video,
            'video_url'    => $video,
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
                'latitude'         => $owner->latitude,
                'longitude'        => $owner->longitude,
                'video'            => $owner->video ?? $owner->video_url,
                'video_url'        => $owner->video_url ?? $owner->video,
                'video_tour'       => $owner->video ?? $owner->video_url,
                'last_active_at'   => $owner->updated_at,
                'created_at'       => $owner->created_at,
            ],
            'products'      => $products,
            'promo_codes'   => $promoCodes,
            'is_registered' => true,
        ]);
    }
}
