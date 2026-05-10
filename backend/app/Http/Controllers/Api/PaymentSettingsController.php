<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentSettingsController extends Controller
{
    /**
     * Get current payment settings (subscription amount).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSettings()
    {
        $settings = PaymentSetting::current();
        
        return response()->json([
            'subscription_amount' => $settings->subscription_amount,
            'updated_at' => $settings->updated_at,
        ]);
    }

    /**
     * Update subscription amount.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateSettings(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'subscription_amount' => [
                'required',
                'numeric',
                'min:0.01',
                'regex:/^\d+(\.\d{1,2})?$/', // Max 2 decimal places
            ],
        ], [
            'subscription_amount.required' => 'Subscription amount is required.',
            'subscription_amount.numeric' => 'Subscription amount must be a number.',
            'subscription_amount.min' => 'Subscription amount must be greater than 0.',
            'subscription_amount.regex' => 'Subscription amount can have at most 2 decimal places.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $settings = PaymentSetting::current();
        $settings->subscription_amount = $request->subscription_amount;
        $settings->save();

        return response()->json([
            'message' => 'Subscription amount updated successfully',
            'subscription_amount' => $settings->subscription_amount,
        ]);
    }

    /**
     * Get all payment methods.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $methods = PaymentMethod::orderBy('created_at', 'desc')->get();
        
        return response()->json($methods);
    }

    /**
     * Create a new payment method.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:payment_methods,name',
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:100',
            'instructions' => 'nullable|string|max:1000',
            'enabled' => 'boolean',
        ], [
            'name.required' => 'Payment method name is required.',
            'name.unique' => 'This payment method name already exists.',
            'account_name.required' => 'Account name is required.',
            'account_number.required' => 'Account number is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $method = PaymentMethod::create($request->all());

        return response()->json([
            'message' => 'Payment method created successfully',
            'payment_method' => $method,
        ], 201);
    }

    /**
     * Update an existing payment method.
     *
     * @param \Illuminate\Http\Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $method = PaymentMethod::find($id);

        if (!$method) {
            return response()->json([
                'message' => 'Payment method not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100|unique:payment_methods,name,' . $id,
            'account_name' => 'sometimes|required|string|max:255',
            'account_number' => 'sometimes|required|string|max:100',
            'instructions' => 'nullable|string|max:1000',
            'enabled' => 'boolean',
        ], [
            'name.unique' => 'This payment method name already exists.',
            'account_name.required' => 'Account name is required.',
            'account_number.required' => 'Account number is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $method->update($request->all());

        return response()->json([
            'message' => 'Payment method updated successfully',
            'payment_method' => $method,
        ]);
    }

    /**
     * Delete a payment method.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $method = PaymentMethod::find($id);

        if (!$method) {
            return response()->json([
                'message' => 'Payment method not found',
            ], 404);
        }

        // Check if this is the only enabled method
        $enabledCount = PaymentMethod::where('enabled', true)->count();
        if ($method->enabled && $enabledCount <= 1) {
            return response()->json([
                'message' => 'Cannot delete the last enabled payment method. At least one payment method must remain enabled.',
            ], 409);
        }

        // Check if method is referenced by subscription payments
        $paymentsCount = \App\Models\SubscriptionPayment::where('payment_method', $method->name)->count();
        if ($paymentsCount > 0) {
            return response()->json([
                'message' => 'Cannot delete payment method. It is referenced by existing subscription payments.',
                'referenced_payments_count' => $paymentsCount,
            ], 409);
        }

        $method->delete();

        return response()->json([
            'message' => 'Payment method deleted successfully',
        ]);
    }

    /**
     * Toggle payment method enabled status.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggle($id)
    {
        $method = PaymentMethod::find($id);

        if (!$method) {
            return response()->json([
                'message' => 'Payment method not found',
            ], 404);
        }

        // If trying to disable, check if this is the only enabled method
        if ($method->enabled) {
            $enabledCount = PaymentMethod::where('enabled', true)->count();
            if ($enabledCount <= 1) {
                return response()->json([
                    'message' => 'Cannot disable the last enabled payment method. At least one payment method must remain enabled.',
                ], 409);
            }
        }

        $method->enabled = !$method->enabled;
        $method->save();

        return response()->json([
            'message' => 'Payment method ' . ($method->enabled ? 'enabled' : 'disabled') . ' successfully',
            'payment_method' => $method,
        ]);
    }
}
