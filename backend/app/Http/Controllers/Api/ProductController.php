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
        $query = \App\Models\Product::query();

        // Apply search filter (case-insensitive search on name and description)
        // Products do not support location or date filters
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
     * - Enterprise owner: sets is_registered = true automatically
     * - Admin: sets is_registered = false (static listing)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'price'       => 'required|numeric',
            'stock'       => 'required|integer',
            'image'       => 'nullable|file|image|max:5120',
            'category'    => 'nullable|string|max:255',
            'user_id'     => 'nullable|integer',
        ]);

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
        }

        // Enterprise owner creates a registered listing; admin creates a static listing
        $data['user_id']       = ($user && $user->role === 'enterprise') ? $user->id : ($data['user_id'] ?? null);
        $data['is_registered'] = ($user && $user->role === 'enterprise');

        $product = \App\Models\Product::create($data);

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
        $item = \App\Models\Product::findOrFail($id);
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
            \Log::info('=== UPDATE REQUEST DEBUG ===');
            \Log::info('Method: ' . $request->getMethod());
            \Log::info('Content-Type: ' . $request->header('content-type'));
            \Log::info('Has Image File: ' . ($request->hasFile('image') ? 'YES' : 'NO'));
            \Log::info('Request All: ', $request->all());
            \Log::info('Request Files: ', $request->files->all());
        // allow partial updates - image can be file or string
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'price' => 'sometimes|required|numeric',
            'stock' => 'sometimes|required|integer',
            'image' => 'sometimes|nullable|file|image|max:5120',
            'category' => 'sometimes|nullable|string|max:255',
        ]);

        \Log::info('Update request received', ['id' => $id, 'hasFile' => $request->hasFile('image'), 'allFields' => $request->all()]);

        // handle uploaded image file
        if ($request->hasFile('image')) {
            try {
                $file = $request->file('image');
                    \Log::info('File found - storing', ['name' => $file->getClientOriginalName(), 'size' => $file->getSize()]);
                $path = $file->store('products', 'public');
                $data['image'] = '/storage/' . $path;
                    \Log::info('File stored', ['path' => $path]);
            } catch (\Exception $e) {
                \Log::error('File storage error', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'Failed to store file: ' . $e->getMessage()], 400);
            }
        }

        $product = \App\Models\Product::findOrFail($id);
        $product->update($data);

            \Log::info('Product updated', ['id' => $id]);

        return response()->json($product);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        $product = \App\Models\Product::findOrFail($id);
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
            ->where('listing_status', 'approved')
            ->select('id', 'name', 'email', 'phone', 'address', 'barangay', 'description', 'payment_details')
            ->firstOrFail();

        $products = \App\Models\Product::where('user_id', $userId)->get();

        return response()->json([
            'owner'         => $owner,
            'products'      => $products,
            'is_registered' => true,
        ]);
    }
}
