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
        $user = $request->user();
        
        // Admin sees all attractions
        if ($user && $user->role === 'admin') {
            $query = \App\Models\Attraction::with('creator:id,name,role');
        }
        // Resort owners see only their attractions
        elseif ($user && $user->role === 'resort') {
            $query = \App\Models\Attraction::where('user_id', $user->id);
        }
        // Public/Tourists see all attractions
        else {
            $query = \App\Models\Attraction::query();
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

        // Attractions do not support date filters

        return response()->json($query->get());
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

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     * Saves user_id automatically from the authenticated user.
     * Handles image upload (max 5MB, validate image types).
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
            'image' => 'nullable|file|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            'description' => 'nullable|string',
            'full_description' => 'nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('attractions', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        }

        $item = \App\Models\Attraction::create(array_merge($data, [
            'user_id' => $request->user() ? $request->user()->id : null,
        ]));

        return response()->json($item->load('creator:id,name,role'), 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $item = \App\Models\Attraction::findOrFail($id);
        return response()->json($item);
    }

    /**
     * Update the specified resource in storage.
     * - Admin can update any attraction.
     * - Resort can only update their own attractions.
     * Handles image upload (max 5MB, validate image types).
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
            'image' => 'sometimes|nullable|file|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            'description' => 'sometimes|nullable|string',
            'full_description' => 'sometimes|nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('attractions', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        }

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
        $item = \App\Models\Attraction::findOrFail($id);
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
        // Admin can only modify attractions with null user_id (admin-created attractions)
        if ($user->role === 'admin') {
            return $attraction->user_id === null;
        }
        
        // Resort owners can only modify their own attractions
        return $attraction->user_id === $user->id;
    }
}
