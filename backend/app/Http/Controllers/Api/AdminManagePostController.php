<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Accommodation;
use App\Models\Attraction;
use App\Models\Product;
use App\Models\Event;
use App\Models\CultureArt;
use App\Models\HistoryPost;
use App\Models\EnterprisePost;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class AdminManagePostController extends Controller
{
    /**
     * Strict Server-Side Model Whitelist.
     * Prevents arbitrary model or table injection from client.
     */
    private const ALLOWED_SOURCES = [
        'resort'        => Accommodation::class,
        'accommodation' => Accommodation::class,
        'product'       => Product::class,
        'attraction'    => Attraction::class,
        'event'         => Event::class,
        'itinerary'     => Attraction::class,
        'culture'       => CultureArt::class,
        'history'       => HistoryPost::class,
        'post'          => EnterprisePost::class,
    ];

    /**
     * Helper to resolve model safely from whitelist.
     */
    private function resolveModel(string $source)
    {
        $normalized = strtolower(trim($source));
        if (!isset(self::ALLOWED_SOURCES[$normalized])) {
            abort(422, "Security Error: Invalid or unrecognized content source '{$source}'.");
        }
        return self::ALLOWED_SOURCES[$normalized];
    }

    /**
     * GET /api/admin/manage-posts
     * Centralized index listing all content across all system types.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $search = trim($request->input('search', ''));
        $searchEscaped = !empty($search) ? addcslashes($search, '%_') : '';
        $contentTypeFilter = strtolower(trim($request->input('content_type', 'all')));
        $accountTypeFilter = strtolower(trim($request->input('account_type', 'all')));
        $statusFilter = strtolower(trim($request->input('status', 'all')));

        $items = collect();

        // 1. Enterprise / Resort Posts (from enterprise_posts table)
        if ($contentTypeFilter === 'all' || in_array($contentTypeFilter, ['resort', 'enterprise', 'product', 'accommodation'])) {
            $postQuery = EnterprisePost::with([
                'user:id,name,email,role,store_name,store_logo,resort_name,resort_images',
                'approver:id,name',
                'rejecter:id,name',
            ]);

            $posts = $postQuery->get()->map(function ($p) {
                $ownerRole = $p->user ? $p->user->role : 'enterprise';
                $cType = ($ownerRole === 'resort') ? 'Resort' : 'Enterprise';
                if ($p->type === 'product' || !empty($p->product_name)) {
                    $cType = 'Product';
                } elseif (in_array($p->type, ['room', 'rooms', 'accommodation', 'stay'])) {
                    $cType = 'Accommodation';
                }

                $images = [];
                if (is_array($p->images)) {
                    $images = $p->images;
                } elseif ($p->image) {
                    $images = [$p->image];
                }

                $ownerData = [
                    'id'          => $p->user_id,
                    'name'        => $p->user ? $p->user->name : 'Unknown Partner',
                    'role'        => $ownerRole,
                    'email'       => $p->user ? $p->user->email : null,
                    'store_name'  => $p->user ? ($p->user->store_name ?: $p->user->name) : null,
                    'resort_name' => $p->user ? ($p->user->resort_name ?: $p->user->name) : null,
                    'logo'        => $p->user ? ($p->user->store_logo ?: null) : null,
                ];

                return [
                    'id'                => (int) $p->id,
                    'source'            => 'post',
                    'content_type'      => $cType,
                    'account_type'      => $ownerRole,
                    'title'             => $p->product_name ?: ($p->title ?: 'Post #' . $p->id),
                    'name'              => $p->product_name ?: ($p->title ?: 'Post #' . $p->id),
                    'content'           => $p->content,
                    'description'       => $p->content,
                    'full_description'  => $p->content,
                    'category'          => $p->category ?: $cType,
                    'price'             => $p->price,
                    'location'          => $p->location,
                    'status'            => $p->status ?: 'approved',
                    'previous_status'   => $p->previous_status,
                    'archived_at'       => $p->archived_at ? $p->archived_at->toIso8601String() : null,
                    'created_at'        => $p->created_at ? $p->created_at->toIso8601String() : null,
                    'updated_at'        => $p->updated_at ? $p->updated_at->toIso8601String() : null,
                    'image'             => $p->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => $p->video,
                    'rejection_remarks' => $p->rejection_remarks,
                    'moderation_history'=> $p->moderation_history ?? [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($posts);
        }

        // 2. Accommodations / Stays (from accommodations table)
        if ($contentTypeFilter === 'all' || in_array($contentTypeFilter, ['resort', 'accommodation'])) {
            $accQuery = Accommodation::with('owner:id,name,email,role,store_name,resort_name,resort_images');
            $accs = $accQuery->get()->map(function ($a) {
                $ownerRole = $a->owner ? $a->owner->role : 'admin';
                $images = is_array($a->images) ? $a->images : ($a->image ? [$a->image] : []);

                $ownerData = [
                    'id'          => $a->user_id,
                    'name'        => $a->owner ? $a->owner->name : 'Tourism Admin',
                    'role'        => $ownerRole,
                    'email'       => $a->owner ? $a->owner->email : null,
                    'resort_name' => $a->owner ? ($a->owner->resort_name ?: $a->owner->name) : $a->name,
                    'store_name'  => null,
                    'logo'        => null,
                ];

                return [
                    'id'                => (int) $a->id,
                    'source'            => 'accommodation',
                    'content_type'      => 'Accommodation',
                    'account_type'      => $ownerRole,
                    'title'             => $a->name,
                    'name'              => $a->name,
                    'content'           => $a->description,
                    'description'       => $a->description,
                    'full_description'  => $a->full_description ?: $a->description,
                    'category'          => $a->category ?: 'Accommodation',
                    'price'             => $a->price_per_night,
                    'location'          => $a->location,
                    'status'            => $a->status ?: 'approved',
                    'previous_status'   => $a->previous_status,
                    'archived_at'       => $a->archived_at ? $a->archived_at->toIso8601String() : null,
                    'created_at'        => $a->created_at ? $a->created_at->toIso8601String() : null,
                    'updated_at'        => $a->updated_at ? $a->updated_at->toIso8601String() : null,
                    'image'             => $a->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => $a->video,
                    'rejection_remarks' => null,
                    'moderation_history'=> [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($accs);
        }

        // 3. Products (from products table)
        if ($contentTypeFilter === 'all' || in_array($contentTypeFilter, ['enterprise', 'product'])) {
            $prodQuery = Product::with('owner:id,name,email,role,store_name');
            $prods = $prodQuery->get()->map(function ($pr) {
                $ownerRole = $pr->owner ? $pr->owner->role : 'admin';
                $images = is_array($pr->images) ? $pr->images : ($pr->image ? [$pr->image] : []);

                $ownerData = [
                    'id'          => $pr->user_id,
                    'name'        => $pr->owner ? $pr->owner->name : 'Tourism Admin',
                    'role'        => $ownerRole,
                    'email'       => $pr->owner ? $pr->owner->email : null,
                    'store_name'  => $pr->owner ? ($pr->owner->store_name ?: $pr->owner->name) : 'Official Enterprise',
                    'resort_name' => null,
                    'logo'        => null,
                ];

                return [
                    'id'                => (int) $pr->id,
                    'source'            => 'product',
                    'content_type'      => 'Product',
                    'account_type'      => $ownerRole,
                    'title'             => $pr->name,
                    'name'              => $pr->name,
                    'content'           => $pr->description,
                    'description'       => $pr->description,
                    'full_description'  => $pr->description,
                    'category'          => $pr->category ?: 'Local Product',
                    'price'             => $pr->price,
                    'location'          => 'Mansalay, Oriental Mindoro',
                    'status'            => $pr->status ?: 'approved',
                    'previous_status'   => $pr->previous_status,
                    'archived_at'       => $pr->archived_at ? $pr->archived_at->toIso8601String() : null,
                    'created_at'        => $pr->created_at ? $pr->created_at->toIso8601String() : null,
                    'updated_at'        => $pr->updated_at ? $pr->updated_at->toIso8601String() : null,
                    'image'             => $pr->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => null,
                    'rejection_remarks' => null,
                    'moderation_history'=> [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($prods);
        }

        // 4. Attractions & Itineraries (from attractions table)
        if ($contentTypeFilter === 'all' || in_array($contentTypeFilter, ['attraction', 'itinerary'])) {
            $attrQuery = Attraction::with('creator:id,name,email,role');
            $attrs = $attrQuery->get()->map(function ($at) {
                $isItinerary = ($at->category === 'Itinerary' || !empty($at->days_count) || !empty($at->schedule));
                $cType = $isItinerary ? 'Itinerary' : 'Attraction';
                $ownerRole = $at->creator ? $at->creator->role : 'admin';
                $images = is_array($at->images) ? $at->images : ($at->image ? [$at->image] : []);

                $ownerData = [
                    'id'          => $at->user_id,
                    'name'        => $at->creator ? $at->creator->name : 'Tourism Admin',
                    'role'        => $ownerRole,
                    'email'       => $at->creator ? $at->creator->email : null,
                    'store_name'  => null,
                    'resort_name' => null,
                    'logo'        => null,
                ];

                return [
                    'id'                => (int) $at->id,
                    'source'            => $isItinerary ? 'itinerary' : 'attraction',
                    'content_type'      => $cType,
                    'account_type'      => $ownerRole,
                    'title'             => $at->name,
                    'name'              => $at->name,
                    'content'           => $at->description,
                    'description'       => $at->description,
                    'full_description'  => $at->full_description ?: $at->description,
                    'category'          => $at->category ?: $cType,
                    'price'             => null,
                    'location'          => $at->location,
                    'status'            => $at->status ?: 'approved',
                    'previous_status'   => $at->previous_status,
                    'archived_at'       => $at->archived_at ? $at->archived_at->toIso8601String() : null,
                    'created_at'        => $at->created_at ? $at->created_at->toIso8601String() : null,
                    'updated_at'        => $at->updated_at ? $at->updated_at->toIso8601String() : null,
                    'image'             => $at->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => $at->video,
                    'rejection_remarks' => null,
                    'moderation_history'=> [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($attrs);
        }

        // 5. Events (from events table)
        if ($contentTypeFilter === 'all' || $contentTypeFilter === 'event') {
            $evtQuery = Event::with('creator:id,name,email,role');
            $evts = $evtQuery->get()->map(function ($ev) {
                $ownerRole = $ev->creator ? $ev->creator->role : 'admin';
                $images = is_array($ev->images) ? $ev->images : ($ev->image ? [$ev->image] : []);

                $ownerData = [
                    'id'          => $ev->user_id,
                    'name'        => $ev->creator ? $ev->creator->name : 'Tourism Admin',
                    'role'        => $ownerRole,
                    'email'       => $ev->creator ? $ev->creator->email : null,
                    'store_name'  => null,
                    'resort_name' => null,
                    'logo'        => null,
                ];

                return [
                    'id'                => (int) $ev->id,
                    'source'            => 'event',
                    'content_type'      => 'Event',
                    'account_type'      => $ownerRole,
                    'title'             => $ev->name,
                    'name'              => $ev->name,
                    'content'           => $ev->description,
                    'description'       => $ev->description,
                    'full_description'  => $ev->full_description ?: $ev->description,
                    'category'          => $ev->category ?: 'Festival & Event',
                    'price'             => null,
                    'location'          => $ev->location,
                    'status'            => $ev->status ?: 'approved',
                    'previous_status'   => $ev->previous_status,
                    'archived_at'       => $ev->archived_at ? $ev->archived_at->toIso8601String() : null,
                    'created_at'        => $ev->created_at ? $ev->created_at->toIso8601String() : null,
                    'updated_at'        => $ev->updated_at ? $ev->updated_at->toIso8601String() : null,
                    'image'             => $ev->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => null,
                    'rejection_remarks' => null,
                    'moderation_history'=> [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($evts);
        }

        // 6. Culture & Arts (from culture_arts table)
        if ($contentTypeFilter === 'all' || in_array($contentTypeFilter, ['culture', 'culture & arts'])) {
            $cultQuery = CultureArt::with('creator:id,name,email,role');
            $cults = $cultQuery->get()->map(function ($cu) {
                $ownerRole = $cu->creator ? $cu->creator->role : 'admin';
                $images = is_array($cu->images) ? $cu->images : ($cu->image ? [$cu->image] : []);
                $normalizedStatus = ($cu->status === 'published' || $cu->status === 'approved') ? 'approved' : $cu->status;

                $ownerData = [
                    'id'          => $cu->user_id,
                    'name'        => $cu->creator ? $cu->creator->name : 'Tourism Admin',
                    'role'        => $ownerRole,
                    'email'       => $cu->creator ? $cu->creator->email : null,
                    'store_name'  => null,
                    'resort_name' => null,
                    'logo'        => null,
                ];

                return [
                    'id'                => (int) $cu->id,
                    'source'            => 'culture',
                    'content_type'      => 'Culture & Arts',
                    'account_type'      => $ownerRole,
                    'title'             => $cu->name,
                    'name'              => $cu->name,
                    'content'           => $cu->description,
                    'description'       => $cu->description,
                    'full_description'  => $cu->full_description ?: $cu->description,
                    'category'          => $cu->category ?: 'Culture & Arts',
                    'price'             => null,
                    'location'          => $cu->location ?: 'Mansalay',
                    'status'            => $normalizedStatus,
                    'previous_status'   => $cu->previous_status,
                    'archived_at'       => $cu->archived_at ? $cu->archived_at->toIso8601String() : null,
                    'created_at'        => $cu->created_at ? $cu->created_at->toIso8601String() : null,
                    'updated_at'        => $cu->updated_at ? $cu->updated_at->toIso8601String() : null,
                    'image'             => $cu->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => $cu->video,
                    'rejection_remarks' => null,
                    'moderation_history'=> [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($cults);
        }

        // 7. History (from histories table)
        if ($contentTypeFilter === 'all' || $contentTypeFilter === 'history') {
            $histQuery = HistoryPost::with('creator:id,name,email,role');
            $hists = $histQuery->get()->map(function ($hi) {
                $ownerRole = $hi->creator ? $hi->creator->role : 'admin';
                $images = is_array($hi->images) ? $hi->images : ($hi->image ? [$hi->image] : []);
                $normalizedStatus = ($hi->status === 'published' || $hi->status === 'approved') ? 'approved' : $hi->status;

                $ownerData = [
                    'id'          => $hi->user_id,
                    'name'        => $hi->creator ? $hi->creator->name : 'Tourism Admin',
                    'role'        => $ownerRole,
                    'email'       => $hi->creator ? $hi->creator->email : null,
                    'store_name'  => null,
                    'resort_name' => null,
                    'logo'        => null,
                ];

                return [
                    'id'                => (int) $hi->id,
                    'source'            => 'history',
                    'content_type'      => 'History',
                    'account_type'      => $ownerRole,
                    'title'             => $hi->name,
                    'name'              => $hi->name,
                    'content'           => $hi->description,
                    'description'       => $hi->description,
                    'full_description'  => $hi->full_description ?: $hi->description,
                    'category'          => $hi->category ?: 'Origins & History',
                    'price'             => null,
                    'location'          => $hi->location ?: 'Mansalay',
                    'status'            => $normalizedStatus,
                    'previous_status'   => $hi->previous_status,
                    'archived_at'       => $hi->archived_at ? $hi->archived_at->toIso8601String() : null,
                    'created_at'        => $hi->created_at ? $hi->created_at->toIso8601String() : null,
                    'updated_at'        => $hi->updated_at ? $hi->updated_at->toIso8601String() : null,
                    'image'             => $hi->image ?: ($images[0] ?? null),
                    'images'            => $images,
                    'video'             => $hi->video,
                    'rejection_remarks' => null,
                    'moderation_history'=> [],
                    'owner'             => $ownerData,
                    'author'            => $ownerData,
                ];
            });
            $items = $items->concat($hists);
        }

        // Compute 5 Dynamic Summary Counts across all fetched records
        $counts = [
            'total'    => $items->count(),
            'pending'  => $items->where('status', 'pending')->count(),
            'approved' => $items->where('status', 'approved')->count(),
            'rejected' => $items->where('status', 'rejected')->count(),
            'archived' => $items->where('status', 'archived')->count(),
        ];

        // Apply Status Filter
        if ($statusFilter !== 'all') {
            $items = $items->filter(function ($item) use ($statusFilter) {
                if ($statusFilter === 'pending') return $item['status'] === 'pending';
                if ($statusFilter === 'approved') return $item['status'] === 'approved' || $item['status'] === 'published';
                if ($statusFilter === 'rejected') return $item['status'] === 'rejected';
                if ($statusFilter === 'archived') return $item['status'] === 'archived';
                return true;
            });
        }

        // Apply Content Type Filter
        if ($contentTypeFilter !== 'all') {
            $items = $items->filter(function ($item) use ($contentTypeFilter) {
                $cType = strtolower($item['content_type']);
                return str_contains($cType, $contentTypeFilter) || $cType === $contentTypeFilter;
            });
        }

        // Apply Account Type Filter
        if ($accountTypeFilter !== 'all') {
            $items = $items->filter(function ($item) use ($accountTypeFilter) {
                $role = strtolower($item['account_type']);
                return $role === $accountTypeFilter;
            });
        }

        // Apply Search (Case-Insensitive with regex / string safety)
        if (!empty($search)) {
            $q = mb_strtolower($search);
            $items = $items->filter(function ($item) use ($q) {
                $title = mb_strtolower($item['title'] ?? '');
                $desc = mb_strtolower($item['description'] ?? '');
                $owner = mb_strtolower($item['owner']['name'] ?? '');
                $store = mb_strtolower($item['owner']['store_name'] ?? '');
                $resort = mb_strtolower($item['owner']['resort_name'] ?? '');
                $loc = mb_strtolower($item['location'] ?? '');
                $type = mb_strtolower($item['content_type'] ?? '');

                return str_contains($title, $q) ||
                       str_contains($desc, $q) ||
                       str_contains($owner, $q) ||
                       str_contains($store, $q) ||
                       str_contains($resort, $q) ||
                       str_contains($loc, $q) ||
                       str_contains($type, $q);
            });
        }

        // Sort: newest first
        $sorted = $items->sortByDesc('created_at')->values();

        return response()->json([
            'success' => true,
            'counts'  => $counts,
            'posts'   => $sorted,
            'total'   => $sorted->count(),
        ]);
    }

    /**
     * POST /api/admin/manage-posts/{source}/{id}/archive
     * Moves an active post to 'archived'. Preserves record, content, and ID.
     */
    public function archive(Request $request, $source, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $modelClass = $this->resolveModel($source);
        $record = $modelClass::findOrFail($id);

        if ($record->status === 'archived') {
            return response()->json(['message' => 'This post is already archived.'], 422);
        }

        $currentStatus = $record->status ?: 'approved';
        $record->previous_status = $currentStatus;
        $record->status = 'archived';
        $record->archived_at = now();

        // Audit moderation history if supported
        if (isset($record->moderation_history)) {
            $history = is_array($record->moderation_history) ? $record->moderation_history : [];
            $history[] = [
                'action'          => 'archived',
                'timestamp'       => now()->toIso8601String(),
                'admin_id'        => $user->id,
                'admin_name'      => $user->name,
                'previous_status' => $currentStatus,
                'note'            => 'Archived by administrator',
            ];
            $record->moderation_history = $history;
        }

        $record->save();

        // Send owner notification if owned by business user
        if (!empty($record->user_id)) {
            try {
                $postTitle = $record->title ?: ($record->name ?: ($record->product_name ?: 'Your post'));
                Notification::notify(
                    $record->user_id,
                    'post_archived',
                    'Post Archived',
                    "Your post \"{$postTitle}\" has been archived and removed from public view by the administrator.",
                    ['source' => $source, 'id' => $record->id, 'status' => 'archived'],
                    '/dashboard'
                );
            } catch (\Throwable $t) {
                Log::warning('Archive notification failed: ' . $t->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Post archived successfully. It is now hidden from public views.',
            'status'  => 'archived',
        ]);
    }

    /**
     * POST /api/admin/manage-posts/{source}/{id}/restore
     * Restores an archived post to its PREVIOUS valid status.
     * Prevents pending or rejected posts from becoming public automatically.
     */
    public function restore(Request $request, $source, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $modelClass = $this->resolveModel($source);
        $record = $modelClass::findOrFail($id);

        if ($record->status !== 'archived') {
            return response()->json(['message' => 'Only archived posts can be restored.'], 422);
        }

        // Determine restored status strictly from previous_status
        $previous = $record->previous_status;
        $defaultValid = ($source === 'culture' || $source === 'history') ? 'published' : 'approved';
        $restoredStatus = in_array($previous, ['approved', 'published', 'pending', 'rejected']) ? $previous : $defaultValid;

        $record->status = $restoredStatus;
        $record->archived_at = null;

        // Audit moderation history if supported
        if (isset($record->moderation_history)) {
            $history = is_array($record->moderation_history) ? $record->moderation_history : [];
            $history[] = [
                'action'          => 'restored',
                'timestamp'       => now()->toIso8601String(),
                'admin_id'        => $user->id,
                'admin_name'      => $user->name,
                'restored_status' => $restoredStatus,
                'note'            => "Restored to {$restoredStatus} by administrator",
            ];
            $record->moderation_history = $history;
        }

        $record->save();

        // Send owner notification
        if (!empty($record->user_id)) {
            try {
                $postTitle = $record->title ?: ($record->name ?: ($record->product_name ?: 'Your post'));
                Notification::notify(
                    $record->user_id,
                    'post_restored',
                    'Post Restored',
                    "Your post \"{$postTitle}\" has been restored with status: {$restoredStatus}.",
                    ['source' => $source, 'id' => $record->id, 'status' => $restoredStatus],
                    '/dashboard'
                );
            } catch (\Throwable $t) {
                Log::warning('Restore notification failed: ' . $t->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Post restored successfully to status: {$restoredStatus}.",
            'status'  => $restoredStatus,
        ]);
    }

    /**
     * DELETE /api/admin/manage-posts/{source}/{id}
     * PERMANENT DELETE SAFETY GUARD:
     * MUST verify that the post is currently 'archived' before permanent deletion!
     * Deletes ONLY this specific single record.
     */
    public function destroy(Request $request, $source, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $modelClass = $this->resolveModel($source);
        $record = $modelClass::findOrFail($id);

        // 🛡️ CRITICAL SECURITY CHECK: Post MUST be archived first!
        if ($record->status !== 'archived') {
            return response()->json([
                'success' => false,
                'error'   => 'Security Violation',
                'message' => 'Cannot permanently delete an active post. The post MUST be archived first before deletion.'
            ], 422);
        }

        // Delete ONLY this specific resolved model instance
        $record->delete();

        return response()->json([
            'success' => true,
            'message' => "Post #{$id} from {$source} has been permanently deleted from the database.",
        ]);
    }

    /**
     * POST /api/admin/manage-posts/{source}/{id}/approve
     * Approves a pending post.
     */
    public function approve(Request $request, $source, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $modelClass = $this->resolveModel($source);
        $record = $modelClass::findOrFail($id);

        $record->status = ($source === 'culture' || $source === 'history') ? 'published' : 'approved';
        if (isset($record->approved_by)) $record->approved_by = $user->id;
        if (isset($record->approved_at)) $record->approved_at = now();
        if (isset($record->rejected_by)) $record->rejected_by = null;
        if (isset($record->rejected_at)) $record->rejected_at = null;
        if (isset($record->rejection_remarks)) $record->rejection_remarks = null;

        if (isset($record->moderation_history)) {
            $history = is_array($record->moderation_history) ? $record->moderation_history : [];
            $history[] = [
                'action'     => 'approved',
                'timestamp'  => now()->toIso8601String(),
                'admin_id'   => $user->id,
                'admin_name' => $user->name,
                'note'       => 'Approved by administrator',
            ];
            $record->moderation_history = $history;
        }

        $record->save();

        if (!empty($record->user_id)) {
            try {
                $postTitle = $record->title ?: ($record->name ?: ($record->product_name ?: 'Your post'));
                Notification::notify(
                    $record->user_id,
                    'post_approved',
                    'Post Approved!',
                    "Your post \"{$postTitle}\" has been approved and is now publicly visible.",
                    ['source' => $source, 'id' => $record->id, 'status' => 'approved'],
                    '/dashboard'
                );
            } catch (\Throwable $t) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'Post approved successfully.',
            'status'  => $record->status,
        ]);
    }

    /**
     * POST /api/admin/manage-posts/{source}/{id}/reject
     * Rejects a post with mandatory remarks.
     */
    public function reject(Request $request, $source, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $request->validate([
            'remarks' => 'required|string|min:3|max:1000',
        ]);

        $modelClass = $this->resolveModel($source);
        $record = $modelClass::findOrFail($id);

        $remarks = strip_tags(trim($request->input('remarks')));

        $record->status = 'rejected';
        if (isset($record->rejected_by)) $record->rejected_by = $user->id;
        if (isset($record->rejected_at)) $record->rejected_at = now();
        if (isset($record->rejection_remarks)) $record->rejection_remarks = $remarks;

        if (isset($record->moderation_history)) {
            $history = is_array($record->moderation_history) ? $record->moderation_history : [];
            $history[] = [
                'action'     => 'rejected',
                'timestamp'  => now()->toIso8601String(),
                'admin_id'   => $user->id,
                'admin_name' => $user->name,
                'remarks'    => $remarks,
            ];
            $record->moderation_history = $history;
        }

        $record->save();

        if (!empty($record->user_id)) {
            try {
                $postTitle = $record->title ?: ($record->name ?: ($record->product_name ?: 'Your post'));
                Notification::notify(
                    $record->user_id,
                    'post_rejected',
                    'Post Needs Revision',
                    "Your post \"{$postTitle}\" was rejected by the admin. Reason: {$remarks}",
                    ['source' => $source, 'id' => $record->id, 'status' => 'rejected', 'remarks' => $remarks],
                    '/dashboard'
                );
            } catch (\Throwable $t) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'Post rejected with remarks.',
            'status'  => 'rejected',
        ]);
    }

    /**
     * PUT /api/admin/manage-posts/{source}/{id}
     * Safely updates editable content fields. Prevents modifying user_id, status, role.
     */
    public function update(Request $request, $source, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $modelClass = $this->resolveModel($source);
        $record = $modelClass::findOrFail($id);

        $validated = $request->validate([
            'title'            => 'nullable|string|max:255',
            'name'             => 'nullable|string|max:255',
            'description'      => 'nullable|string',
            'full_description' => 'nullable|string',
            'content'          => 'nullable|string',
            'price'            => 'nullable',
            'price_per_night'  => 'nullable',
            'category'         => 'nullable|string|max:255',
            'location'         => 'nullable|string|max:255',
            'operating_hours'  => 'nullable|string|max:255',
            'contact_number'   => 'nullable|string|max:100',
            'phone'            => 'nullable|string|max:100',
            'email'            => 'nullable|email|max:255',
            'facebook'         => 'nullable|string|max:255',
            'instagram'        => 'nullable|string|max:255',
            'website'          => 'nullable|string|max:255',
        ]);

        // Map inputs safely to the model's actual fields
        if (isset($validated['title']) && SchemaHas($record, 'title')) $record->title = strip_tags($validated['title']);
        if (isset($validated['name']) && SchemaHas($record, 'name')) $record->name = strip_tags($validated['name'] ?: ($validated['title'] ?? ''));
        if (isset($validated['title']) && SchemaHas($record, 'product_name')) $record->product_name = strip_tags($validated['title']);
        if (isset($validated['description']) && SchemaHas($record, 'description')) $record->description = strip_tags($validated['description']);
        if (isset($validated['full_description']) && SchemaHas($record, 'full_description')) $record->full_description = strip_tags($validated['full_description']);
        if (isset($validated['content']) && SchemaHas($record, 'content')) $record->content = strip_tags($validated['content']);
        if (isset($validated['category']) && SchemaHas($record, 'category')) $record->category = strip_tags($validated['category']);
        if (isset($validated['location']) && SchemaHas($record, 'location')) $record->location = strip_tags($validated['location']);
        if (isset($validated['price']) && SchemaHas($record, 'price')) $record->price = $validated['price'];
        if (isset($validated['price_per_night']) && SchemaHas($record, 'price_per_night')) $record->price_per_night = $validated['price_per_night'];

        $record->save();

        return response()->json([
            'success' => true,
            'message' => 'Post updated successfully.',
            'record'  => $record,
        ]);
    }
}

/**
 * Helper to check if model attribute exists on record table.
 */
function SchemaHas($model, $column) {
    return \Illuminate\Support\Facades\Schema::hasColumn($model->getTable(), $column);
}
