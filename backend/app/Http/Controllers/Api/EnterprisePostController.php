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
        $query = EnterprisePost::query()->with('user:id,name,store_name,store_logo,resort_name,resort_images');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        } elseif ($user && ($user->role === 'enterprise' || $user->role === 'resort')) {
            $query->where('user_id', $user->id);
        }

        $posts = $query->orderBy('created_at', 'desc')->get();

        // If the user has 0 posts in DB, let's auto-seed their initial default posts
        if ($posts->isEmpty() && $user) {
            if ($user->role === 'resort') {
                $this->seedInitialResortPosts($user);
                $posts = EnterprisePost::where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
            } elseif ($user->role === 'enterprise') {
                $this->seedInitialPosts($user);
                $posts = EnterprisePost::where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
            }
        }

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

    /**
     * Seed initial posts for a resort account so they have rich data immediately.
     */
    private function seedInitialResortPosts($user)
    {
        $seller = $user->resort_name ?: ($user->name ?: 'MB Hinaya Beach Resort');
        $loc = $user->address ? "{$user->address}, {$user->barangay}" : 'Coastal Road, Mansalay';

        $defaultPosts = [
            [
                'user_id'        => $user->id,
                'type'           => 'beach_views',
                'content'        => 'Enjoy breathtaking sunsets at our private beach. The golden hour here is simply magical! Book now and experience paradise.',
                'image'          => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
                'seller_name'    => $seller,
                'location'       => 'Coastal Road, Mansalay',
                'business_hours' => 'Open daily 6:00 AM - 8:00 PM',
                'tags'           => ['Sunset', 'Beach', 'Nature'],
                'likes'          => 142,
                'saves'          => 48,
                'created_at'     => now()->subHours(2),
            ],
            [
                'user_id'        => $user->id,
                'type'           => 'promotion',
                'content'        => 'SUMMER SPECIAL! Get 20% off on all room bookings this July! Use code SUMMER20. Limited slots only — hurry and book your stay!',
                'image'          => 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
                'price'          => '₱1,600/night (was ₱2,000)',
                'seller_name'    => $seller,
                'location'       => 'Coastal Road, Mansalay',
                'stock'          => '5 rooms remaining',
                'business_hours' => '20% OFF — Use code SUMMER20',
                'tags'           => ['Sale', 'Promo', 'Summer'],
                'likes'          => 89,
                'saves'          => 31,
                'created_at'     => now()->subDays(1),
            ],
            [
                'user_id'        => $user->id,
                'type'           => 'rooms',
                'content'        => 'Introducing our new Glamping Suites — a perfect blend of nature and luxury. Stargazing from your bed has never been this good.',
                'image'          => 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
                'price'          => '₱2,800/night',
                'seller_name'    => $seller,
                'location'       => 'Mabuhay Hills, Mansalay',
                'business_hours' => 'Check-in 2PM / Check-out 12NN',
                'stock'          => '4 units available',
                'tags'           => ['Glamping', 'Luxury', 'Nature'],
                'likes'          => 178,
                'saves'          => 65,
                'created_at'     => now()->subDays(3),
            ],
        ];

        foreach ($defaultPosts as $p) {
            EnterprisePost::create($p);
        }
    }

    /**
     * Seed initial posts for an enterprise account so they have rich data immediately.
     */
    private function seedInitialPosts($user)
    {
        $defaultPosts = [
            [
                'user_id'        => $user->id,
                'type'           => 'product',
                'content'        => 'Introducing our NEW handwoven baskets — crafted by skilled Mansalay artisans using traditional techniques. Each piece is unique!',
                'image'          => 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&auto=format&fit=crop&q=80',
                'product_name'   => 'Handwoven Banig Basket',
                'price'          => '₱350 – ₱650',
                'category'       => 'Handicraft',
                'seller_name'    => $user->store_name ?: $user->name,
                'location'       => $user->address ? "{$user->address}, {$user->barangay}" : 'Mansalay Public Market',
                'business_hours' => 'Mon–Sat 7:00 AM – 5:00 PM',
                'stock'          => 'In stock (12 remaining)',
                'tags'           => ['Handicraft', 'Handmade', 'Souvenir'],
                'likes'          => 98,
                'saves'          => 34,
                'created_at'     => now()->subHours(3),
            ],
            [
                'user_id'        => $user->id,
                'type'           => 'promotion',
                'content'        => 'JULY SALE: Buy 2 get 1 FREE on all souvenir items! Visit us at Mansalay Public Market or order online via our Facebook page.',
                'image'          => 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
                'price'          => 'Buy 2 Get 1 Free',
                'seller_name'    => $user->store_name ?: $user->name,
                'location'       => $user->address ? "{$user->address}, {$user->barangay}" : 'Mansalay Public Market',
                'tags'           => ['Sale', 'Promo', 'Souvenir'],
                'likes'          => 145,
                'saves'          => 62,
                'created_at'     => now()->subDays(1),
            ],
            [
                'user_id'        => $user->id,
                'type'           => 'update',
                'content'        => 'We have extended our operating hours! Now open 7AM–8PM daily. Come visit us and discover authentic Mansalay products.',
                'image'          => 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
                'seller_name'    => $user->store_name ?: $user->name,
                'location'       => $user->address ? "{$user->address}, {$user->barangay}" : 'Mansalay, Oriental Mindoro',
                'business_hours' => '7:00 AM – 8:00 PM daily',
                'tags'           => ['Update', 'Hours'],
                'likes'          => 67,
                'saves'          => 18,
                'created_at'     => now()->subDays(3),
            ],
        ];

        foreach ($defaultPosts as $p) {
            EnterprisePost::create($p);
        }
    }
}
