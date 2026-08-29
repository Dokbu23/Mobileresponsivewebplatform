<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

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

            // Enterprise owner view: return their own products
            if ($user && $user->role === 'enterprise') {
                $query->where('user_id', $user->id);
            } elseif (!$user || $user->role !== 'admin') {
                // Public non-admin view: show products from admin OR approved & paid enterprise accounts
                $query->where(function($q) {
                    $q->whereNull('user_id')
                      ->orWhereHas('owner', function($userQuery) {
                          $userQuery->where('role', 'admin')
                                    ->orWhere(function($bq) {
                                        $bq->where('listing_status', 'approved')
                                           ->whereIn('subscription_status', ['paid', 'active']);
                                    });
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

            return response()->json($query->get());
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
            'user_id'     => 'nullable|integer',
        ]);

        if (!isset($data['stock'])) {
            $data['stock'] = 0;
        }

        $user = $request->user();

        // handle uploaded image file
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('products', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        } elseif (is_string($request->input('image'))) {
            $data['image'] = $request->input('image');
        }

        // Enterprise owner creates a registered listing; admin creates a static listing
        $data['user_id']       = ($user && $user->role === 'enterprise') ? $user->id : ($data['user_id'] ?? null);
        $data['is_registered'] = ($user && $user->role === 'enterprise');

        $product = \App\Models\Product::create($data);

        // Handle optional variations payload
        $this->syncVariations($request, $product, false);

        return response()->json($product->load('variations'), 201);
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
        ]);

        // handle uploaded image file
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                $path = $file->store('products', 'public');
                $data['image'] = '/storage/' . $path;
            } catch (\Exception $e) {
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        } elseif (is_string($request->input('image'))) {
            $data['image'] = $request->input('image');
        }

        $product = \App\Models\Product::findOrFail($id);
        $product->update($data);

        // Handle optional variations payload (delete & re-create)
        $this->syncVariations($request, $product, true);

            \Log::info('Product updated', ['id' => $id]);

        return response()->json($product->load('variations'));
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
