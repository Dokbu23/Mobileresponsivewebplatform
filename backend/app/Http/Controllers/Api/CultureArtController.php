<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CultureArt;
use Illuminate\Support\Facades\Log;

class CultureArtController extends Controller
{
    /**
     * Display a listing of culture & arts items.
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            if ($user && $user->role === 'admin') {
                $query = CultureArt::with('creator:id,name,role');
            } else {
                $query = CultureArt::where('status', 'published');
            }

            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%")
                      ->orWhere('full_description', 'LIKE', "%{$search}%")
                      ->orWhere('artist_name', 'LIKE', "%{$search}%");
                });
            }

            if ($request->filled('category') && $request->input('category') !== 'All') {
                $query->where('category', $request->input('category'));
            }

            if ($request->filled('location')) {
                $query->where('location', $request->input('location'));
            }

            return response()->json($query->orderBy('id', 'desc')->get());
        } catch (\Throwable $e) {
            Log::error('CultureArt index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Store a newly created culture & art post (Admin only).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'category'         => 'nullable|string|max:255',
            'artist_name'      => 'nullable|string|max:255',
            'period_era'       => 'nullable|string|max:255',
            'location'         => 'nullable|string|max:255',
            'image'            => 'nullable',
            'video'            => 'nullable',
            'video_url'        => 'nullable|string',
            'description'      => 'nullable|string',
            'full_description' => 'nullable|string',
            'status'           => 'nullable|string|in:published,archived,draft',
            'is_featured'      => 'nullable|boolean',
        ]);

        if ($request->filled('video_url')) {
            $data['video'] = $request->input('video_url');
        }

        // Single cover image file upload
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('culture_arts', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store image: ' . $e->getMessage()], 400);
            }
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = $request->input('image');
        }

        // Multi-image gallery upload
        $imagesList = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $imgFile) {
                try {
                    $path = $imgFile->store('culture_arts/gallery', 'public');
                    $imagesList[] = '/storage/' . $path;
                } catch (\Exception $e) {
                    Log::warn('Failed to store gallery image: ' . $e->getMessage());
                }
            }
            if (!empty($imagesList)) {
                $data['images'] = $imagesList;
                if (empty($data['image'])) {
                    $data['image'] = $imagesList[0];
                }
            }
        } elseif ($request->filled('images') && is_array($request->input('images'))) {
            $data['images'] = $request->input('images');
        }

        // Video file upload
        if ($request->hasFile('video')) {
            try {
                $file = $request->file('video');
                $path = $file->store('culture_arts/videos', 'public');
                $data['video'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store video: ' . $e->getMessage()], 400);
            }
        }

        $item = CultureArt::create(array_merge($data, [
            'user_id' => $request->user() ? $request->user()->id : null,
            'status'  => $data['status'] ?? 'published',
        ]));

        return response()->json($item->load('creator:id,name,role'), 201);
    }

    /**
     * Display a specific culture & art item and increment view count.
     */
    public function show($id)
    {
        $item = CultureArt::findOrFail($id);
        $item->increment('view_count');
        return response()->json($item->fresh());
    }

    /**
     * Record a view counter increment.
     */
    public function recordView($id)
    {
        $item = CultureArt::find($id);
        if ($item) {
            $item->increment('view_count');
        }
        return response()->json(['success' => true]);
    }

    /**
     * Update an existing culture & art post (Admin only).
     */
    public function update(Request $request, $id)
    {
        $item = CultureArt::findOrFail($id);

        $data = $request->validate([
            'name'             => 'sometimes|required|string|max:255',
            'category'         => 'nullable|string|max:255',
            'artist_name'      => 'nullable|string|max:255',
            'period_era'       => 'nullable|string|max:255',
            'location'         => 'nullable|string|max:255',
            'image'            => 'nullable',
            'video'            => 'nullable',
            'video_url'        => 'nullable|string',
            'description'      => 'nullable|string',
            'full_description' => 'nullable|string',
            'status'           => 'nullable|string|in:published,archived,draft',
            'is_featured'      => 'nullable|boolean',
        ]);

        if ($request->filled('video_url')) {
            $data['video'] = $request->input('video_url');
        }

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $path = $file->store('culture_arts', 'public');
            $data['image'] = '/storage/' . $path;
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $data['image'] = $request->input('image');
        }

        if ($request->hasFile('images')) {
            $imagesList = [];
            foreach ($request->file('images') as $imgFile) {
                $path = $imgFile->store('culture_arts/gallery', 'public');
                $imagesList[] = '/storage/' . $path;
            }
            if (!empty($imagesList)) {
                $data['images'] = $imagesList;
            }
        } elseif ($request->filled('images') && is_array($request->input('images'))) {
            $data['images'] = $request->input('images');
        }

        if ($request->hasFile('video')) {
            $file = $request->file('video');
            $path = $file->store('culture_arts/videos', 'public');
            $data['video'] = '/storage/' . $path;
        }

        $item->update($data);

        return response()->json($item->fresh()->load('creator:id,name,role'));
    }

    /**
     * Delete a culture & art post (Admin only).
     */
    public function destroy($id)
    {
        $item = CultureArt::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Culture & art post deleted successfully.']);
    }
}
