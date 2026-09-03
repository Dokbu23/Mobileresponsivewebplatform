<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use App\Models\PaymentSetting;
use App\Models\PaymentMethod;
use App\Models\Notification;
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
            'has_access' => in_array($user->subscription_status, ['paid', 'active']),
            'store_is_setup' => (bool) $user->store_is_setup,
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
            'receipt_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
            'notes' => 'nullable|string'
        ]);

        $user = $request->user();

        // Handle receipt image upload
        if ($request->hasFile('receipt_image')) {
            $image = $request->file('receipt_image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $path = $image->storeAs('subscription_receipts', $imageName, 'public');
            $data['receipt_image'] = '/storage/' . $path;
        }

        $data['user_id'] = $user->id;
        $data['status'] = 'pending';
        
        $payment = SubscriptionPayment::create($data);

        // Update user status to pending
        $user->subscription_status = 'pending';
        $user->save();

        // Notify all admins of subscription payment submission
        try {
            $amount = number_format((float) $data['amount'], 2);
            Notification::notifyAdmins(
                'subscription_paid',
                'Subscription Payment Submitted',
                "{$user->name} submitted a subscription payment of ₱{$amount}.",
                ['payment_id' => $payment->id, 'user_id' => $user->id],
                '/admin/subscriptions'
            );
        } catch (\Throwable $e) {
            \Log::warning('Subscription submission notification failed', ['error' => $e->getMessage()]);
        }

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

        // If verified, update user subscription status and auto-approve listing
        $targetUser = $payment->user;
        if ($data['status'] === 'verified') {
            $targetUser->subscription_status = 'paid';
            $targetUser->subscription_paid_at = now();
            $targetUser->subscription_expires_at = now()->addYear(); // 1 year subscription
            $targetUser->subscription_amount = $payment->amount;
            $targetUser->listing_status = 'approved'; // Auto-approve listing when payment is verified
            $targetUser->save();
        } else {
            // If rejected, set back to unpaid
            $targetUser->subscription_status = 'unpaid';
            $targetUser->save();
        }

        // Notify the business owner about the decision
        try {
            $ownerRole = $payment->user->role ?? 'enterprise';
            $ownerLink = $ownerRole === 'resort' ? '/resort/dashboard' : '/enterprise/dashboard';
            if ($data['status'] === 'verified') {
                Notification::notify(
                    $payment->user_id,
                    'subscription_paid',
                    'Subscription Activated',
                    'Approved na ang subscription payment mo! Makakagamit ka na ng buong platform.',
                    ['payment_id' => $payment->id],
                    $ownerLink
                );
            } else {
                Notification::notify(
                    $payment->user_id,
                    'subscription_paid',
                    'Subscription Rejected',
                    'Hindi na-approve ang subscription payment mo. ' . ($data['notes'] ?? 'Pakisuri at subukan muli.'),
                    ['payment_id' => $payment->id],
                    $ownerLink
                );
            }
        } catch (\Throwable $e) {
            \Log::warning('Subscription verification notification failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'Payment ' . $data['status'] . ' successfully',
            'payment' => $payment->load(['user', 'verifier'])
        ]);
    }
}
