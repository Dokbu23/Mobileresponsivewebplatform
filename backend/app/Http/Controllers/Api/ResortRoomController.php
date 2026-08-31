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
            'images.*'       => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'is_available'   => 'nullable|boolean',
        ]);

        $imagePaths = [];

        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs('resort-rooms', $filename, 'public');
                    $imagePaths[] = '/storage/' . $path;
                }
            }
        }

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $path = $image->storeAs('resort-rooms', $filename, 'public');
            $singlePath = '/storage/' . $path;
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
            'images.*'       => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'is_available'   => 'nullable|boolean',
        ]);

        $imagePaths = [];

        // Check if existing_images passed
        if ($request->has('existing_images')) {
            $existing = $request->input('existing_images');
            if (is_string($existing)) {
                try {
                    $parsed = json_decode($existing, true);
                    if (is_array($parsed)) $imagePaths = $parsed;
                    else $imagePaths = [$existing];
                } catch (\Throwable $e) {
                    $imagePaths = [$existing];
                }
            } elseif (is_array($existing)) {
                $imagePaths = $existing;
            }
        }

        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs('resort-rooms', $filename, 'public');
                    $imagePaths[] = '/storage/' . $path;
                }
            }
        }

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $path = $image->storeAs('resort-rooms', $filename, 'public');
            $singlePath = '/storage/' . $path;
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
