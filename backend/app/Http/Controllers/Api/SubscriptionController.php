<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use App\Models\PaymentSetting;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /**
     * Get public payment settings (subscription amount and enabled payment methods).
     * Available to authenticated users (enterprise/resort).
     */
    public function getPaymentSettings()
    {
        $settings = PaymentSetting::current();
        $paymentMethods = PaymentMethod::enabled()
            ->select('id', 'name', 'account_name', 'account_number', 'instructions')
            ->get();

        return response()->json([
            'subscription_amount' => $settings->subscription_amount,
            'payment_methods' => $paymentMethods,
        ]);
    }

    /**
     * Get subscription status for current user
     */
    public function status(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'subscription_status' => $user->subscription_status,
            'subscription_paid_at' => $user->subscription_paid_at,
            'subscription_expires_at' => $user->subscription_expires_at,
            'subscription_amount' => $user->subscription_amount,
            'has_access' => $user->subscription_status === 'paid'
        ]);
    }

    /**
     * Upload subscription payment receipt
     */
    public function uploadPayment(Request $request)
    {
        $data = $request->validate([
            'amount' => 'required|numeric',
            'payment_method' => 'required|string',
            'payment_reference' => 'nullable|string',
            'receipt_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
            'notes' => 'nullable|string'
        ]);

        $user = $request->user();

        // Handle receipt image upload
        if ($request->hasFile('receipt_image')) {
            $image = $request->file('receipt_image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->storeAs('public/subscription_receipts', $imageName);
            $data['receipt_image'] = '/storage/subscription_receipts/' . $imageName;
        }

        $data['user_id'] = $user->id;
        $data['status'] = 'pending';
        
        $payment = SubscriptionPayment::create($data);

        // Update user status to pending
        $user->update(['subscription_status' => 'pending']);

        return response()->json([
            'message' => 'Payment receipt uploaded successfully. Waiting for admin verification.',
            'payment' => $payment
        ], 201);
    }

    /**
     * Get all subscription payments (admin only)
     */
    public function index()
    {
        $payments = SubscriptionPayment::with(['user', 'verifier'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($payments);
    }

    /**
     * Get specific subscription payment
     */
    public function show($id)
    {
        $payment = SubscriptionPayment::with(['user', 'verifier'])->findOrFail($id);
        return response()->json($payment);
    }

    /**
     * Verify or reject subscription payment (admin only)
     */
    public function verifyPayment(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:verified,rejected',
            'notes' => 'nullable|string'
        ]);

        $payment = SubscriptionPayment::with('user')->findOrFail($id);
        
        $payment->update([
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
            'verified_by' => $request->user()->id,
            'verified_at' => now()
        ]);

        // If verified, update user subscription status
        if ($data['status'] === 'verified') {
            $payment->user->update([
                'subscription_status' => 'paid',
                'subscription_paid_at' => now(),
                'subscription_expires_at' => now()->addYear(), // 1 year subscription
                'subscription_amount' => $payment->amount
            ]);
        } else {
            // If rejected, set back to unpaid
            $payment->user->update(['subscription_status' => 'unpaid']);
        }

        return response()->json([
            'message' => 'Payment ' . $data['status'] . ' successfully',
            'payment' => $payment->load(['user', 'verifier'])
        ]);
    }
}
