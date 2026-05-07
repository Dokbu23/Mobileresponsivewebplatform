<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return response()->json(\App\Models\Order::orderBy('created_at','desc')->get());
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required',
            'items.*.quantity' => 'required|integer|min:1',
            'total' => 'required|numeric',
            'payment_method' => 'nullable|string',
            'user_role' => 'required|string',
            'user_id' => 'nullable|integer',
        ]);

        // Only tourists can place orders
        // Enterprise and resort are business management accounts, not customers
        if ($data['user_role'] !== 'tourist') {
            return response()->json([
                'error' => 'Only tourists can place orders. Enterprise and resort accounts are for business management only.'
            ], 403);
        }
        
        try {
            $order = DB::transaction(function () use ($data) {
                // Step 1: Validate stock availability for all items
                foreach ($data['items'] as $item) {
                    $product = Product::find($item['id']);
                    
                    if (!$product) {
                        throw new \Exception("Product not found: {$item['id']}");
                    }
                    
                    if ($product->stock < $item['quantity']) {
                        throw new \Exception(
                            "Insufficient stock for product: {$product->name}. " .
                            "Available: {$product->stock}, Requested: {$item['quantity']}"
                        );
                    }
                }

                // Step 2: Reduce stock for all items
                foreach ($data['items'] as $item) {
                    $product = Product::find($item['id']);
                    $product->decrement('stock', $item['quantity']);
                }

                // Step 3: Create order
                return \App\Models\Order::create([
                    'items' => $data['items'],
                    'total' => (int)$data['total'],
                    'payment_method' => $data['payment_method'] ?? null,
                    'status' => 'pending',
                ]);
            });

            return response()->json($order, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
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
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,shipped,delivered',
        ]);

        $order = \App\Models\Order::findOrFail($id);
        $order->update([
            'status' => $data['status'],
        ]);

        return response()->json($order);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
