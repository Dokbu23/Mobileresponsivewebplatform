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

        return response()->json([
            'user_id' => $user->id,
            'resort_name' => $user->resort_name,
            'resort_description' => $user->resort_description,
            'resort_price_per_night' => $user->resort_price_per_night,
            'resort_images' => $user->resort_images ?? [],
            'resort_amenities' => $user->resort_amenities ?? [],
            'resort_facilities' => $user->resort_facilities,
            'resort_policies' => $user->resort_policies,
            'resort_is_setup' => (bool) $user->resort_is_setup,
            'listing_status' => $user->listing_status,
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
        $amenities = $this->normalizeArrayField($request->input('resort_amenities'));
        if ($amenities !== null) {
            $request->merge(['resort_amenities' => $amenities]);
        }

        // Validate using User model validation rules
        $validated = $request->validate(
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $user = $request->user();

        if (!$user || $user->role !== 'resort') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $newImages = $this->handleImageUploads($request);
        if (!empty($newImages)) {
            $oldImages = $user->resort_images ?? [];
            $this->deleteOldImages($oldImages);
            $validated['resort_images'] = $newImages;
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Resort profile updated successfully',
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
