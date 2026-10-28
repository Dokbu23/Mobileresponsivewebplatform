<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /**
     * Display a listing of events.
     * - All viewers: all eligible published events
     */
    public function index(Request $request)
    {
        try {
            // This is the shared Events listing, not the owner-scoped /events/my
            // management query. Never apply the authenticated user's identity or
            // role here: guests and every account type must see the same events.
            $query = \App\Models\Event::withoutGlobalScopes()
                ->with('creator:id,name,role');

            if (\Illuminate\Support\Facades\Schema::hasColumn('events', 'status')) {
                $query->where(function($q) {
                    $q->whereIn('status', ['approved', 'published'])
                      ->orWhereNull('status');
                });
            }

            if (\Illuminate\Support\Facades\Schema::hasColumn('events', 'archived_at')) {
                $query->whereNull('archived_at');
            }

            if ($request->has('search') && $request->input('search') !== '') {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            if ($request->has('barangay') && $request->input('barangay') !== '') {
                $query->where('location', $request->input('barangay'));
            }

            if ($request->has('month') && $request->input('month') !== '') {
                $query->whereMonth('date', $request->input('month'));
            }

            if ($request->has('year') && $request->input('year') !== '') {
                $query->whereYear('date', $request->input('year'));
            }

            $events = $query->orderBy('date', 'asc')->get();
            $events->each(fn ($event) => $this->normalizeImages($event));

            return response()->json($events);
        } catch (\Throwable $e) {
            \Log::error('Event index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Get only the events created by the authenticated user.
     * Used by enterprise/resort dashboard to show "my events".
     */
    public function myEvents(Request $request)
    {
        $user = $request->user();

        $query = \App\Models\Event::where('user_id', $user->id);

        if ($request->has('search') && $request->input('search') !== '') {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $events = $query->orderBy('date', 'asc')->get();
        $events->each(fn ($event) => $this->normalizeImages($event));

        return response()->json($events);
    }

    /**
     * Store a new event.
     * Saves user_id automatically from the authenticated user.
     * Handles validated image uploads using the configured media size limit.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'location'         => 'nullable|string|max:255',
            'category'         => 'nullable|string|max:255',
            'image'            => $request->hasFile('image')
                ? 'nullable|file|mimes:jpg,jpeg,png,gif,webp,avif,heic,heif|max:' . config('uploads.max_image_size_kb')
                : 'nullable|string|max:2048',
            'images'           => $request->hasFile('images') ? 'nullable' : 'nullable|array|max:10',
            'images.*'         => $request->hasFile('images')
                ? 'nullable|file|mimes:jpg,jpeg,png,gif,webp,avif,heic,heif|max:' . config('uploads.max_image_size_kb')
                : 'nullable|string|max:2048',
            'date'             => 'nullable|string|max:255',
            'time'             => 'nullable|string|max:255',
            'capacity'         => 'nullable|string|max:255',
            'description'      => 'nullable|string',
            'full_description' => 'nullable|string',
            'virtual_tour_url' => 'nullable|url|max:2048',
            'video'            => $request->hasFile('video')
                ? 'nullable|file|mimes:mp4,mov,webm,ogv,ogg,mpeg,mpg,mkv|max:' . config('uploads.max_video_size_kb')
                : 'nullable|string|max:2048',
        ]);

        $this->assertCombinedStagedImageSize($request);
        $storedImages = [];

        // Handle multiple gallery image uploads.
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('events', 'public');
                $storedImages[] = '/storage/' . $path;
            }
        }

        if (!$request->hasFile('images') && is_array($data['images'] ?? null)) {
            foreach ($data['images'] as $imagePath) {
                if (is_string($imagePath)) {
                    $this->assertOwnedOriginalOrExistingUrl($imagePath, $request);
                    $storedImages[] = $imagePath;
                }
            }
        }

        // Handle the primary image upload or URL.
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('events', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
            array_unshift($storedImages, $data['image']);
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $this->assertOwnedOriginalOrExistingUrl($data['image'], $request);
            array_unshift($storedImages, $data['image']);
        }

        if (!empty($storedImages)) {
            $data['images'] = array_values(array_unique($storedImages));
            $data['image'] = $data['image'] ?? $data['images'][0];
        }

        if ($request->hasFile('video')) {
            $data['video'] = '/storage/' . $request->file('video')->store('events/videos', 'public');
        }
        \App\Services\MediaUploadService::assertOwnedVideoReferences(
            [$data['video'] ?? null],
            $request->user() ? (int) $request->user()->id : null
        );

        $item = \App\Models\Event::create(array_merge($data, [
            'user_id' => $request->user() ? $request->user()->id : null,
            // Admin-created events are already approved for public visibility.
            'status' => 'approved',
            'archived_at' => null,
        ]));

        $item = $item->load('creator:id,name,role');
        $this->normalizeImages($item);

        return response()->json($item, 201);
    }

    /**
     * Show a single event.
     */
    public function show(int $id)
    {
        $item = \App\Models\Event::with('creator:id,name,role')->findOrFail($id);
        $this->normalizeImages($item);

        return response()->json($item);
    }

    /**
     * Update an event.
     * - Admin can update any event.
     * - Enterprise/Resort can only update their own events.
     * Handles validated image uploads using the configured media size limit.
     */
    public function update(Request $request, int $id)
    {
        $item = \App\Models\Event::findOrFail($id);
        $user = $request->user();

        // Verify ownership before allowing modifications
        if (!$this->verifyOwnership($item, $user)) {
            return response()->json([
                'error' => 'You can only edit your own events.'
            ], 403);
        }

        $data = $request->validate([
            'name'             => 'sometimes|required|string|max:255',
            'location'         => 'sometimes|nullable|string|max:255',
            'category'         => 'sometimes|nullable|string|max:255',
            'image'            => $request->hasFile('image')
                ? 'sometimes|nullable|file|mimes:jpg,jpeg,png,gif,webp,avif,heic,heif|max:' . config('uploads.max_image_size_kb')
                : 'sometimes|nullable|string|max:2048',
            'images'           => $request->hasFile('images') ? 'sometimes|nullable' : 'sometimes|nullable|array|max:10',
            'images.*'         => $request->hasFile('images')
                ? 'nullable|file|mimes:jpg,jpeg,png,gif,webp,avif,heic,heif|max:' . config('uploads.max_image_size_kb')
                : 'nullable|string|max:2048',
            'date'             => 'sometimes|nullable|string|max:255',
            'time'             => 'sometimes|nullable|string|max:255',
            'capacity'         => 'sometimes|nullable|string|max:255',
            'description'      => 'sometimes|nullable|string',
            'full_description' => 'sometimes|nullable|string',
            'virtual_tour_url' => 'sometimes|nullable|url|max:2048',
            'video'            => $request->hasFile('video')
                ? 'sometimes|nullable|file|mimes:mp4,mov,webm,ogv,ogg,mpeg,mpg,mkv|max:' . config('uploads.max_video_size_kb')
                : 'sometimes|nullable|string|max:2048',
        ]);

        $this->assertCombinedStagedImageSize($request);
        $storedImages = [];
        $hasNewImageUpload = false;

        // Handle new gallery image uploads.
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('events', 'public');
                $storedImages[] = '/storage/' . $path;
            }
            $hasNewImageUpload = !empty($storedImages);
        }

        if (!$request->hasFile('images') && is_array($data['images'] ?? null)) {
            foreach ($data['images'] as $imagePath) {
                if (is_string($imagePath)) {
                    $this->assertOwnedOriginalOrExistingUrl($imagePath, $request);
                    $storedImages[] = $imagePath;
                }
            }
            $hasNewImageUpload = !empty($storedImages);
        }

        // Handle the primary image upload or URL.
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('events', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
            array_unshift($storedImages, $data['image']);
            $hasNewImageUpload = true;
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $this->assertOwnedOriginalOrExistingUrl($data['image'], $request);
            array_unshift($storedImages, $data['image']);
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
            $data['image'] = $data['image'] ?? $data['images'][0];
        } elseif ($request->has('existing_images')) {
            $data['images'] = array_values(array_unique($existingImages));
            if (!empty($data['images']) && empty($data['image'])) {
                $data['image'] = $data['images'][0];
            }
        }

        if ($request->hasFile('video')) {
            $data['video'] = '/storage/' . $request->file('video')->store('events/videos', 'public');
        }
        \App\Services\MediaUploadService::assertOwnedVideoReferences(
            [$data['video'] ?? null],
            $user ? (int) $user->id : null,
            [$item->video]
        );

        $item->update($data);

        $item = $item->load('creator:id,name,role');
        $this->normalizeImages($item);

        return response()->json($item);
    }

    private function normalizeImages(\App\Models\Event $event): void
    {
        $cover = is_string($event->image) ? $event->image : '';
        $images = $event->images;
        if (is_string($images)) {
            $images = json_decode($images, true);
        }
        $images = is_array($images) ? $images : [];
        $images = array_values(array_filter($images, fn ($image) => is_string($image) && trim($image) !== ''));
        if (empty($images) && is_string($event->image) && trim($event->image) !== '') {
            $images[] = $event->image;
        }
        $event->setAttribute('images', $this->filterGalleryAgainstCover($images, $cover));
    }

    private function filterGalleryAgainstCover(array $images, string $cover): array
    {
        $coverFilename = $this->imageFilename($cover);
        $seen = [];

        return array_values(array_filter($images, function ($image) use ($coverFilename, &$seen) {
            $filename = $this->imageFilename($image);
            if ($filename === '' || $filename === $coverFilename || isset($seen[$filename])) {
                return false;
            }
            $seen[$filename] = true;
            return true;
        }));
    }

    private function imageFilename(?string $image): string
    {
        if (!is_string($image) || trim($image) === '') {
            return '';
        }

        $path = parse_url(trim($image), PHP_URL_PATH);
        $path = is_string($path) ? $path : trim($image);
        return strtolower(urldecode(basename(str_replace('\\', '/', $path))));
    }

    private function assertOwnedOriginalOrExistingUrl(string $imagePath, Request $request): void
    {
        if (strpos($imagePath, '/storage/originals/') !== 0) {
            return;
        }

        $user = $request->user();
        $relativePath = substr($imagePath, strlen('/storage/'));
        $ownedPrefix = 'originals/' . ($user ? $user->id : 0) . '/';
        if (!$user || strpos($relativePath, $ownedPrefix) !== 0
            || strpos($relativePath, '..') !== false
            || !\Illuminate\Support\Facades\Storage::disk('public')->exists($relativePath)) {
            abort(422, 'The uploaded image is invalid or does not belong to this account.');
        }
    }

    private function assertCombinedStagedImageSize(Request $request): void
    {
        $paths = [];
        $image = $request->input('image');
        if (is_string($image)) {
            $paths[] = $image;
        }

        $images = $request->input('images', []);
        if (is_array($images)) {
            foreach ($images as $path) {
                if (is_string($path)) {
                    $paths[] = $path;
                }
            }
        }

        $totalBytes = 0;
        foreach (array_unique($paths) as $path) {
            if (strpos($path, '/storage/originals/') !== 0) {
                continue;
            }

            $this->assertOwnedOriginalOrExistingUrl($path, $request);
            $relativePath = substr($path, strlen('/storage/'));
            $mimeType = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($relativePath);
            if (!is_string($mimeType) || strpos($mimeType, 'image/') !== 0) {
                abort(422, 'An event gallery upload is not a valid image.');
            }
            $totalBytes += \Illuminate\Support\Facades\Storage::disk('public')->size($relativePath);
        }

        if ($totalBytes > config('uploads.max_combined_image_size_bytes')) {
            abort(422, 'The combined image size exceeds the 50 MiB limit.');
        }
    }

    /**
     * Delete an event.
     * - Admin can delete any event.
     * - Enterprise/Resort can only delete their own events.
     */
    public function destroy(Request $request, int $id)
    {
        $item = \App\Models\Event::find($id);
        if (!$item) {
            return response()->json(['message' => 'Event already removed or not found'], 200);
        }

        $user = $request->user();

        // Verify ownership before allowing deletion
        if (!$this->verifyOwnership($item, $user)) {
            return response()->json([
                'error' => 'You can only delete your own events.'
            ], 403);
        }

        $item->delete();

        return response()->json(['message' => 'Event deleted successfully']);
    }

    /**
     * Verify ownership of an event.
     * - Admin can modify events they created (user_id = admin id).
     * - Admin cannot modify events owned by enterprise/resort.
     * - Business owners can only modify their own events.
     * - Events with null user_id can be modified by admin only.
     */
    private function verifyOwnership(\App\Models\Event $event, ?\App\Models\User $user): bool
    {
        if (!$user) {
            return false;
        }

        // Admin can modify and delete any event
        if ($user->role === 'admin') {
            return true;
        }
        
        // Business owners can only modify their own events
        return (int) $event->user_id === (int) $user->id;
    }
}
