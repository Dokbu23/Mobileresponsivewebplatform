<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attraction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AdminItineraryController extends Controller
{
    /**
     * Helper to verify admin authorization.
     */
    private function checkAdmin(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return false;
        }
        return true;
    }

    /**
     * Format an Attraction record into a standardized itinerary object.
     */
    private function formatItinerary(Attraction $at, $currentUserId = null)
    {
        $days = [];
        $highlights = [];
        $badge = 'Official Tourism Plan';
        $duration = '2 days';
        $subCategory = 'Travel Itinerary';

        if ($at->full_description) {
            try {
                $parsed = is_string($at->full_description)
                    ? json_decode($at->full_description, true)
                    : $at->full_description;

                if (is_array($parsed)) {
                    if (!empty($parsed['days']) && is_array($parsed['days'])) {
                        $days = $parsed['days'];
                    }
                    if (!empty($parsed['highlights']) && is_array($parsed['highlights'])) {
                        $highlights = $parsed['highlights'];
                    }
                    if (!empty($parsed['badge'])) {
                        $badge = $parsed['badge'];
                    }
                    if (!empty($parsed['duration'])) {
                        $duration = $parsed['duration'];
                    }
                    if (!empty($parsed['category'])) {
                        $subCategory = $parsed['category'];
                    }
                }
            } catch (\Throwable $e) {}
        }

        if (empty($duration)) {
            $count = count($days) ?: 2;
            $duration = $count . ' ' . ($count === 1 ? 'day' : 'days');
        }

        $creator = $at->creator ? [
            'id'    => $at->creator->id,
            'name'  => $at->creator->name,
            'email' => $at->creator->email,
            'role'  => $at->creator->role,
        ] : [
            'id'    => $at->user_id,
            'name'  => 'Mansalay Tourism Admin',
            'email' => null,
            'role'  => 'admin',
        ];

        // Format dates
        $publishedDate = $at->created_at ? $at->created_at->format('M d, Y') : 'Recently';

        // Activities count calculation
        $activitiesCount = 0;
        foreach ($days as $dayItem) {
            if (!empty($dayItem['activities']) && is_array($dayItem['activities'])) {
                $activitiesCount += count($dayItem['activities']);
            }
        }

        $status = $at->status ?: 'published';
        // Normalize 'approved' to 'published' for itineraries
        if ($status === 'approved') {
            $status = 'published';
        }

        return [
            'id'                => (int) $at->id,
            'title'             => $at->name,
            'name'              => $at->name,
            'category'          => $subCategory,
            'main_category'     => $at->category ?: 'Itinerary',
            'duration'          => $duration,
            'days_count'        => count($days) ?: 1,
            'badge'             => $badge,
            'location'          => $at->location ?: 'Mansalay, Oriental Mindoro',
            'description'       => $at->description ?: '',
            'full_description'  => $at->full_description,
            'image'             => $at->image ?: '/assets/mansalay_hero_bg.jpg',
            'images'            => is_array($at->images) ? $at->images : ($at->image ? [$at->image] : []),
            'status'            => $status,
            'archived_at'       => $at->archived_at ? $at->archived_at->toIso8601String() : null,
            'published_date'    => $publishedDate,
            'created_at'        => $at->created_at ? $at->created_at->toIso8601String() : null,
            'updated_at'        => $at->updated_at ? $at->updated_at->toIso8601String() : null,
            'creator'           => $creator,
            'user_id'           => $at->user_id,
            'is_my_itinerary'   => $currentUserId ? ((int)$at->user_id === (int)$currentUserId) : false,
            'days'              => $days,
            'highlights'        => $highlights,
            'activities_count'  => $activitiesCount,
            'schedule_summary'  => (count($days) ?: 1) . ' Days • ' . $activitiesCount . ' Planned Spots',
        ];
    }

    /**
     * GET /api/admin/itineraries
     * List all official itineraries with real database counts, filters, and creator info.
     */
    public function index(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = $request->user();

        // Base query: all attractions categorized as Itinerary or having itinerary in name
        $baseQuery = Attraction::with('creator:id,name,email,role')
            ->where(function ($q) {
                $q->where('category', 'Itinerary')
                  ->orWhere('name', 'like', '%(Itinerary)%');
            });

        // 1. Calculate stats across all itineraries
        $allRecords = (clone $baseQuery)->get();
        $totalCount = $allRecords->count();
        $publishedCount = $allRecords->filter(function ($item) {
            $st = $item->status ?: 'published';
            return $st === 'published' || $st === 'approved';
        })->count();
        $draftCount = $allRecords->filter(function ($item) {
            return $item->status === 'draft';
        })->count();
        $archivedCount = $allRecords->filter(function ($item) {
            return $item->status === 'archived';
        })->count();
        $myCount = $allRecords->filter(function ($item) use ($user) {
            return (int) $item->user_id === (int) $user->id;
        })->count();

        // 2. Filter query
        $query = clone $baseQuery;

        // Search filter (title, description, location)
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhere('location', 'LIKE', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            if ($status === 'published') {
                $query->where(function ($q) {
                    $q->where('status', 'published')
                      ->orWhere('status', 'approved')
                      ->orWhereNull('status');
                });
            } else {
                $query->where('status', $status);
            }
        }

        // My Itineraries filter (backend enforcement)
        if ($request->boolean('my') || $request->input('filter') === 'my') {
            $query->where('user_id', $user->id);
        }

        // Creator ID filter if explicitly requested
        if ($request->filled('creator_id')) {
            $query->where('user_id', $request->input('creator_id'));
        }

        // Duration filter
        if ($request->filled('duration') && $request->input('duration') !== 'all') {
            $durationFilter = $request->input('duration');
            if ($durationFilter === '1') {
                $query->where('full_description', 'LIKE', '%"duration":"1 day%');
            } elseif ($durationFilter === '2') {
                $query->where('full_description', 'LIKE', '%"duration":"2 days%');
            } elseif ($durationFilter === '3') {
                $query->where('full_description', 'LIKE', '%"duration":"3 days%');
            } elseif ($durationFilter === '4+') {
                $query->where(function ($q) {
                    $q->where('full_description', 'LIKE', '%"duration":"4 days%')
                      ->orWhere('full_description', 'LIKE', '%"duration":"5 days%')
                      ->orWhere('full_description', 'LIKE', '%"duration":"6 days%')
                      ->orWhere('full_description', 'LIKE', '%"duration":"7 days%');
                });
            }
        }

        $items = $query->orderBy('created_at', 'desc')->orderBy('id', 'desc')->get();

        $formatted = $items->map(function ($it) use ($user) {
            return $this->formatItinerary($it, $user->id);
        });

        return response()->json([
            'itineraries' => $formatted,
            'stats' => [
                'total'       => $totalCount,
                'published'   => $publishedCount,
                'draft'       => $draftCount,
                'archived'    => $archivedCount,
                'my_count'    => $myCount,
            ],
            'current_user_id' => $user->id,
            'current_user_name' => $user->name,
        ]);
    }

    /**
     * GET /api/public/itineraries
     * Public listing of official approved itineraries.
     */
    public function publicIndex(Request $request)
    {
        $query = Attraction::with('creator:id,name,email,role')
            ->where(function ($q) {
                $q->where('category', 'Itinerary')
                  ->orWhere('name', 'like', '%(Itinerary)%')
                  ->orWhere('full_description', 'like', '%"days":%');
            })
            ->where(function ($q) {
                $q->whereIn('status', ['approved', 'published'])
                  ->orWhereNull('status');
            });

        $items = $query->orderBy('created_at', 'desc')->orderBy('id', 'desc')->get();
        $formatted = $items->map(function ($it) {
            return $this->formatItinerary($it);
        });

        return response()->json($formatted);
    }

    /**
     * GET /api/public/itineraries/{id}
     * Public view of a single official approved itinerary.
     */
    public function publicShow(Request $request, $id)
    {
        $item = Attraction::with('creator:id,name,email,role')
            ->where(function ($q) {
                $q->whereIn('status', ['approved', 'published'])
                  ->orWhereNull('status');
            })
            ->findOrFail($id);

        return response()->json($this->formatItinerary($item));
    }


    /**
     * GET /api/admin/itineraries/{id}
     * Get a single official itinerary with all details.
     */
    public function show(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $item = Attraction::with('creator:id,name,email,role')->findOrFail($id);
        return response()->json($this->formatItinerary($item, $request->user()->id));
    }

    /**
     * POST /api/admin/itineraries
     * Create a new official itinerary.
     */
    public function store(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = $request->user();

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'category'    => 'nullable|string|max:255',
            'duration'    => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'location'    => 'nullable|string|max:255',
            'status'      => 'nullable|string|in:published,draft,archived,approved',
            'image'       => 'nullable',
            'days'        => 'nullable',
            'highlights'  => 'nullable',
        ]);

        // Process days array / json string
        $days = [];
        if ($request->has('days')) {
            $rawDays = $request->input('days');
            if (is_string($rawDays)) {
                $days = json_decode($rawDays, true) ?: [];
            } elseif (is_array($rawDays)) {
                $days = $rawDays;
            }
        }

        // Process highlights array / json string
        $highlights = [];
        if ($request->has('highlights')) {
            $rawHighlights = $request->input('highlights');
            if (is_string($rawHighlights)) {
                $highlights = json_decode($rawHighlights, true) ?: [];
            } elseif (is_array($rawHighlights)) {
                $highlights = $rawHighlights;
            }
        }

        // Compute duration string if not provided
        $duration = $request->input('duration');
        if (empty($duration)) {
            $dCount = count($days) ?: 2;
            $duration = "{$dCount} days";
        }

        // Image upload handling
        $imagePath = '/assets/mansalay_hero_bg.jpg';
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('attractions', 'public');
                $imagePath = '/storage/' . $path;
            } catch (\Throwable $e) {
                return response()->json(['error' => 'Image upload failed: ' . $e->getMessage()], 400);
            }
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $imagePath = $request->input('image');
        }

        $status = $request->input('status', 'published');
        if ($status === 'approved') {
            $status = 'published';
        }

        $subCategory = $request->input('category', 'Beach & Relaxation');

        // Build structured full_description JSON
        $fullDescription = json_encode([
            'days'        => $days,
            'highlights'  => $highlights,
            'badge'       => 'Official Tourism Plan',
            'duration'    => $duration,
            'category'    => $subCategory,
        ]);

        $attraction = Attraction::create([
            'name'             => $request->input('title'),
            'category'         => 'Itinerary',
            'location'         => $request->input('location', 'Mansalay, Oriental Mindoro'),
            'description'      => $request->input('description', "{$duration} official travel itinerary curated by Mansalay Tourism Office."),
            'full_description' => $fullDescription,
            'image'            => $imagePath,
            'status'           => $status,
            'user_id'          => $user->id,
            'archived_at'      => $status === 'archived' ? now() : null,
        ]);

        $attraction->load('creator:id,name,email,role');

        return response()->json([
            'success'   => true,
            'message'   => $status === 'draft' ? 'Itinerary draft saved successfully.' : 'Official Itinerary published successfully!',
            'itinerary' => $this->formatItinerary($attraction, $user->id),
        ], 201);
    }

    /**
     * PUT/POST /api/admin/itineraries/{id}
     * Update an existing official itinerary.
     */
    public function update(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = $request->user();
        $attraction = Attraction::findOrFail($id);

        $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'category'    => 'sometimes|nullable|string|max:255',
            'duration'    => 'sometimes|nullable|string|max:100',
            'description' => 'sometimes|nullable|string',
            'location'    => 'sometimes|nullable|string|max:255',
            'status'      => 'sometimes|nullable|string|in:published,draft,archived,approved',
            'image'       => 'sometimes|nullable',
            'days'        => 'sometimes|nullable',
            'highlights'  => 'sometimes|nullable',
        ]);

        // Process days
        $days = null;
        if ($request->has('days')) {
            $rawDays = $request->input('days');
            if (is_string($rawDays)) {
                $days = json_decode($rawDays, true) ?: [];
            } elseif (is_array($rawDays)) {
                $days = $rawDays;
            }
        }

        // Process highlights
        $highlights = null;
        if ($request->has('highlights')) {
            $rawHighlights = $request->input('highlights');
            if (is_string($rawHighlights)) {
                $highlights = json_decode($rawHighlights, true) ?: [];
            } elseif (is_array($rawHighlights)) {
                $highlights = $rawHighlights;
            }
        }

        // Retrieve existing full_description parsed data
        $existingParsed = [];
        if ($attraction->full_description) {
            try {
                $existingParsed = is_string($attraction->full_description)
                    ? json_decode($attraction->full_description, true)
                    : $attraction->full_description;
                if (!is_array($existingParsed)) $existingParsed = [];
            } catch (\Throwable $e) {}
        }

        $finalDays = $days !== null ? $days : ($existingParsed['days'] ?? []);
        $finalHighlights = $highlights !== null ? $highlights : ($existingParsed['highlights'] ?? []);
        $finalDuration = $request->input('duration', $existingParsed['duration'] ?? ((count($finalDays) ?: 2) . ' days'));
        $finalSubCategory = $request->input('category', $existingParsed['category'] ?? 'Travel Itinerary');

        $fullDescription = json_encode([
            'days'        => $finalDays,
            'highlights'  => $finalHighlights,
            'badge'       => 'Official Tourism Plan',
            'duration'    => $finalDuration,
            'category'    => $finalSubCategory,
        ]);

        $updateData = [
            'full_description' => $fullDescription,
        ];

        if ($request->has('title')) {
            $updateData['name'] = $request->input('title');
        }
        if ($request->has('description')) {
            $updateData['description'] = $request->input('description');
        }
        if ($request->has('location')) {
            $updateData['location'] = $request->input('location');
        }

        if ($request->has('status')) {
            $status = $request->input('status');
            if ($status === 'approved') $status = 'published';
            $updateData['status'] = $status;
            if ($status === 'archived') {
                $updateData['archived_at'] = now();
            } else {
                $updateData['archived_at'] = null;
            }
        }

        // Handle image upload
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('attractions', 'public');
                $updateData['image'] = '/storage/' . $path;
            } catch (\Throwable $e) {
                return response()->json(['error' => 'Image upload failed: ' . $e->getMessage()], 400);
            }
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $updateData['image'] = $request->input('image');
        }

        // If creator was previously null, assign authenticated admin
        if (!$attraction->user_id) {
            $updateData['user_id'] = $user->id;
        }

        $attraction->update($updateData);
        $attraction->load('creator:id,name,email,role');

        return response()->json([
            'success'   => true,
            'message'   => 'Itinerary updated successfully!',
            'itinerary' => $this->formatItinerary($attraction->fresh(), $user->id),
        ]);
    }

    /**
     * DELETE /api/admin/itineraries/{id}
     * Permanently delete an official itinerary.
     */
    public function destroy(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $attraction = Attraction::findOrFail($id);
        $title = $attraction->name;
        $attraction->delete();

        return response()->json([
            'success' => true,
            'message' => "Itinerary \"{$title}\" has been deleted successfully.",
        ]);
    }

    /**
     * PATCH /api/admin/itineraries/{id}/status
     * Quick toggle / update publication status (published, draft, archived).
     */
    public function updateStatus(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = $request->user();
        $attraction = Attraction::findOrFail($id);

        $request->validate([
            'status' => 'required|string|in:published,draft,archived,approved',
        ]);

        $status = $request->input('status');
        if ($status === 'approved') $status = 'published';

        $attraction->previous_status = $attraction->status;
        $attraction->status = $status;
        $attraction->archived_at = ($status === 'archived') ? now() : null;
        $attraction->save();

        return response()->json([
            'success'   => true,
            'message'   => "Itinerary status changed to \"{$status}\".",
            'itinerary' => $this->formatItinerary($attraction->fresh(), $user->id),
        ]);
    }
}
