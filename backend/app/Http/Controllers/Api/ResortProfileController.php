<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

/**
 * ResortProfileController
 * 
 * Manages resort profile operations for resort owners.
 * This controller will be fully implemented in subsequent tasks.
 * 
 * Routes:
 * - GET /api/resort-profile - Retrieve authenticated resort owner's profile
 * - PUT /api/resort-profile - Update resort profile
 * - POST /api/resort-profile/setup - Initial profile setup after subscription
 */
class ResortProfileController extends Controller
{
    /**
     * Get authenticated resort owner's profile
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'resort') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $images = $user->resort_images ?? [];
        $primary = is_array($images) && count($images) > 0 ? $images[0] : '';
        $logo = $user->store_logo ?: $primary;
        $banner = $user->store_banner ?: $primary;

        return response()->json([
            'id'                     => $user->id,
            'user_id'                => $user->id,
            'name'                   => $user->name,
            'email'                  => $user->email,
            'phone'                  => $user->phone,
            'address'                => $user->address,
            'barangay'               => $user->barangay,
            'facebook_link'          => $user->facebook_link,
            'instagram_link'         => $user->instagram_link,
            'subscription_status'    => $user->subscription_status,
            'resort_name'            => $user->resort_name ?: $user->name,
            'resort_description'     => $user->resort_description ?: $user->description,
            'resort_price_per_night' => $user->resort_price_per_night,
            'resort_images'          => $images,
            'resort_amenities'       => $user->resort_amenities ?? [],
            'resort_facilities'      => $user->resort_facilities,
            'resort_policies'        => $user->resort_policies,
            'resort_is_setup'        => (bool) $user->resort_is_setup,
            'listing_status'         => $user->listing_status,
            'latitude'               => $user->latitude,
            'longitude'              => $user->longitude,
            'store_logo'             => $logo,
            'store_banner'           => $banner,
            'resort_logo'            => $logo,
            'resort_banner'          => $banner,
        ]);
    }

    /**
     * Update resort profile
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'resort') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $amenities = $this->normalizeArrayField($request->input('resort_amenities'));
        if ($amenities !== null) {
            $request->merge(['resort_amenities' => $amenities]);
        }

        $request->validate([
            'resort_name'            => 'sometimes|nullable|string|max:255',
            'resort_description'     => 'sometimes|nullable|string',
            'resort_price_per_night' => 'sometimes|nullable|numeric|min:0',
            'resort_amenities'       => 'nullable|array',
            'resort_facilities'      => 'nullable|string',
            'resort_policies'        => 'nullable|string',
            'phone'                  => 'nullable|string|max:50',
            'address'                => 'nullable|string|max:500',
            'barangay'               => 'nullable|string|max:100',
            'facebook_link'          => 'nullable|string|max:500',
            'instagram_link'         => 'nullable|string|max:500',
            'latitude'               => 'nullable|numeric',
            'longitude'              => 'nullable|numeric',
            'images'                 => 'nullable|array|max:10',
            'images.*'               => 'nullable|file|mimes:jpg,jpeg,png,webp,avif|max:10240',
            'logo'                   => 'nullable|file|mimes:jpg,jpeg,png,webp,avif|max:10240',
            'banner'                 => 'nullable|file|mimes:jpg,jpeg,png,webp,avif|max:10240',
        ]);

        $updateData = [];

        foreach ([
            'resort_name', 'resort_description', 'resort_price_per_night',
            'resort_amenities', 'resort_facilities', 'resort_policies',
            'phone', 'address', 'barangay', 'facebook_link', 'instagram_link',
            'latitude', 'longitude'
        ] as $field) {
            if ($request->has($field) && $request->input($field) !== null) {
                $updateData[$field] = $request->input($field);
            }
        }

        // If resort_description is updated, also update base description
        if (isset($updateData['resort_description'])) {
            $updateData['description'] = $updateData['resort_description'];
        }

        // Handle gallery images upload
        $newImages = $this->handleImageUploads($request);
        if (!empty($newImages)) {
            $oldImages = $user->resort_images ?? [];
            $this->deleteOldImages($oldImages);
            $updateData['resort_images'] = $newImages;
        }

        // Handle logo upload
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('resort-profiles/logos', 'public');
            $updateData['store_logo'] = '/storage/' . $path;
        }

        // Handle banner upload
        if ($request->hasFile('banner')) {
            $path = $request->file('banner')->store('resort-profiles/banners', 'public');
            $updateData['store_banner'] = '/storage/' . $path;
        }

        if (!empty($updateData)) {
            $user->update($updateData);
        }

        $fresh = $user->fresh();
        $images = $fresh->resort_images ?? [];
        $primary = is_array($images) && count($images) > 0 ? $images[0] : '';
        $logo = $fresh->store_logo ?: $primary;
        $banner = $fresh->store_banner ?: $primary;

        return response()->json([
            'message' => 'Resort profile updated successfully',
            'user'    => $fresh,
            'logo'    => $logo,
            'banner'  => $banner,
            'profile' => [
                'user_id'                => $fresh->id,
                'resort_name'            => $fresh->resort_name ?: $fresh->name,
                'resort_description'     => $fresh->resort_description ?: $fresh->description,
                'resort_price_per_night' => $fresh->resort_price_per_night,
                'resort_images'          => $images,
                'resort_amenities'       => $fresh->resort_amenities ?? [],
                'resort_facilities'      => $fresh->resort_facilities,
                'resort_policies'        => $fresh->resort_policies,
                'resort_is_setup'        => (bool) $fresh->resort_is_setup,
                'phone'                  => $fresh->phone,
                'address'                => $fresh->address,
                'barangay'               => $fresh->barangay,
                'facebook_link'          => $fresh->facebook_link,
                'instagram_link'         => $fresh->instagram_link,
                'latitude'               => $fresh->latitude,
                'longitude'              => $fresh->longitude,
                'store_logo'             => $logo,
                'store_banner'           => $banner,
                'resort_logo'            => $logo,
                'resort_banner'          => $banner,
            ],
        ]);
    }

    /**
     * Initial resort profile setup (one-time after subscription)
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function setup(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'resort') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($user->resort_is_setup) {
            return response()->json(['message' => 'Resort profile already set up.'], 400);
        }

        $amenities = $this->normalizeArrayField($request->input('resort_amenities'));
        if ($amenities !== null) {
            $request->merge(['resort_amenities' => $amenities]);
        }

        $validated = $request->validate(
            User::resortProfileValidationRules(true),
            User::resortProfileValidationMessages()
        );

        $imageUrls = $this->handleImageUploads($request);
        if (empty($imageUrls)) {
            return response()->json(['message' => 'At least one resort image is required.'], 422);
        }

        $validated['resort_images'] = $imageUrls;
        $validated['resort_is_setup'] = true;

        $user->update($validated);

        return response()->json([
            'message' => 'Resort profile setup completed',
            'profile' => [
                'user_id' => $user->id,
                'resort_name' => $user->resort_name,
                'resort_description' => $user->resort_description,
                'resort_price_per_night' => $user->resort_price_per_night,
                'resort_images' => $user->resort_images ?? [],
                'resort_amenities' => $user->resort_amenities ?? [],
                'resort_facilities' => $user->resort_facilities,
                'resort_policies' => $user->resort_policies,
                'resort_is_setup' => (bool) $user->resort_is_setup,
            ],
        ], 201);
    }

    /**
     * Normalize JSON array input from either array or JSON string.
     *
     * @param mixed $value
     * @return array|null
     */
    protected function normalizeArrayField($value)
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    /**
     * Handle multiple image uploads for resort profile.
     * 
     * Stores images in public/storage/resort-profiles directory with unique filenames.
     * Generates timestamps for unique naming and returns array of image URLs.
     * 
     * @param Request $request The request containing image files
     * @return array Array of image URLs
     */
    protected function handleImageUploads(Request $request)
    {
        $imageUrls = [];

        if ($request->hasFile('images')) {
            $images = $request->file('images');

            // Ensure images is an array
            if (!is_array($images)) {
                $images = [$images];
            }

            foreach ($images as $image) {
                // Generate unique filename with timestamp
                $timestamp = time();
                $originalName = $image->getClientOriginalName();
                $extension = $image->getClientOriginalExtension();
                $filename = $timestamp . '_' . uniqid() . '_' . $originalName;

                // Store image in public/storage/resort-profiles directory
                $path = $image->storeAs('resort-profiles', $filename, 'public');

                // Generate public URL
                $imageUrl = '/storage/' . $path;
                $imageUrls[] = $imageUrl;
            }
        }

        return $imageUrls;
    }

    /**
     * Delete old images from storage when updating resort profile.
     * 
     * @param array $oldImageUrls Array of old image URLs to delete
     * @return void
     */
    protected function deleteOldImages(array $oldImageUrls)
    {
        foreach ($oldImageUrls as $imageUrl) {
            // Extract path from URL (remove /storage/ prefix)
            $path = str_replace('/storage/', '', $imageUrl);
            
            // Delete file from storage
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
