<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResortRoom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResortRoomController extends Controller
{
    /**
     * List all rooms for the authenticated resort owner.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $rooms = ResortRoom::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($room) => $this->sanitizeRoomImagePayload($room));

        return response()->json($rooms);
    }

    /**
     * List all available rooms for a specific resort (public).
     */
    public function publicIndex(int $userId)
    {
        $rooms = ResortRoom::where('user_id', $userId)
            ->where('is_available', true)
            ->orderBy('price_per_night', 'asc')
            ->get()
            ->map(fn ($room) => $this->sanitizeRoomImagePayload($room));

        return response()->json($rooms);
    }

    /**
     * Create a new room.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'type'           => 'nullable|string|max:100',
            'price_per_night'=> 'nullable|numeric',
            'capacity'       => 'nullable|integer|min:1',
            'description'    => 'nullable|string',
            'image'          => 'nullable',
            'images'         => 'nullable',
            'is_available'   => 'nullable|boolean',
        ]);

        $data['price_per_night'] = !empty($data['price_per_night']) ? floatval($data['price_per_night']) : 0;

        $imagePaths = [];

        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('resort-rooms', 'public');
                    $imagePaths[] = '/storage/' . $path;
                }
            }
        }

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $path = $image->store('resort-rooms', 'public');
            $singlePath = '/storage/' . $path;
            $data['image'] = $singlePath;
        } elseif (!empty($imagePaths)) {
            $data['image'] = $imagePaths[0];
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
        }

        if (!empty($imagePaths)) {
            $data['images'] = array_values(array_unique(array_filter($imagePaths)));
        }

        $data['user_id'] = $user->id;
        $data['is_available'] = $data['is_available'] ?? true;

        $room = ResortRoom::create($data);

        return response()->json($this->sanitizeRoomImagePayload($room), 201);
    }

    /**
     * Update a room.
     */
    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $room = ResortRoom::where('id', $id)->where('user_id', $user->id)->firstOrFail();

        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'type'           => 'nullable|string|max:100',
            'price_per_night'=> 'nullable|numeric',
            'capacity'       => 'nullable|integer|min:1',
            'description'    => 'nullable|string',
            'image'          => 'nullable',
            'images'         => 'nullable',
            'is_available'   => 'nullable|boolean',
        ]);

        $data['price_per_night'] = !empty($data['price_per_night']) ? floatval($data['price_per_night']) : 0;

        $imagePaths = [];
        $hasNewFileUpload = false;

        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('resort-rooms', 'public');
                    $imagePaths[] = '/storage/' . $path;
                    $hasNewFileUpload = true;
                }
            }
        }

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $path = $image->store('resort-rooms', 'public');
            $singlePath = '/storage/' . $path;
            $imagePaths[] = $singlePath;
            $data['image'] = $singlePath;
            $hasNewFileUpload = true;
        }

        // Check if existing_images passed
        if ($request->has('existing_images')) {
            $existing = $request->input('existing_images');
            $existingArr = [];
            if (is_string($existing)) {
                try {
                    $parsed = json_decode($existing, true);
                    if (is_array($parsed)) $existingArr = $parsed;
                    else $existingArr = [$existing];
                } catch (\Throwable $e) {
                    $existingArr = [$existing];
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
        }

        if (!empty($imagePaths)) {
            $imagePaths = array_values(array_unique(array_filter($imagePaths)));
            $data['images'] = $imagePaths;
            if (empty($data['image'])) {
                $data['image'] = $imagePaths[0];
            }
        }

        $room->update($data);

        return response()->json($this->sanitizeRoomImagePayload($room));
    }

    /**
     * Delete a room.
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $query = ResortRoom::where('id', $id);
        if ($user && $user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }
        $room = $query->firstOrFail();

        $allImages = is_array($room->images) ? $room->images : [];
        if ($room->image && !in_array($room->image, $allImages)) {
            $allImages[] = $room->image;
        }
        foreach ($allImages as $img) {
            if (is_string($img)) {
                $path = str_replace('/storage/', '', $img);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted']);
    }

    private function sanitizeRoomImagePayload(ResortRoom $room): array
    {
        $payload = $room->toArray();
        $cover = $payload['image'] ?? null;
        $gallery = $payload['images'] ?? [];

        if (is_string($gallery)) {
            $decoded = json_decode($gallery, true);
            $gallery = is_array($decoded) ? $decoded : [];
        }

        $uniqueImages = [];
        $seenBasenames = [];
        $galleryImages = is_array($gallery) ? $gallery : [];
        $candidates = count($galleryImages) > 0 ? $galleryImages : [$cover];
        foreach ($candidates as $image) {
            if (!is_string($image) || trim($image) === '') {
                continue;
            }

            $image = trim($image);
            $path = parse_url($image, PHP_URL_PATH);
            $path = is_string($path) ? $path : $image;
            $basename = strtolower(urldecode(pathinfo($path, PATHINFO_BASENAME)));
            if ($basename === '' || isset($seenBasenames[$basename])) {
                continue;
            }

            $seenBasenames[$basename] = true;
            $uniqueImages[] = $image;
        }

        if (!$uniqueImages && is_string($cover) && trim($cover) !== '') {
            $uniqueImages[] = trim($cover);
        }

        $payload['image'] = $uniqueImages[0] ?? $cover;
        $payload['images'] = array_values($uniqueImages);

        return $payload;
    }
}
