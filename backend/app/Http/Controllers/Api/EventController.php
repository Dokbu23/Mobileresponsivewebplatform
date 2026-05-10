<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /**
     * Display a listing of events.
     * - Admin: all events with creator info
     * - Enterprise/Resort: only events where user_id = authenticated user id
     * - Tourist/Public: all events (public view)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Admin sees all events
        if ($user && $user->role === 'admin') {
            $query = \App\Models\Event::with('creator:id,name,role');
        }
        // Business owners see only their events
        elseif ($user && in_array($user->role, ['enterprise', 'resort'])) {
            $query = \App\Models\Event::where('user_id', $user->id);
        }
        // Tourists/Public see all events
        else {
            $query = \App\Models\Event::query();
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

        return response()->json($query->orderBy('date', 'asc')->get());
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

        return response()->json($query->orderBy('date', 'asc')->get());
    }

    /**
     * Store a new event.
     * Saves user_id automatically from the authenticated user.
     * Handles image upload (max 5MB, validate image types).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'location'         => 'nullable|string|max:255',
            'category'         => 'nullable|string|max:255',
            'image'            => 'nullable|file|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            'date'             => 'nullable|date',
            'time'             => 'nullable|string|max:255',
            'capacity'         => 'nullable|string|max:255',
            'description'      => 'nullable|string',
            'full_description' => 'nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('events', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        }

        $item = \App\Models\Event::create(array_merge($data, [
            'user_id' => $request->user() ? $request->user()->id : null,
        ]));

        return response()->json($item->load('creator:id,name,role'), 201);
    }

    /**
     * Show a single event.
     */
    public function show(int $id)
    {
        $item = \App\Models\Event::with('creator:id,name,role')->findOrFail($id);
        return response()->json($item);
    }

    /**
     * Update an event.
     * - Admin can update any event.
     * - Enterprise/Resort can only update their own events.
     * Handles image upload (max 5MB, validate image types).
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
            'image'            => 'sometimes|nullable|file|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            'date'             => 'sometimes|nullable|date',
            'time'             => 'sometimes|nullable|string|max:255',
            'capacity'         => 'sometimes|nullable|string|max:255',
            'description'      => 'sometimes|nullable|string',
            'full_description' => 'sometimes|nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('events', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        }

        $item->update($data);

        return response()->json($item->load('creator:id,name,role'));
    }

    /**
     * Delete an event.
     * - Admin can delete any event.
     * - Enterprise/Resort can only delete their own events.
     */
    public function destroy(Request $request, int $id)
    {
        $item = \App\Models\Event::findOrFail($id);
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
        // Admin can modify their own events or admin-created events (null owner)
        if ($user->role === 'admin') {
            if ($event->user_id === null) {
                return true;
            }

            return (int) $event->user_id === (int) $user->id;
        }
        
        // Business owners can only modify their own events
        return $event->user_id === $user->id;
    }
}
