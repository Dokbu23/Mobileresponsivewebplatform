<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use Illuminate\Http\Request;

class PromoCodeController extends Controller
{
    /** List all promo codes for the authenticated business owner */
    public function index(Request $request)
    {
        $codes = PromoCode::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($codes);
    }

    /** Create a new promo code */
    public function store(Request $request)
    {
        $data = $request->validate([
            'code'        => 'required|string|max:50|unique:promo_codes,code',
            'description' => 'nullable|string|max:255',
            'type'        => 'required|in:percent,fixed',
            'value'       => 'required|numeric|min:0.01',
            'min_amount'  => 'nullable|numeric|min:0',
            'max_uses'    => 'nullable|integer|min:1',
            'is_active'   => 'nullable|boolean',
            'expires_at'  => 'nullable|date|after:now',
        ]);

        // Validate percent max
        if ($data['type'] === 'percent' && $data['value'] > 100) {
            return response()->json(['message' => 'Percent discount cannot exceed 100%.'], 422);
        }

        $data['user_id']    = $request->user()->id;
        $data['code']       = strtoupper(trim($data['code']));
        $data['min_amount'] = $data['min_amount'] ?? 0;
        $data['is_active']  = $data['is_active'] ?? true;

        $code = PromoCode::create($data);
        return response()->json($code, 201);
    }

    /** Update a promo code */
    public function update(Request $request, int $id)
    {
        $code = PromoCode::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $data = $request->validate([
            'description' => 'nullable|string|max:255',
            'type'        => 'sometimes|in:percent,fixed',
            'value'       => 'sometimes|numeric|min:0.01',
            'min_amount'  => 'nullable|numeric|min:0',
            'max_uses'    => 'nullable|integer|min:1',
            'is_active'   => 'nullable|boolean',
            'expires_at'  => 'nullable|date',
        ]);

        $code->update($data);
        return response()->json($code);
    }

    /** Delete a promo code */
    public function destroy(Request $request, int $id)
    {
        $code = PromoCode::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        $code->delete();
        return response()->json(['message' => 'Promo code deleted']);
    }

    /**
     * Apply/validate a promo code (tourist endpoint).
     * Returns discount info without incrementing used_count yet.
     */
    public function apply(Request $request)
    {
        $data = $request->validate([
            'code'       => 'required|string',
            'amount'     => 'required|numeric|min:0',
            'owner_id'   => 'nullable|integer', // optional: validate against specific business
        ]);

        $code = PromoCode::where('code', strtoupper(trim($data['code'])))->first();

        if (!$code) {
            return response()->json(['valid' => false, 'message' => 'Promo code not found.'], 404);
        }

        $validation = $code->isValid((float) $data['amount'], $data['owner_id'] ?? null);

        if (!$validation['valid']) {
            return response()->json($validation, 422);
        }

        $discount = $code->calculateDiscount((float) $data['amount']);

        return response()->json([
            'valid'       => true,
            'message'     => $validation['message'],
            'code'        => $code->code,
            'type'        => $code->type,
            'value'       => $code->value,
            'discount'    => $discount,
            'final_amount'=> max(0, (float) $data['amount'] - $discount),
            'description' => $code->description,
        ]);
    }

    /**
     * Redeem a promo code — increment used_count.
     * Called after a successful order/booking is created.
     */
    public function redeem(Request $request)
    {
        $data = $request->validate([
            'code'     => 'required|string',
            'amount'   => 'required|numeric|min:0',
            'owner_id' => 'nullable|integer',
        ]);

        $code = PromoCode::where('code', strtoupper(trim($data['code'])))->first();
        if (!$code) {
            return response()->json(['message' => 'Code not found'], 404);
        }

        $validation = $code->isValid((float) $data['amount'], $data['owner_id'] ?? null);
        if (!$validation['valid']) {
            return response()->json($validation, 422);
        }

        $code->increment('used_count');

        return response()->json([
            'success'  => true,
            'discount' => $code->calculateDiscount((float) $data['amount']),
        ]);
    }
}
