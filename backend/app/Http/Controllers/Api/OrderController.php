<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\Notification;
use App\Models\User;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // If admin, show all orders
        if ($user && $user->role === 'admin') {
            return response()->json(\App\Models\Order::with(['customer', 'businessOwner'])
                ->orderBy('created_at','desc')->get());
        }
        
        // If enterprise owner, show only their orders
        if ($user && $user->role === 'enterprise') {
            return response()->json(\App\Models\Order::with(['customer'])
                ->where('business_owner_id', $user->id)
                ->orderBy('created_at','desc')->get());
        }
        
        // If tourist, show only their orders
        if ($user && $user->role === 'tourist') {
            return response()->json(\App\Models\Order::with(['businessOwner'])
                ->where('customer_id', $user->id)
                ->orderBy('created_at','desc')->get());
        }
        
        // Default: return empty array for other roles
        return response()->json([]);
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
            'payment_method' => 'nullable|string|in:online,otc,cod',
            'user_role' => 'required|string',
            'user_id' => 'nullable|integer',
            'shipping_info' => 'nullable|array',
        ]);

        // Only tourists can place orders
        // Enterprise and resort are business management accounts, not customers
        if ($data['user_role'] !== 'tourist') {
            return response()->json([
                'error' => 'Only tourists can place orders. Enterprise and resort accounts are for business management only.'
            ], 403);
        }
        
        try {
            $orders = DB::transaction(function () use ($data, $request) {
                // Step 1: Group items by business owner
                $itemsByBusiness = [];
                
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

                    $businessOwnerId = $product->user_id;
                    
                    if (!isset($itemsByBusiness[$businessOwnerId])) {
                        $itemsByBusiness[$businessOwnerId] = [];
                    }
                    
                    $itemsByBusiness[$businessOwnerId][] = $item;
                }

                // Step 2: Reduce stock for all items
                foreach ($data['items'] as $item) {
                    $product = Product::find($item['id']);
                    $product->decrement('stock', $item['quantity']);
                }

                // Step 3: Get customer information
                $customer = $request->user();
                $customerName = $customer ? $customer->name : 'Guest';
                $customerEmail = $customer ? $customer->email : null;
                $customerPhone = $data['shipping_info']['phone'] ?? null;

                // Step 4: Create separate orders for each business
                $createdOrders = [];
                
                foreach ($itemsByBusiness as $businessOwnerId => $businessItems) {
                    // Calculate total for this business
                    $businessTotal = 0;
                    foreach ($businessItems as $item) {
                        $businessTotal += $item['price'] * $item['quantity'];
                    }
                    
                    $order = \App\Models\Order::create([
                        'items' => $businessItems,
                        'total' => $businessTotal,
                        'payment_method' => $data['payment_method'] ?? null,
                        'status' => 'pending',
                        'customer_id' => $customer ? $customer->id : null,
                        'customer_name' => $customerName,
                        'customer_email' => $customerEmail,
                        'customer_phone' => $customerPhone,
                        'shipping_address' => $data['shipping_info'] ?? null,
                        'business_owner_id' => $businessOwnerId,
                    ]);
                    
                    $createdOrders[] = $order;
                }
                
                return $createdOrders;
            });

            // Return the first order (or all orders info)
            $response = [
                'success' => true,
                'orders_created' => count($orders),
                'orders' => $orders,
                'message' => count($orders) > 1 
                    ? 'Multiple orders created for different businesses' 
                    : 'Order created successfully'
            ];

            // Fire-and-forget notifications (never break the flow)
            try {
                $customer = $request->user();
                $customerName = $customer ? $customer->name : 'Guest';
                foreach ($orders as $order) {
                    $amount = number_format((float) $order->total, 2);
                    // Notify business owner
                    Notification::notify(
                        $order->business_owner_id,
                        'order_new',
                        'Bagong Order!',
                        "{$customerName} placed an order worth ₱{$amount}.",
                        ['order_id' => $order->id, 'customer_id' => $order->customer_id],
                        '/enterprise/orders'
                    );
                    // Notify admins
                    Notification::notifyAdmins(
                        'order_new',
                        'New Order Placed',
                        "{$customerName} placed an order worth ₱{$amount}.",
                        ['order_id' => $order->id],
                        '/admin/dashboard'
                    );
                }
            } catch (\Throwable $e) {
                \Log::warning('Order notifications failed', ['error' => $e->getMessage()]);
            }
            
            // For backward compatibility, return the first order's structure
            if (count($orders) === 1) {
                return response()->json($orders[0], 201);
            }
            
            return response()->json($response, 201);
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
        $user = $request->user();
        
        // Verify business ownership - only the business owner can update their orders
        if ($user->role === 'enterprise' && $order->business_owner_id !== $user->id) {
            return response()->json([
                'error' => 'You can only update orders for your own products.'
            ], 403);
        }

        // Store old status for notification
        $oldStatus = $order->status;
        $newStatus = $data['status'];

        $order->update([
            'status' => $newStatus,
        ]);

        // Load the order with relationships for the response
        $order->load(['customer', 'businessOwner']);

        // Notify the customer (tourist) about the status change
        if ($oldStatus !== $newStatus && $order->customer_id) {
            try {
                Notification::notify(
                    $order->customer_id,
                    'order_status',
                    'Order Status Updated',
                    "Your order #{$order->id} is now {$newStatus}.",
                    ['order_id' => $order->id, 'status' => $newStatus],
                    '/status'
                );
            } catch (\Throwable $e) {
                \Log::warning('Order status notification failed', ['error' => $e->getMessage()]);
            }
        }

        // Here you could add real-time notification logic
        // For now, we'll rely on the frontend to poll for updates
        // In a production app, you might use WebSockets, Pusher, or similar

        return response()->json([
            'order' => $order,
            'status_changed' => $oldStatus !== $newStatus,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'message' => $oldStatus !== $newStatus 
                ? "Order status updated from {$oldStatus} to {$newStatus}" 
                : "Order status remains {$newStatus}"
        ]);
    }

    /**
     * Cancel an order (tourist only).
     * Restores product stock and fires notifications to the customer and seller.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        $order = \App\Models\Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if ((int) $order->customer_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (in_array($order->status, ['shipped', 'delivered', 'cancelled'])) {
            return response()->json([
                'message' => 'Order cannot be cancelled after it has been shipped.',
            ], 422);
        }

        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                Product::where('id', $item['id'])->increment('stock', $item['quantity']);
            }
            $order->update(['status' => 'cancelled']);
        });

        // Notifications (fire-and-forget)
        try {
            $touristName = $user->name ?? 'A customer';
            Notification::notify(
                $order->customer_id,
                'order_status',
                'Order Cancelled',
                "Your order #{$order->id} has been cancelled by you.",
                ['order_id' => $order->id, 'new_status' => 'cancelled'],
                '/status'
            );
            Notification::notify(
                $order->business_owner_id,
                'order_cancelled',
                'Order Cancelled by Customer',
                "{$touristName} cancelled order #{$order->id}.",
                ['order_id' => $order->id, 'customer_id' => $order->customer_id],
                '/enterprise/orders'
            );
        } catch (\Throwable $e) {
            \Log::warning('Cancel order notifications failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled successfully.',
            'order'   => $order->fresh(),
        ]);
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
