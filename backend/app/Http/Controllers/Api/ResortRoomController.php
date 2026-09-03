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
            ->get();

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
            ->get();

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
            'price_per_night'=> 'required|numeric|min:1',
            'capacity'       => 'nullable|integer|min:1',
            'description'    => 'nullable|string',
            'image'          => 'nullable',
            'images'         => 'nullable',
            'is_available'   => 'nullable|boolean',
        ]);

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
            if (!in_array($singlePath, $imagePaths)) {
                array_unshift($imagePaths, $singlePath);
            }
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

        return response()->json($room, 201);
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
            'price_per_night'=> 'required|numeric|min:1',
            'capacity'       => 'nullable|integer|min:1',
            'description'    => 'nullable|string',
            'image'          => 'nullable',
            'images'         => 'nullable',
            'is_available'   => 'nullable|boolean',
        ]);

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
            if (!in_array($cleanImg, $imagePaths)) {
                array_unshift($imagePaths, $cleanImg);
            }
        }

        if (!empty($imagePaths)) {
            $imagePaths = array_values(array_unique(array_filter($imagePaths)));
            $data['images'] = $imagePaths;
            if (empty($data['image'])) {
                $data['image'] = $imagePaths[0];
            }
        }

        $room->update($data);

        return response()->json($room);
    }

    /**
     * Delete a room.
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $room = ResortRoom::where('id', $id)->where('user_id', $user->id)->firstOrFail();

        if ($room->image) {
            $path = str_replace('/storage/', '', $room->image);
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted']);
    }
}
