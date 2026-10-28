<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $query = \App\Models\Product::query()
                ->with('owner:id,name,email,phone,store_name,resort_name')
                ->with('variations');

            // Auto-sync approved enterprise posts of type product to products table so they immediately appear in directory & my products
            try {
                $productPosts = \App\Models\EnterprisePost::where(function($q) {
                    $q->where('type', 'product')
                      ->orWhereNotNull('product_name');
                })->whereIn('status', ['approved', 'published'])
                  ->whereNotNull('user_id')
                  ->orderBy('created_at', 'asc')
                  ->get();
                foreach ($productPosts as $pPost) {
                    \App\Http\Controllers\Api\EnterprisePostController::syncProductFromPost($pPost);
                }
            } catch (\Throwable $e) {
                // sync error ignored
            }

            // Exclude non-published products for non-admin viewers
            if (!$user || $user->role !== 'admin') {
                if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'status')) {
                    $query->where(function($q) {
                        $q->whereIn('status', ['approved', 'published'])
                          ->orWhereNull('status');
                    });
                }
            }

            // Enterprise owner view: return their own products
            if ($user && $user->role === 'enterprise') {
                $query->where('user_id', $user->id);
            } elseif (!$user || $user->role !== 'admin') {
                // Public tourist view: show products from admin OR enterprise accounts
                $query->where(function($q) {
                    $q->whereNull('user_id')
                      ->orWhereHas('owner', function($userQuery) {
                          $userQuery->whereIn('role', ['admin', 'enterprise']);
                      });
                });
            }

            if ($request->has('search') && $request->input('search') !== '') {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            $products = $query->get();
            $products->each(function ($product) {
                $this->normalizeImages($product);
                $product->setAttribute(
                    'shop_name',
                    $product->shop_name
                        ?: ($product->enterprise_store
                            ?: ($product->store_name
                                ?: ($product->owner?->store_name
                                    ?: ($product->owner?->resort_name ?: $product->owner?->name))))
                );
            });

            return response()->json($products);
        } catch (\Throwable $e) {
            \Log::error('Product index error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }

    /**
     * Store a newly created resource in storage.
     * - Enterprise owner: sets is_registered = true automatically
     * - Admin: sets is_registered = false (static listing)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'price'       => 'required|numeric',
            'stock'       => 'nullable|integer',
            'image'       => 'nullable',
            'images'      => 'nullable',
            'category'    => 'nullable|string|max:255',
            'shop_name'   => 'nullable|string|max:255',
            'enterprise_store' => 'nullable|string|max:255',
            'user_id'     => 'nullable|integer',
        ]);

        if (!isset($data['stock'])) {
            $data['stock'] = 0;
        }

        $user = $request->user();

        $storedImages = [];

        // Handle multiple uploaded image files (images[])
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('products', 'public');
                    $storedImages[] = '/storage/' . $path;
                }
            }
        }

        // Handle single uploaded image file
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('products', 'public');
                $singlePath = '/storage/' . $path;
                if (!in_array($singlePath, $storedImages)) {
                    array_unshift($storedImages, $singlePath);
                }
                $data['image'] = $singlePath;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        } elseif (is_string($request->input('image')) && !empty($request->input('image'))) {
            $cleanImg = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $data['image'] = $cleanImg;
            if (!in_array($cleanImg, $storedImages)) {
                array_unshift($storedImages, $cleanImg);
            }
        }

        if (!$request->hasFile('images') && is_array($request->input('images'))) {
            $storedImages = array_merge($storedImages, array_map(
                fn ($image) => is_string($image) ? preg_replace('#^https?://[^/]+#', '', $image) : $image,
                $request->input('images')
            ));
        }

        // Merge any existing or string images provided in request
        if ($request->has('existing_images')) {
            $existing = $request->input('existing_images');
            $existingArr = [];
            if (is_string($existing)) {
                $decoded = json_decode($existing, true);
                if (is_array($decoded)) {
                    $existingArr = $decoded;
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

            $storedImages = array_merge($storedImages, $cleanedExisting);
        }

        if (!empty($storedImages)) {
            $storedImages = array_values(array_unique($storedImages));
            $data['images'] = $storedImages;
            if (empty($data['image'])) {
                $data['image'] = $storedImages[0];
            }
        }
        \App\Services\MediaUploadService::assertOwnedImageReferences(
            array_merge([$data['image'] ?? null], $storedImages),
            $user ? (int) $user->id : null
        );

        // Enterprise owner creates a registered listing; admin creates a static listing
        $data['user_id']       = ($user && $user->role === 'enterprise') ? $user->id : ($data['user_id'] ?? null);
        $data['is_registered'] = ($user && $user->role === 'enterprise');
        if (Schema::hasColumn('products', 'shop_name')) {
            $data['shop_name'] = trim((string) ($request->input('shop_name') ?: $request->input('enterprise_store') ?: ($user?->store_name ?: '')));
        }

        $product = \App\Models\Product::create($data);

        // Handle optional variations payload
        $this->syncVariations($request, $product, false);

        // Auto-create an Enterprise Post so it appears in the Posts feed
        if ($user && ($user->role === 'enterprise' || $user->role === 'resort')) {
            try {
                \App\Models\EnterprisePost::create([
                    'user_id'        => $user->id,
                    'type'           => 'product',
                    'title'          => $product->name,
                    'product_name'   => $product->name,
                    'content'        => $product->description ?: "Check out our product: {$product->name}! Now available in our store.",
                    'price'          => '₱' . number_format($product->price, 2),
                    'category'       => $product->category ?: 'Souvenir',
                    'seller_name'    => $user->store_name ?: ($user->resort_name ?: $user->name),
                    'location'       => $user->address ? "{$user->address}, {$user->barangay}" : ($user->barangay ?: 'Mansalay, Oriental Mindoro'),
                    'stock'          => $product->stock ? "{$product->stock} remaining" : 'In stock',
                    'image'          => $product->image,
                    'tags'           => [$product->category ?: 'Product', 'Souvenir', 'Mansalay'],
                    'likes'          => 0,
                    'saves'          => 0,
                ]);
            } catch (\Throwable $e) {
                \Log::warning('Failed to auto-create EnterprisePost for product: ' . $e->getMessage());
            }
        }

        $product = $product->load('variations');
        $this->normalizeImages($product);

        return response()->json($product, 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $item = \App\Models\Product::with('variations')->findOrFail($id);
        $this->normalizeImages($item);

        return response()->json($item);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        // allow partial updates - image can be file or string
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'price' => 'sometimes|required|numeric',
            'stock' => 'sometimes|nullable|integer',
            'image' => 'sometimes|nullable',
            'images' => 'sometimes|nullable',
            'category' => 'sometimes|nullable|string|max:255',
            'shop_name' => 'sometimes|nullable|string|max:255',
            'enterprise_store' => 'sometimes|nullable|string|max:255',
        ]);

        if (Schema::hasColumn('products', 'shop_name') && ($request->has('shop_name') || $request->has('enterprise_store'))) {
            $data['shop_name'] = trim((string) ($request->input('shop_name') ?: $request->input('enterprise_store') ?: ''));
        }

        $storedImages = [];
        $hasNewFileUpload = false;

        // 1. Handle primary uploaded image file (image)
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('products', 'public');
                $singlePath = '/storage/' . $path;
                $storedImages[] = $singlePath;
                $data['image'] = $singlePath;
                $hasNewFileUpload = true;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        }

        // 2. Handle multiple uploaded image files (images[])
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if ($file) {
                    $path = $file->store('products', 'public');
                    $newPath = '/storage/' . $path;
                    $storedImages[] = $newPath;
                    $hasNewFileUpload = true;
                }
            }
            if (empty($data['image']) && !empty($storedImages)) {
                $data['image'] = $storedImages[0];
            }
        }

        if (!$request->hasFile('images') && is_array($request->input('images'))) {
            $storedImages = array_merge($storedImages, array_map(
                fn ($image) => is_string($image) ? preg_replace('#^https?://[^/]+#', '', $image) : $image,
                $request->input('images')
            ));
            $hasNewFileUpload = !empty($request->input('images'));
        }

        // 3. Handle existing retained images
        if ($request->has('existing_images')) {
            $existing = $request->input('existing_images');
            $existingArr = [];
            if (is_string($existing)) {
                $decoded = json_decode($existing, true);
                if (is_array($decoded)) {
                    $existingArr = $decoded;
                }
            } elseif (is_array($existing)) {
                $existingArr = $existing;
            }

            // Clean URLs (strip absolute domain if present)
            $cleanedExisting = array_map(function($img) {
                if (is_string($img)) {
                    return preg_replace('#^https?://[^/]+#', '', $img);
                }
                return $img;
            }, $existingArr);

            if ($hasNewFileUpload) {
                // New uploads take precedence at the front
                $storedImages = array_merge($storedImages, $cleanedExisting);
            } else {
                // No new upload, existing retained images are primary
                $storedImages = array_merge($cleanedExisting, $storedImages);
            }
        }

        // 4. Fallback string image if no file was uploaded
        if (!$hasNewFileUpload && $request->filled('image') && is_string($request->input('image'))) {
            $cleanImg = preg_replace('#^https?://[^/]+#', '', $request->input('image'));
            $data['image'] = $cleanImg;
            if (!in_array($cleanImg, $storedImages)) {
                array_unshift($storedImages, $cleanImg);
            }
        }

        if (!empty($storedImages)) {
            $storedImages = array_values(array_unique(array_filter($storedImages)));
            $data['images'] = $storedImages;
            if (empty($data['image'])) {
                $data['image'] = $storedImages[0];
            }
        }

        $product = \App\Models\Product::findOrFail($id);
        \App\Services\MediaUploadService::assertOwnedImageReferences(
            array_merge([$data['image'] ?? null], $storedImages),
            $request->user() ? (int) $request->user()->id : null,
            array_merge(
                [$product->image],
                is_array($product->images) ? $product->images : []
            )
        );
        $product->update($data);

        // Handle optional variations payload (delete & re-create)
        $this->syncVariations($request, $product, true);

        // Also sync updated image & details to matching EnterprisePost so feeds stay in sync
        try {
            $postUpdateData = [];
            if (!empty($product->image)) {
                $postUpdateData['image'] = $product->image;
            }
            if ($product->price) {
                $postUpdateData['price'] = '₱' . number_format($product->price, 2);
            }
            if ($product->stock !== null) {
                $postUpdateData['stock'] = $product->stock ? "{$product->stock} in stock" : 'Out of stock';
            }
            if (!empty($product->category)) {
                $postUpdateData['category'] = $product->category;
            }

            if (!empty($postUpdateData)) {
                \App\Models\EnterprisePost::where(function($q) use ($product) {
                    if ($product->user_id) {
                        $q->where('user_id', $product->user_id);
                    }
                })->where(function($q) use ($product) {
                    $q->where('product_name', $product->name)
                      ->orWhere('title', $product->name);
                })->update($postUpdateData);
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed to sync post on product update: ' . $e->getMessage());
        }

        \Log::info('Product updated', ['id' => $id, 'image' => $product->image]);

        $product = $product->load('variations');
        $this->normalizeImages($product);

        return response()->json($product);
    }

    private function normalizeImages(\App\Models\Product $product): void
    {
        $cover = is_string($product->image) ? $product->image : '';
        $images = $product->images;
        if (is_string($images)) {
            $images = json_decode($images, true);
        }
        $images = is_array($images) ? $images : [];
        $images = array_values(array_filter($images, fn ($image) => is_string($image) && trim($image) !== ''));
        if (empty($images) && is_string($product->image) && trim($product->image) !== '') {
            $images[] = $product->image;
        }
        $product->setAttribute('images', $this->filterGalleryAgainstCover($images, $cover));
    }

    private function filterGalleryAgainstCover(array $images, string $cover): array
    {
        $coverFilename = $this->imageFilename($cover);
        $seen = [];

        return array_values(array_filter($images, function ($image) use ($coverFilename, &$seen) {
            $filename = $this->imageFilename($image);
            if ($filename === '' || $filename === $coverFilename || isset($seen[$filename])) {
                return false;
            }
            $seen[$filename] = true;
            return true;
        }));
    }

    private function imageFilename(?string $image): string
    {
        if (!is_string($image) || trim($image) === '') {
            return '';
        }

        $path = parse_url(trim($image), PHP_URL_PATH);
        $path = is_string($path) ? $path : trim($image);
        return strtolower(urldecode(basename(str_replace('\\', '/', $path))));
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(Request $request, $id)
    {
        $product = \App\Models\Product::find($id);
        if (!$product) {
            return response()->json(['message' => 'Product already removed or not found'], 200);
        }

        $user = $request->user();
        if ($user && $user->role !== 'admin' && (int)$product->user_id !== (int)$user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }

    /**
     * Get public business profile for an enterprise owner.
     * Returns owner info + all their products.
     * Used for the dedicated business page visible to tourists.
     */
    public function businessProfile($userId)
    {
        $owner = \App\Models\User::where('id', $userId)
            ->where('role', 'enterprise')
            ->whereIn('listing_status', ['approved', 'pending']) // Allow pending too for now
            ->select('id', 'name', 'email', 'phone', 'address', 'barangay', 'description', 'payment_details', 'created_at',
                     'store_name', 'store_description', 'store_logo', 'store_banner', 'store_is_setup')
            ->firstOrFail();

        $products = \App\Models\Product::where('user_id', $userId)
            ->with('variations')
            ->get();

        return response()->json([
            'owner'         => $owner,
            'products'      => $products,
            'is_registered' => true,
        ]);
    }

    /**
     * Sync the variations payload for a product.
     * Accepts either a JSON string or an array under the "variations" key.
     * For updates, existing variations are deleted first so the client
     * payload is always authoritative.
     */
    private function syncVariations(Request $request, \App\Models\Product $product, bool $isUpdate): void
    {
        if (! $request->has('variations')) {
            return;
        }

        $raw = $request->input('variations');

        // Accept JSON strings (typical for multipart/form-data) or arrays
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $variations = is_array($decoded) ? $decoded : [];
        } elseif (is_array($raw)) {
            $variations = $raw;
        } else {
            $variations = [];
        }

        // For updates, remove existing rows so we can re-create a clean set
        if ($isUpdate) {
            $product->variations()->delete();
        }

        foreach ($variations as $var) {
            if (empty($var['name']) || empty($var['value'])) {
                continue;
            }

            $price = $var['price'] ?? null;
            if ($price === '' ) {
                $price = null;
            }

            $product->variations()->create([
                'name'  => (string) $var['name'],
                'value' => (string) $var['value'],
                'price' => $price !== null ? (float) $price : null,
                'stock' => isset($var['stock']) ? (int) $var['stock'] : 0,
                'image' => $var['image'] ?? null,
            ]);
        }
    }
}
