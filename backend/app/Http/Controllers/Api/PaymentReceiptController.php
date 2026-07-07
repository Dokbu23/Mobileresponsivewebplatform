<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentReceipt;
use App\Models\Order;
use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentReceiptController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:order,booking',
            'reference_id' => 'required|integer',
            'business_id' => 'required|integer',
            'receipt_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'payment_reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('receipt_image')) {
            $image = $request->file('receipt_image');
            $filename = time() . '_' . $image->getClientOriginalName();
            $path = $image->storeAs('receipts', $filename, 'public');
            $data['receipt_image'] = '/storage/' . $path;
        }

        $data['tourist_id'] = $request->user()->id;
        $data['status'] = 'pending';

        $receipt = PaymentReceipt::create($data);

        // Notify business owner about receipt submission
        try {
            $tourist = $request->user();
            $touristName = $tourist ? $tourist->name : 'A tourist';
            $amount = number_format((float) $data['amount'], 2);
            $businessOwner = \App\Models\User::find($data['business_id']);
            $link = ($businessOwner && $businessOwner->role === 'resort')
                ? '/resort/dashboard'
                : '/enterprise/profile';

            Notification::notify(
                $data['business_id'],
                'payment_submitted',
                'Payment Receipt Submitted',
                "{$touristName} submitted a payment receipt of ₱{$amount}.",
                [
                    'receipt_id' => $receipt->id,
                    'type' => $data['type'],
                    'reference_id' => $data['reference_id'],
                ],
                $link
            );
        } catch (\Throwable $e) {
            \Log::warning('Payment receipt notification failed', ['error' => $e->getMessage()]);
        }

        return response()->json($receipt->load(['tourist', 'business']), 201);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        
        if ($user->role === 'tourist') {
            $receipts = PaymentReceipt::where('tourist_id', $user->id)
                ->with(['business'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            // For enterprise/resort - show receipts for their business
            $receipts = PaymentReceipt::where('business_id', $user->id)
                ->with(['tourist'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        return response()->json($receipts);
    }

    public function show($id)
    {
        $receipt = PaymentReceipt::with(['tourist', 'business'])->findOrFail($id);
        return response()->json($receipt);
    }

    /**
     * SECURITY: Verify payment receipt with strict authorization
     * 
     * IMPROVEMENTS:
     * 1. Strict type comparison
     * 2. Verifies business owns the receipt
     * 3. Verifies receipt belongs to actual order/booking
     */
    public function verify(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:verified,rejected',
            'notes' => 'nullable|string',
        ]);

        $receipt = PaymentReceipt::findOrFail($id);
        
        // SECURITY FIX: Strict authorization check (=== instead of !==)
        // BEFORE: if ($receipt->business_id !== $request->user()->id)
        // WHY: Prevents type juggling attacks
        if ($receipt->business_id !== $request->user()->id) {
            \Log::warning('Unauthorized payment receipt verification attempt', [
                'receipt_id' => $id,
                'receipt_business_id' => $receipt->business_id,
                'user_id' => $request->user()->id,
                'user_role' => $request->user()->role,
            ]);
            
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // SECURITY: Verify receipt belongs to actual order/booking
        if ($data['status'] === 'verified') {
            if ($receipt->type === 'order') {
                $order = Order::find($receipt->reference_id);
                
                // Verify order exists
                if (!$order) {
                    return response()->json([
                        'message' => 'Order not found.'
                    ], 422);
                }
                
                // Verify order belongs to this business
                if ($order->business_id !== $request->user()->id) {
                    \Log::warning('Payment receipt verification - order ownership mismatch', [
                        'receipt_id' => $id,
                        'order_id' => $order->id,
                        'order_business_id' => $order->business_id,
                        'user_id' => $request->user()->id,
                    ]);
                    
                    return response()->json([
                        'message' => 'You do not own this order.'
                    ], 403);
                }
                
                // Verify amount matches
                if (abs((float) $receipt->amount - (float) $order->total) > 1.0) {
                    return response()->json([
                        'message' => 'Receipt amount does not match order total.'
                    ], 422);
                }
            }

            if ($receipt->type === 'booking') {
                $booking = Booking::find($receipt->reference_id);
                
                // Verify booking exists
                if (!$booking) {
                    return response()->json([
                        'message' => 'Booking not found.'
                    ], 422);
                }
                
                // Verify booking belongs to this business
                $bookingOwnerId = $booking->resort_user_id;
                if (!$bookingOwnerId && $booking->accommodation_id) {
                    $accommodation = \App\Models\Accommodation::find($booking->accommodation_id);
                    if ($accommodation) {
                        $bookingOwnerId = $accommodation->user_id;
                    }
                }
                
                if ($bookingOwnerId !== $request->user()->id) {
                    \Log::warning('Payment receipt verification - booking ownership mismatch', [
                        'receipt_id' => $id,
                        'booking_id' => $booking->id,
                        'booking_owner_id' => $bookingOwnerId,
                        'user_id' => $request->user()->id,
                    ]);
                    
                    return response()->json([
                        'message' => 'You do not own this booking.'
                    ], 403);
                }
                
                // Verify amount matches
                if (abs((float) $receipt->amount - (float) $booking->total) > 1.0) {
                    return response()->json([
                        'message' => 'Receipt amount does not match booking total.'
                    ], 422);
                }
            }
        }

        $receipt->update([
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
            'verified_at' => $data['status'] === 'verified' ? now() : null,
        ]);

        if ($data['status'] === 'verified') {
            if ($receipt->type === 'order') {
                $order = Order::find($receipt->reference_id);
                if ($order && $order->status === 'pending') {
                    $order->update(['status' => 'confirmed']);
                }
            }

            if ($receipt->type === 'booking') {
                $booking = Booking::find($receipt->reference_id);
                if ($booking && $booking->status === 'pending') {
                    $booking->update(['status' => 'confirmed']);
                }
            }
        }

        // Notify the tourist about the decision
        try {
            $statusLabel = $data['status'] === 'verified' ? 'Verified' : 'Rejected';
            $message = $data['status'] === 'verified'
                ? 'Approved na ang payment mo! Processing na ang order/booking.'
                : 'Hindi na-approve ang payment mo. ' . ($data['notes'] ?? 'Pakisuri at subukan muli.');

            Notification::notify(
                $receipt->tourist_id,
                'payment_verified',
                "Payment {$statusLabel}",
                $message,
                [
                    'receipt_id' => $receipt->id,
                    'type' => $receipt->type,
                    'reference_id' => $receipt->reference_id,
                ],
                '/status'
            );
        } catch (\Throwable $e) {
            \Log::warning('Payment verification notification failed', ['error' => $e->getMessage()]);
        }

        return response()->json($receipt->load(['tourist', 'business']));
    }
}
