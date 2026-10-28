<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AttractionController extends Controller
{
    /**
     * Display a listing of the resource.
     * - Admin: all attractions
     * - Resort: only attractions where user_id = authenticated user id
     * - Public: all attractions
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            // Admin sees all attractions
            if ($user && $user->role === 'admin') {
                $query = \App\Models\Attraction::with('creator:id,name,role');
            }
            // Resort owners see only their attractions
            elseif ($user && $user->role === 'resort') {
                $query = \App\Models\Attraction::where('user_id', $user->id);
            }
            // Public/Tourists see all published attractions
            else {
                $query = \App\Models\Attraction::query();
            }

            // Strictly enforce publication status for non-admin/public tourists:
            // Only 'approved' or 'published' items are publicly visible (or null for legacy records)
            if (!$user || $user->role !== 'admin') {
                if (\Illuminate\Support\Facades\Schema::hasColumn('attractions', 'status')) {
                    $query->where(function($q) {
                        $q->whereIn('status', ['approved', 'published'])
                          ->orWhereNull('status');
                    });
                }
            }

            // Apply search filter (case-insensitive search on name and description)
            if ($request->has('search') && $request->input('search') !== '') {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            // Apply barangay filter (exact match on location)
            if ($request->has('barangay') && $request->input('barangay') !== '') {
                $query->where('location', $request->input('barangay'));
            }

            $attractions = $query->orderBy('id', 'desc')->get();
            $attractions->each(fn ($attraction) => $this->ensureImageGallery($attraction));

            return response()->json($attractions);
        } catch (\Throwable $e) {
            \Log::error('Attraction index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }
    
    /**
     * Get only the attractions created by the authenticated user.
     * Used by resort dashboard to show "my attractions".
     */
    public function myAttractions(Request $request)
    {
        $user = $request->user();

        $query = \App\Models\Attraction::where('user_id', $user->id);

        if ($request->has('search') && $request->input('search') !== '') {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $attractions = $query->get();
        $attractions->each(fn ($attraction) => $this->ensureImageGallery($attraction));

        return response()->json($attractions);
    }

    /**
     * Store a newly created resource in storage.
     * Saves user_id automatically from the authenticated user.
     * Handles media uploads validated by the API upload middleware.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'image' => 'nullable', // file upload or image URL string
            'images' => 'nullable',
            'video' => 'nullable', // file or string URL
            'video_url' => 'nullable|string',
            'description' => 'nullable|string',
            'full_description' => 'nullable|string',
            'status' => 'nullable|string|in:published,draft,archived,approved',
        ]);

        // Handle string video link / URL if provided
        if ($request->filled('video_url')) {
            $data['video'] = $request->input('video_url');
        }

        $storedImages = [];

        // Handle multiple gallery image uploads.
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('attractions', 'public');
                    $storedImages[] = '/storage/' . $path;
                }
            }
        }

        // Handle the primary image upload or URL when no gallery files were sent.
        if (!$request->hasFile('images') && $request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('attractions', 'public');
                $data['image'] = '/storage/' . $path;
                $storedImages[] = $data['image'];
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store image file: ' . $e->getMessage()], 400);
            }
        } elseif (!$request->hasFile('images') && $request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $storedImages[] = $data['image'];
        }

        if (!$request->hasFile('images') && is_array($request->input('images'))) {
            $storedImages = array_values(array_filter(
                $request->input('images'),
                fn ($image) => is_string($image) && trim($image) !== ''
            ));
            if (!empty($storedImages)) {
                $data['image'] = $storedImages[0];
            }
        }

        if (!empty($storedImages)) {
            $data['images'] = array_values(array_unique($storedImages));
            $data['image'] = $data['images'][0];
        }
        \App\Services\MediaUploadService::assertOwnedImageReferences(
            array_merge([$data['image'] ?? null], $data['images'] ?? []),
            $request->user() ? (int) $request->user()->id : null
        );

        // Handle video upload
        if ($request->hasFile('video')) {
            try {
                $file = $request->file('video');
                $path = $file->store('attractions/videos', 'public');
                $data['video'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store video file: ' . $e->getMessage()], 400);
            }
        }
        \App\Services\MediaUploadService::assertOwnedVideoReferences(
            [$data['video'] ?? null],
            $request->user() ? (int) $request->user()->id : null
        );

        $item = \App\Models\Attraction::create(array_merge($data, [
            'user_id' => $request->user() ? $request->user()->id : null,
        ]));

        return response()->json($item->load('creator:id,name,role'), 201);
    }

    /**
     * Display the specified resource and increment its view count.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $item = \App\Models\Attraction::findOrFail($id);

        // Strict publication check: non-admin cannot view archived or draft items
        if ($item->status && in_array(strtolower($item->status), ['archived', 'draft', 'rejected'])) {
            $user = request()->user();
            if (!$user || $user->role !== 'admin') {
                abort(404, 'Attraction not found or not published.');
            }
        }

        // Increment view count atomically
        $item->increment('view_count');
        $item = $item->fresh();
        $this->ensureImageGallery($item);

        return response()->json($item);
    }

    /**
     * POST /api/public/attractions/{id}/view
     * Lightweight endpoint to record a view without returning full data.
     */
    public function recordView($id)
    {
        $item = \App\Models\Attraction::find($id);
        if ($item) {
            $item->increment('view_count');
        }
        return response()->json(['success' => true]);
    }

    private function ensureImageGallery(\App\Models\Attraction $attraction): void
    {
        $images = $attraction->images;

        if (is_string($images)) {
            $images = json_decode($images, true);
        }

        if (!is_array($images)) {
            $images = [];
        }

        $images = array_values(array_filter($images, fn ($image) => is_string($image) && trim($image) !== ''));
        if (empty($images) && is_string($attraction->image) && trim($attraction->image) !== '') {
            $images[] = $attraction->image;
        }

        $attraction->setAttribute('images', array_values(array_unique($images)));
    }

    /**
     * Update the specified resource in storage.
     * - Admin can update any attraction.
     * - Resort can only update their own attractions.
     * Handles media uploads validated by the API upload middleware.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        $item = \App\Models\Attraction::findOrFail($id);
        $user = $request->user();

        // Verify ownership before allowing modifications
        if (!$this->verifyOwnership($item, $user)) {
            return response()->json([
                'error' => 'You can only edit your own attractions.'
            ], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|nullable|string|max:255',
            'category' => 'sometimes|nullable|string|max:255',
            'image' => 'sometimes|nullable', // file upload or URL string
            'images' => 'sometimes|nullable',
            'video' => 'sometimes|nullable', // file or string URL
            'video_url' => 'sometimes|nullable|string',
            'description' => 'sometimes|nullable|string',
            'full_description' => 'sometimes|nullable|string',
            'status' => 'sometimes|nullable|string|in:published,draft,archived,approved',
        ]);

        // Handle string video link / URL if provided
        if ($request->filled('video_url')) {
            $data['video'] = $request->input('video_url');
        }

        $storedImages = [];
        $hasNewImageUpload = false;

        // Handle new gallery image uploads.
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('attractions', 'public');
                    $storedImages[] = '/storage/' . $path;
                }
            }
            $hasNewImageUpload = !empty($storedImages);
        }

        // Handle the primary image upload or URL when no gallery files were sent.
        if (!$request->hasFile('images') && $request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('attractions', 'public');
                $data['image'] = '/storage/' . $path;
                $storedImages[] = $data['image'];
                $hasNewImageUpload = true;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store image file: ' . $e->getMessage()], 400);
            }
        } elseif (!$request->hasFile('images') && $request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $storedImages[] = $data['image'];
        }

        if (!$request->hasFile('images') && is_array($request->input('images'))) {
            $storedImages = array_values(array_filter(
                $request->input('images'),
                fn ($image) => is_string($image) && trim($image) !== ''
            ));
            $hasNewImageUpload = !empty($storedImages);
            if (!empty($storedImages)) {
                $data['image'] = $storedImages[0];
            }
        }

        $existingImages = $request->input('existing_images', []);
        if (is_string($existingImages)) {
            $existingImages = json_decode($existingImages, true) ?: [];
        }
        if (!is_array($existingImages)) {
            $existingImages = [];
        }

        if ($hasNewImageUpload) {
            $data['images'] = array_values(array_unique(array_merge($storedImages, $existingImages)));
            $data['image'] = $data['images'][0];
        } elseif ($request->has('existing_images')) {
            $data['images'] = array_values(array_unique($existingImages));
            if (!empty($data['images']) && empty($data['image'])) {
                $data['image'] = $data['images'][0];
            }
        }
        \App\Services\MediaUploadService::assertOwnedImageReferences(
            array_merge([$data['image'] ?? null], $data['images'] ?? []),
            $user ? (int) $user->id : null,
            array_merge(
                [$item->image],
                is_array($item->images) ? $item->images : []
            )
        );

        // Handle video upload
        if ($request->hasFile('video')) {
            try {
                $file = $request->file('video');
                $path = $file->store('attractions/videos', 'public');
                $data['video'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store video file: ' . $e->getMessage()], 400);
            }
        }
        \App\Services\MediaUploadService::assertOwnedVideoReferences(
            [$data['video'] ?? null],
            $user ? (int) $user->id : null,
            [$item->video]
        );

        $item->update($data);

        return response()->json($item->load('creator:id,name,role'));
    }

    /**
     * Remove the specified resource from storage.
     * - Admin can delete any attraction.
     * - Resort can only delete their own attractions.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(Request $request, $id)
    {
        $item = \App\Models\Attraction::find($id);
        if (!$item) {
            return response()->json(['message' => 'Attraction already removed or not found'], 200);
        }

        $user = $request->user();

        // Verify ownership before allowing deletion
        if (!$this->verifyOwnership($item, $user)) {
            return response()->json([
                'error' => 'You can only delete your own attractions.'
            ], 403);
        }

        $item->delete();

        return response()->json(['message' => 'Attraction deleted successfully']);
    }

    /**
     * Verify ownership of an attraction.
     * - Admin CANNOT modify attractions owned by resort (view-only).
     * - Resort owners can only modify their own attractions.
     * - Attractions with null user_id can be modified by admin only.
     */
    private function verifyOwnership(\App\Models\Attraction $attraction, $user): bool
    {
        if (!$user) {
            return false;
        }

        // Admin can modify and delete any attraction
        if ($user->role === 'admin') {
            return true;
        }
        
        // Resort owners can only modify their own attractions
        return (int) $attraction->user_id === (int) $user->id;
    }
}
