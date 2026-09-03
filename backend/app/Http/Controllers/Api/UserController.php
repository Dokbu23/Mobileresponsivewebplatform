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

    public function paymentDetails(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'payment_details' => $user->payment_details ?? []
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

    /**
     * Change password for authenticated user (no OTP needed — they're already logged in).
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        if (!\Illuminate\Support\Facades\Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => bcrypt($data['password'])]);

        return response()->json(['message' => 'Password changed successfully.']);
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

    /**
     * Update the authenticated user's map location (lat/lng).
     */
    public function updateLocation(Request $request)
    {
        $user = $request->user();

        // Mansalay bounding box validation
        $data = $request->validate([
            'latitude'  => 'required|numeric|between:12.45,12.60',
            'longitude' => 'required|numeric|between:121.38,121.50',
        ]);

        $user->update([
            'latitude'  => $data['latitude'],
            'longitude' => $data['longitude'],
        ]);

        return response()->json([
            'message'   => 'Location updated successfully',
            'latitude'  => $user->latitude,
            'longitude' => $user->longitude,
        ]);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'resort_name' => 'nullable|string|max:255',
            'store_name'  => 'nullable|string|max:255',
            'phone'       => 'nullable|string|max:20',
            'address'     => 'nullable|string|max:500',
            'barangay'    => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'avatar'      => 'nullable',
        ]);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar'] = '/storage/' . $path;
        } elseif ($request->filled('avatar') && is_string($request->input('avatar'))) {
            $data['avatar'] = preg_replace('#^https?://[^/]+#', '', $request->input('avatar'));
        }

        $user->update(array_filter([
            'name'        => $data['name'],
            'resort_name' => $data['resort_name'] ?? null,
            'store_name'  => $data['store_name'] ?? null,
            'phone'       => $data['phone'] ?? null,
            'address'     => $data['address'] ?? null,
            'barangay'    => $data['barangay'] ?? null,
            'description' => $data['description'] ?? null,
            'avatar'      => $data['avatar'] ?? null,
        ], fn($v) => $v !== null));

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }
}