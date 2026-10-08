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

        $query = EnterprisePost::query()
            ->where('type', '!=', 'promotion')
            ->where('content', 'not like', '%JULY SALE%')
            ->with(['user:id,name,role,store_name,store_logo,resort_name,resort_images', 'approver:id,name', 'rejecter:id,name']);

        if ($request->has('user_id')) {
            $targetUserId = (int) $request->input('user_id');
            $query->where('user_id', $targetUserId);
            // If viewer is NOT the owner and NOT an admin, only show approved posts
            if (!$user || ((int)$user->id !== $targetUserId && $user->role !== 'admin')) {
                $query->where('status', 'approved');
            }
        } elseif ($user && ($user->role === 'enterprise' || $user->role === 'resort') && !$request->has('public')) {
            // Owner viewing their own dashboard posts
            $query->where('user_id', $user->id);
        } else {
            // Public feed for tourists or guests
            $query->where('status', 'approved');
        }

        $posts = $query->orderBy('created_at', 'desc')->get();

        // Clean tags and auto-sync products/rooms for approved posts
        try {
            foreach ($posts as $p) {
                if (!empty($p->tags)) {
                    $cleaned = self::cleanTags($p->tags);
                    $p->tags = $cleaned;

                    // Clean any dirty tags stored in database (e.g. &[quot;...])
                    $raw = (string) $p->getRawOriginal('tags');
                    if (str_contains($raw, 'quot') || str_contains($raw, '[&quot;') || str_contains($raw, '\\"') || str_contains($raw, '#[')) {
                        $p->tags = $cleaned;
                        $p->saveQuietly();
                    }
                }
            }

            // Sync from oldest to newest so newest post takes precedence (ONLY approved posts)
            foreach ($posts->reverse() as $p) {
                if ($p->status === 'approved') {
                    if ($p->type === 'product' || !empty($p->product_name)) {
                        self::syncProductFromPost($p, $p->user ?? $user);
                    } elseif ($p->type === 'rooms' || $p->type === 'room') {
                        self::syncRoomFromPost($p, $p->user ?? $user);
                    }
                }
            }
        } catch (\Throwable $e) {
            // sync error ignored
        }

        return response()->json($posts);
    }

    /**
     * Clean and normalize tags: unescape HTML entities, strip brackets/quotes, remove hash prefixes
     */
    public static function cleanTags($rawTags): array
    {
        if (empty($rawTags)) return [];
        if (is_string($rawTags)) {
            $rawDecoded = html_entity_decode($rawTags, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $decoded = json_decode($rawDecoded, true);
            $rawArray = is_array($decoded) ? $decoded : explode(',', $rawDecoded);
        } elseif (is_array($rawTags)) {
            $rawArray = $rawTags;
        } else {
            $rawArray = [];
        }

        $cleanList = [];
        foreach ($rawArray as $t) {
            if (!empty($t)) {
                $tClean = trim(html_entity_decode((string)$t, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                $tClean = trim($tClean, "[]\"' \t\n\r\0\x0B\\");
                $tClean = ltrim($tClean, '#');
                if (str_contains($tClean, ',')) {
                    foreach (explode(',', $tClean) as $sub) {
                        $s = trim(trim($sub), "[]\"' \t\n\r\0\x0B\\");
                        $s = ltrim($s, '#');
                        if (!empty($s) && !in_array($s, $cleanList)) {
                            $cleanList[] = $s;
                        }
                    }
                } elseif (!empty($tClean) && !in_array($tClean, $cleanList)) {
                    $cleanList[] = $tClean;
                }
            }
        }
        return $cleanList;
    }

    /**
     * Helper to reliably sync an EnterprisePost to a Product database record
     */
    public static function syncProductFromPost(EnterprisePost $post, $user = null)
    {
        if ($post->status !== 'approved') {
            return null;
        }

        if (!$user && $post->user_id) {
            $user = \App\Models\User::find($post->user_id);
        }
        if (!$user) return null;
        if ($post->type !== 'product' && empty($post->product_name)) {
            return null;
        }

        $prodName = trim($post->product_name ?: '');
        if (!$prodName && !empty($post->content)) {
            $prodName = trim(\Illuminate\Support\Str::limit($post->content, 40, ''));
        }
        if (!$prodName) {
            $prodName = 'Mansalay Local Product';
        }

        $numericPrice = floatval(preg_replace('/[^0-9.]/', '', (string)($post->price ?? '0')));
        if ($numericPrice <= 0) {
            $numericPrice = 100;
        }
        $numericStock = intval(preg_replace('/[^0-9]/', '', (string)($post->stock ?? '10')));
        if ($numericStock <= 0) {
            $numericStock = 10;
        }

        // Derive category from tags if not explicitly set
        $category = $post->category;
        if (empty($category) && !empty($post->tags)) {
            $tagsList = is_array($post->tags) ? $post->tags : self::cleanTags($post->tags);
            $validCats = ['Handicraft', 'Food', 'Souvenir', 'Clothing', 'Agriculture', 'Other', 'Pasalubong'];
            foreach ($tagsList as $t) {
                foreach ($validCats as $vc) {
                    if (strcasecmp(trim($t), $vc) === 0) {
                        $category = $vc;
                        break 2;
                    }
                }
            }
        }
        if (empty($category)) {
            $category = 'Handicraft';
        }

        $prodData = [
            'name'          => $prodName,
            'description'   => $post->content ?: $prodName,
            'price'         => $numericPrice,
            'stock'         => $numericStock,
            'category'      => $category,
            'image'         => $post->image ?: null,
            'user_id'       => $user->id,
            'is_registered' => true,
            'post_id'       => $post->id,
        ];

        if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'images')) {
            $prodData['images'] = !empty($post->image) ? [$post->image] : [];
        }

        $existing = null;
        if (!empty($post->id)) {
            $existing = \App\Models\Product::where('post_id', $post->id)->first();
        }
        if (!$existing && !empty($post->image)) {
            $existing = \App\Models\Product::where('user_id', $user->id)
                ->where('image', $post->image)
                ->first();
        }
        if (!$existing) {
            $existing = \App\Models\Product::where('user_id', $user->id)
                ->where('name', $prodName)
                ->whereNull('post_id')
                ->first();
        }

        if ($existing) {
            $updateData = [
                'name'        => $prodName,
                'description' => $post->content ?: $prodName,
                'price'       => $numericPrice,
                'stock'       => $numericStock,
                'post_id'     => $post->id,
            ];
            if (!empty($category)) {
                $updateData['category'] = $category;
            }
            if (!empty($post->image)) {
                $updateData['image'] = $post->image;
                if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'images')) {
                    $updateData['images'] = [$post->image];
                }
            }
            $existing->update($updateData);
            return $existing;
        } else {
            return \App\Models\Product::create($prodData);
        }
    }

    /**
     * Helper to reliably sync an EnterprisePost to a ResortRoom database record
     */
    public static function syncRoomFromPost(EnterprisePost $post, $user = null)
    {
        if ($post->status !== 'approved') {
            return null;
        }

        if (!$user && $post->user_id) {
            $user = \App\Models\User::find($post->user_id);
        }
        if (!$user) return null;
        if ($post->type !== 'rooms' && $post->type !== 'room') {
            return null;
        }

        $roomName = trim($post->product_name ?: '');
        if (!$roomName && !empty($post->content)) {
            $firstLine = trim(explode("\n", $post->content)[0]);
            $roomName = trim(\Illuminate\Support\Str::limit($firstLine, 50, ''));
        }
        if (!$roomName) {
            $roomName = 'Resort Room & Stay';
        }

        $numericPrice = floatval(preg_replace('/[^0-9.]/', '', (string)($post->price ?? '0')));
        if ($numericPrice <= 0) {
            $numericPrice = 2000;
        }
        $capacity = intval(preg_replace('/[^0-9]/', '', (string)($post->stock ?? '2')));
        if ($capacity <= 0) {
            $capacity = 2;
        }

        $images = is_array($post->images) && count($post->images) > 0
            ? $post->images
            : (!empty($post->image) ? [$post->image] : []);

        $description = $post->content ?: $roomName;
        if (!empty($post->content) && $roomName && str_starts_with($post->content, $roomName)) {
            $stripped = trim(preg_replace('/^' . preg_quote($roomName, '/') . '\s*[—\-:]*\s*/u', '', $post->content));
            if (!empty($stripped)) {
                $description = $stripped;
            }
        }

        $roomType = 'Room';
        if (!empty($post->tags)) {
            $tagsArr = is_array($post->tags) ? $post->tags : json_decode($post->tags, true);
            if (is_array($tagsArr)) {
                foreach ($tagsArr as $tag) {
                    if (is_string($tag) && in_array(strtolower(trim($tag)), ['deluxe', 'suite', 'standard', 'cottage', 'villa', 'family room', 'dormitory', 'beachfront'])) {
                        $roomType = trim($tag);
                        break;
                    }
                }
            }
        }

        $roomData = [
            'user_id'         => $user->id,
            'name'            => $roomName,
            'type'            => $roomType,
            'price_per_night' => $numericPrice,
            'capacity'        => $capacity,
            'description'     => $description,
            'image'           => $post->image ?: (count($images) > 0 ? $images[0] : null),
            'images'          => $images,
            'is_available'    => true,
        ];

        $existing = \App\Models\ResortRoom::where('user_id', $user->id)
            ->where('name', $roomName)
            ->first();

        if ($existing) {
            $existingImgs = is_array($existing->images) ? $existing->images : (!empty($existing->image) ? [$existing->image] : []);
            $mergedImages = array_values(array_unique(array_filter(array_merge($existingImgs, $images))));
            $primaryImage = $existing->image ?: (count($mergedImages) > 0 ? $mergedImages[0] : null);

            $existing->update([
                'type'            => $roomType !== 'Room' ? $roomType : ($existing->type ?: 'Room'),
                'price_per_night' => $numericPrice,
                'capacity'        => $capacity,
                'description'     => $description,
                'image'           => $primaryImage,
                'images'          => $mergedImages,
                'is_available'    => true,
            ]);
            return $existing;
        } else {
            return \App\Models\ResortRoom::create($roomData);
        }
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
            'video'          => 'nullable',
            'video_url'      => 'nullable|string',
        ]);

        $uploadedImages = [];
        $folder = ($user && $user->role === 'resort') ? 'resort/posts' : 'enterprise/posts';

        // 1. Multiple image files upload
        if ($request->hasFile('images')) {
            $files = $request->file('images');
            if (is_array($files)) {
                foreach ($files as $file) {
                    if ($file && $file->isValid()) {
                        $path = $file->store($folder, 'public');
                        $uploadedImages[] = '/storage/' . $path;
                    }
                }
            } elseif ($files && $files->isValid()) {
                $path = $files->store($folder, 'public');
                $uploadedImages[] = '/storage/' . $path;
            }
        }

        // 2. Single image file upload fallback
        if ($request->hasFile('image') && empty($uploadedImages)) {
            $path = $request->file('image')->store($folder, 'public');
            $uploadedImages[] = '/storage/' . $path;
        }

        // 3. URLs fallback
        if (empty($uploadedImages)) {
            if ($request->filled('images') && is_string($request->input('images'))) {
                $decoded = json_decode($request->input('images'), true);
                if (is_array($decoded)) {
                    $uploadedImages = $decoded;
                }
            } elseif ($request->filled('image_url')) {
                $uploadedImages[] = $request->input('image_url');
            }
        }

        if (!empty($uploadedImages)) {
            $data['image'] = $uploadedImages[0];
            $data['images'] = $uploadedImages;
        }

        // Handle video file upload or video link
        if ($request->hasFile('video')) {
            $folder = ($user && $user->role === 'resort') ? 'resort/videos' : 'enterprise/videos';
            $path = $request->file('video')->store($folder, 'public');
            $data['video'] = '/storage/' . $path;
        } elseif ($request->filled('video_url')) {
            $data['video'] = $request->input('video_url');
        } elseif (is_string($request->input('video')) && !empty($request->input('video'))) {
            $data['video'] = $request->input('video');
        }

        if (isset($data['tags'])) {
            $data['tags'] = self::cleanTags($data['tags']);
        }

        $data['user_id'] = $user ? $user->id : null;
        $data['seller_name'] = (!empty($data['seller_name'])) ? $data['seller_name'] : ($user ? ($user->resort_name ?: ($user->store_name ?: $user->name)) : null);
        $data['likes'] = 0;
        $data['saves'] = 0;

        // Admin posts can be auto-approved, Resort & Enterprise posts MUST be pending review
        if ($user && $user->role === 'admin') {
            $data['status'] = 'approved';
            $data['approved_by'] = $user->id;
            $data['approved_at'] = now();
        } else {
            $data['status'] = 'pending';
        }

        $data['moderation_history'] = [
            [
                'action'    => 'submitted',
                'timestamp' => now()->toIso8601String(),
                'user_id'   => $user ? $user->id : null,
                'user_name' => $user ? $user->name : 'Owner',
                'note'      => 'Post submitted for admin moderation'
            ]
        ];

        $post = EnterprisePost::create($data);

        // Only sync if approved immediately (e.g. by admin)
        if ($post->status === 'approved') {
            if (($data['type'] === 'product' || !empty($data['product_name'])) && $user) {
                try {
                    self::syncProductFromPost($post, $user);
                } catch (\Throwable $e) {
                    \Log::warning('Failed to sync Product record from EnterprisePost: ' . $e->getMessage());
                }
            } elseif (($data['type'] === 'rooms' || $data['type'] === 'room') && $user) {
                try {
                    self::syncRoomFromPost($post, $user);
                } catch (\Throwable $e) {
                    \Log::warning('Failed to sync ResortRoom record from EnterprisePost: ' . $e->getMessage());
                }
            }
        } else {
            // Notify admins about new pending post
            try {
                $adminUsers = \App\Models\User::where('role', 'admin')->get();
                $ownerName = $user ? ($user->resort_name ?: ($user->store_name ?: $user->name)) : 'A partner';
                $postTypeLabel = ucfirst($data['type']);
                foreach ($adminUsers as $admin) {
                    \App\Models\Notification::notify(
                        $admin->id,
                        'post_pending_review',
                        'New Post Pending Review',
                        "{$ownerName} submitted a new {$postTypeLabel} post for review.",
                        ['post_id' => $post->id, 'owner_id' => $user ? $user->id : null, 'type' => $data['type']],
                        '/admin/posts'
                    );
                }
            } catch (\Throwable $e) {
                \Log::warning('Failed to notify admins of pending post: ' . $e->getMessage());
            }
        }

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
            'video'          => 'nullable',
            'video_url'      => 'nullable|string',
        ]);

        $folder = ($user && $user->role === 'resort') ? 'resort/posts' : 'enterprise/posts';
        $uploadedImages = [];

        if ($request->hasFile('images')) {
            $files = $request->file('images');
            if (is_array($files)) {
                foreach ($files as $file) {
                    if ($file && $file->isValid()) {
                        $path = $file->store($folder, 'public');
                        $uploadedImages[] = '/storage/' . $path;
                    }
                }
            } elseif ($files && $files->isValid()) {
                $path = $files->store($folder, 'public');
                $uploadedImages[] = '/storage/' . $path;
            }
        }

        if ($request->hasFile('image') && empty($uploadedImages)) {
            $path = $request->file('image')->store($folder, 'public');
            $uploadedImages[] = '/storage/' . $path;
        }

        if (!empty($uploadedImages)) {
            $data['image'] = $uploadedImages[0];
            $data['images'] = $uploadedImages;
        } elseif ($request->filled('image_url')) {
            $data['image'] = $request->input('image_url');
        }

        // Handle video file upload or video link
        if ($request->hasFile('video')) {
            $vFolder = ($user && $user->role === 'resort') ? 'resort/videos' : 'enterprise/videos';
            $path = $request->file('video')->store($vFolder, 'public');
            $data['video'] = '/storage/' . $path;
        } elseif ($request->filled('video_url')) {
            $data['video'] = $request->input('video_url');
        } elseif (is_string($request->input('video')) && !empty($request->input('video'))) {
            $data['video'] = $request->input('video');
        }

        if (isset($data['tags'])) {
            $data['tags'] = self::cleanTags($data['tags']);
        }

        // If resort/enterprise owner updates their post, reset to pending moderation
        if ($user && $user->role !== 'admin') {
            $data['status'] = 'pending';
            $data['rejection_remarks'] = null;
            $data['rejected_by'] = null;
            $data['rejected_at'] = null;

            $history = $post->moderation_history ?? [];
            if (!is_array($history)) {
                $history = [];
            }
            $history[] = [
                'action'    => 'resubmitted',
                'timestamp' => now()->toIso8601String(),
                'user_id'   => $user->id,
                'user_name' => $user->name,
                'note'      => 'Post edited and resubmitted for admin review'
            ];
            $data['moderation_history'] = $history;

            // Remove any previously synced live public product while pending re-review
            try {
                \App\Models\Product::where('post_id', $post->id)->delete();
            } catch (\Throwable $e) {}

            // Notify admins of resubmission
            try {
                $adminUsers = \App\Models\User::where('role', 'admin')->get();
                $ownerName = $user->resort_name ?: ($user->store_name ?: $user->name);
                foreach ($adminUsers as $admin) {
                    \App\Models\Notification::notify(
                        $admin->id,
                        'post_resubmitted',
                        'Post Resubmitted for Review',
                        "{$ownerName} updated and resubmitted their post for review.",
                        ['post_id' => $post->id, 'owner_id' => $user->id],
                        '/admin/posts'
                    );
                }
            } catch (\Throwable $e) {
                \Log::warning('Failed to notify admins of resubmitted post: ' . $e->getMessage());
            }
        }

        $updateData = array_filter($data, fn($v) => !is_null($v));
        $post->update($updateData);

        if ($user && $user->role !== 'admin') {
            $post->status = 'pending';
            $post->rejection_remarks = null;
            $post->rejected_by = null;
            $post->rejected_at = null;
            $post->save();
        }

        // If updated by admin directly to approved, re-sync
        if ($post->status === 'approved') {
            try {
                if ($post->type === 'product' || !empty($post->product_name)) {
                    self::syncProductFromPost($post, $post->user);
                } elseif ($post->type === 'rooms' || $post->type === 'room') {
                    self::syncRoomFromPost($post, $post->user);
                }
            } catch (\Throwable $e) {}
        }

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

        // Clean up any synced product
        try {
            \App\Models\Product::where('post_id', $post->id)->delete();
        } catch (\Throwable $e) {}

        $post->delete();

        return response()->json(['message' => 'Post deleted successfully.']);
    }

    /**
     * Admin: List posts with filter, search, and summary counts
     */
    public function adminModerationIndex(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $counts = [
            'pending'  => EnterprisePost::where('status', 'pending')->count(),
            'approved' => EnterprisePost::where('status', 'approved')->count(),
            'rejected' => EnterprisePost::where('status', 'rejected')->count(),
            'total'    => EnterprisePost::count(),
        ];

        $query = EnterprisePost::query()
            ->with([
                'user:id,name,email,role,store_name,store_logo,resort_name,resort_images',
                'approver:id,name,email',
                'rejecter:id,name,email'
            ]);

        // Status filter
        $status = $request->input('status', 'all');
        if (!empty($status) && in_array($status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $status);
        }

        // Account type filter
        $accountType = $request->input('account_type', 'all');
        if (!empty($accountType) && in_array($accountType, ['resort', 'enterprise'])) {
            $query->whereHas('user', function ($q) use ($accountType) {
                $q->where('role', $accountType);
            });
        }

        // Search
        $search = trim($request->input('search', ''));
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('content', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('store_name', 'like', "%{$search}%")
                         ->orWhere('resort_name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $posts = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'posts'  => $posts,
            'counts' => $counts,
        ]);
    }

    /**
     * Admin: Approve a post
     */
    public function approve(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $post = EnterprisePost::with('user')->findOrFail($id);

        $post->status = 'approved';
        $post->approved_by = $user->id;
        $post->approved_at = now();
        $post->rejected_by = null;
        $post->rejected_at = null;
        $post->rejection_remarks = null;

        $history = $post->moderation_history ?? [];
        if (!is_array($history)) {
            $history = [];
        }
        $history[] = [
            'action'     => 'approved',
            'timestamp'  => now()->toIso8601String(),
            'admin_id'   => $user->id,
            'admin_name' => $user->name,
            'note'       => $request->input('note', 'Approved by admin'),
        ];
        $post->moderation_history = $history;
        $post->save();

        // Sync to Product or ResortRoom record
        try {
            if ($post->type === 'product' || !empty($post->product_name)) {
                self::syncProductFromPost($post, $post->user);
            } elseif ($post->type === 'rooms' || $post->type === 'room') {
                self::syncRoomFromPost($post, $post->user);
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed syncing approved post: ' . $e->getMessage());
        }

        // Notify post owner
        if ($post->user_id) {
            try {
                $link = ($post->user && $post->user->role === 'resort') ? '/resort/dashboard' : '/enterprise/dashboard';
                $titleSnippet = $post->product_name ?: (\Illuminate\Support\Str::limit($post->content, 35) ?: 'Your post');
                \App\Models\Notification::notify(
                    $post->user_id,
                    'post_approved',
                    'Post Approved!',
                    "Your post \"{$titleSnippet}\" has been approved and is now publicly visible.",
                    ['post_id' => $post->id, 'status' => 'approved'],
                    $link
                );
            } catch (\Throwable $e) {
                \Log::warning('Approval notification failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Post approved successfully.',
            'post'    => $post->fresh(['user:id,name,email,role,store_name,store_logo,resort_name,resort_images', 'approver:id,name']),
        ]);
    }

    /**
     * Admin: Reject a post with remarks
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $request->validate([
            'remarks' => 'required|string|min:3|max:2000',
        ]);

        $post = EnterprisePost::with('user')->findOrFail($id);

        $remarks = trim($request->input('remarks'));

        $post->status = 'rejected';
        $post->rejected_by = $user->id;
        $post->rejected_at = now();
        $post->rejection_remarks = $remarks;

        $history = $post->moderation_history ?? [];
        if (!is_array($history)) {
            $history = [];
        }
        $history[] = [
            'action'     => 'rejected',
            'timestamp'  => now()->toIso8601String(),
            'admin_id'   => $user->id,
            'admin_name' => $user->name,
            'remarks'    => $remarks,
        ];
        $post->moderation_history = $history;
        $post->save();

        // If product was previously synced, remove it
        try {
            \App\Models\Product::where('post_id', $post->id)->delete();
        } catch (\Throwable $e) {}

        // Notify post owner with remarks
        if ($post->user_id) {
            try {
                $link = ($post->user && $post->user->role === 'resort') ? '/resort/dashboard' : '/enterprise/dashboard';
                $titleSnippet = $post->product_name ?: (\Illuminate\Support\Str::limit($post->content, 35) ?: 'Your post');
                \App\Models\Notification::notify(
                    $post->user_id,
                    'post_rejected',
                    'Post Needs Revision',
                    "Your post \"{$titleSnippet}\" was rejected by the admin. Reason: {$remarks}",
                    ['post_id' => $post->id, 'status' => 'rejected', 'remarks' => $remarks],
                    $link
                );
            } catch (\Throwable $e) {
                \Log::warning('Rejection notification failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Post rejected.',
            'post'    => $post->fresh(['user:id,name,email,role,store_name,store_logo,resort_name,resort_images', 'rejecter:id,name']),
        ]);
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
    public function save(Request $request, $id)
    {
        $post = EnterprisePost::findOrFail($id);
        $post->increment('saves');

        try {
            $user = $request->user();
            if (!$user && $request->bearerToken()) {
                $user = auth('api')->user();
            }
            $touristName = $user ? ($user->name ?? 'A tourist') : ($request->input('user_name') ?: 'A tourist');
            $postTitle = $post->title ?: ($post->category ?: 'post');
            $owner = $post->user;
            $link = ($owner && $owner->role === 'resort') ? '/resort/dashboard' : '/enterprise/profile';

            // Verify owner is a valid business account (never a tourist) and not the saving user
            if ($owner && in_array($owner->role, ['enterprise', 'resort']) && (!$user || (int)$post->user_id !== (int)$user->id)) {
                $cacheKey = "notif_post_save_{$post->user_id}_{$post->id}_" . ($user ? $user->id : 'guest');
                if (!\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                    \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addSeconds(10));
                    \App\Models\Notification::notify(
                        $post->user_id,
                        'wishlist_saved',
                        'New Wishlist Save!',
                        "{$touristName} saved your {$postTitle} to their wishlist!",
                        [
                            'post_id' => $post->id,
                            'saves'   => $post->saves,
                        ],
                        $link
                    );
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('Post save notification failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Post saved',
            'saves' => $post->saves,
        ]);
    }
}
