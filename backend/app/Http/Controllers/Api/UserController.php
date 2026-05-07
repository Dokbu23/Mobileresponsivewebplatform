<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
    public function updatePaymentDetails(Request $request)
    {
        $data = $request->validate([
            'payment_details' => 'required|array',
            'payment_details.*.type' => 'required|in:gcash,paymaya,bank_account',
            'payment_details.*.name' => 'required|string',
            'payment_details.*.account_number' => 'required|string',
            'payment_details.*.account_name' => 'required|string',
        ]);

        $user = $request->user();
        $user->update(['payment_details' => $data['payment_details']]);

        return response()->json([
            'message' => 'Payment details updated successfully',
            'user' => $user
        ]);
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        
        // Only return payment details for business accounts
        if (in_array($user->role, ['enterprise', 'resort'])) {
            return response()->json($user);
        }
        
        return response()->json(['message' => 'User not found'], 404);
    }

    public function testAuth(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'message' => 'Authentication working',
            'user' => $user,
            'role' => $user->role ?? 'no role'
        ]);
    }
}