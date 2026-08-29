<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EnterprisePost;
use Illuminate\Http\Request;

class EnterprisePostController extends Controller
{
    /**
     * Display a listing of posts.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Purge legacy auto-seeded sample posts if present
        if ($user) {
            EnterprisePost::where('user_id', $user->id)
                ->where(function($q) {
                    $q->where('content', 'like', '%Enjoy breathtaking sunsets%')
                      ->orWhere('content', 'like', '%SUMMER SPECIAL%')
                      ->orWhere('content', 'like', '%Introducing our new Glamping Suites%')
                      ->orWhere('content', 'like', '%Introducing our NEW handwoven baskets%');
                })->delete();
        }

        $query = EnterprisePost::query()->with('user:id,name,store_name,store_logo,resort_name,resort_images');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        } elseif ($user && ($user->role === 'enterprise' || $user->role === 'resort')) {
            $query->where('user_id', $user->id);
        }

        $posts = $query->orderBy('created_at', 'desc')->get();

        return response()->json($posts);
    }

    /**
     * Store a newly created post.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'type'           => 'required|string|max:50',
            'content'        => 'required|string',
            'product_name'   => 'nullable|string|max:255',
            'price'          => 'nullable|string|max:255',
            'category'       => 'nullable|string|max:255',
            'seller_name'    => 'nullable|string|max:255',
            'location'       => 'nullable|string|max:255',
            'business_hours' => 'nullable|string|max:255',
            'stock'          => 'nullable|string|max:255',
            'tags'           => 'nullable',
            'image'          => 'nullable',
        ]);

        if ($request->hasFile('image')) {
            $folder = ($user && $user->role === 'resort') ? 'resort/posts' : 'enterprise/posts';
            $path = $request->file('image')->store($folder, 'public');
            $data['image'] = '/storage/' . $path;
        } elseif ($request->filled('image_url')) {
            $data['image'] = $request->input('image_url');
        }

        if (isset($data['tags']) && is_string($data['tags'])) {
            $decoded = json_decode($data['tags'], true);
            $data['tags'] = is_array($decoded) ? $decoded : array_map('trim', explode(',', $data['tags']));
        }

        $data['user_id'] = $user ? $user->id : null;
        $data['seller_name'] = $data['seller_name'] ?: ($user ? ($user->resort_name ?: ($user->store_name ?: $user->name)) : null);
        $data['likes'] = 0;
        $data['saves'] = 0;

        $post = EnterprisePost::create($data);

        return response()->json($post, 201);
    }

    /**
     * Update an existing post.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $post = EnterprisePost::findOrFail($id);

        if ($user && $user->role !== 'admin' && (int)$post->user_id !== (int)$user->id) {
            return response()->json(['message' => 'Unauthorized to update this post.'], 403);
        }

        $data = $request->validate([
            'type'           => 'nullable|string|max:50',
            'content'        => 'nullable|string',
            'product_name'   => 'nullable|string|max:255',
            'price'          => 'nullable|string|max:255',
            'category'       => 'nullable|string|max:255',
            'seller_name'    => 'nullable|string|max:255',
            'location'       => 'nullable|string|max:255',
            'business_hours' => 'nullable|string|max:255',
            'stock'          => 'nullable|string|max:255',
            'tags'           => 'nullable',
            'image'          => 'nullable',
        ]);

        if ($request->hasFile('image')) {
            $folder = ($user && $user->role === 'resort') ? 'resort/posts' : 'enterprise/posts';
            $path = $request->file('image')->store($folder, 'public');
            $data['image'] = '/storage/' . $path;
        } elseif ($request->filled('image_url')) {
            $data['image'] = $request->input('image_url');
        }

        if (isset($data['tags']) && is_string($data['tags'])) {
            $decoded = json_decode($data['tags'], true);
            $data['tags'] = is_array($decoded) ? $decoded : array_map('trim', explode(',', $data['tags']));
        }

        $post->update(array_filter($data, fn($v) => !is_null($v)));

        return response()->json($post);
    }

    /**
     * Delete a post.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $post = EnterprisePost::findOrFail($id);

        if ($user && $user->role !== 'admin' && (int)$post->user_id !== (int)$user->id) {
            return response()->json(['message' => 'Unauthorized to delete this post.'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted successfully.']);
    }

    /**
     * Like a post.
     */
    public function like($id)
    {
        $post = EnterprisePost::findOrFail($id);
        $post->increment('likes');

        return response()->json([
            'message' => 'Post liked',
            'likes' => $post->likes,
        ]);
    }

    /**
     * Save a post to wishlist/bookmarks.
     */
    public function save($id)
    {
        $post = EnterprisePost::findOrFail($id);
        $post->increment('saves');

        return response()->json([
            'message' => 'Post saved',
            'saves' => $post->saves,
        ]);
    }
}
