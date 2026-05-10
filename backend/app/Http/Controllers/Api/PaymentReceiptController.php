<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentReceipt;
use App\Models\Order;
use App\Models\Booking;
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

    public function verify(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:verified,rejected',
            'notes' => 'nullable|string',
        ]);

        $receipt = PaymentReceipt::findOrFail($id);
        
        // Only business owner can verify their receipts
        if ($receipt->business_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($data['status'] === 'verified') {
            if ($receipt->type === 'order') {
                $order = Order::find($receipt->reference_id);
                if ($order && (float) $receipt->amount !== (float) $order->total) {
                    return response()->json([
                        'message' => 'Receipt amount does not match order total.'
                    ], 422);
                }
            }

            if ($receipt->type === 'booking') {
                $booking = Booking::find($receipt->reference_id);
                if ($booking && (float) $receipt->amount !== (float) $booking->total) {
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

        return response()->json($receipt->load(['tourist', 'business']));
    }
}
