<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        \Log::info('Login attempt', [
            'email' => $request->email ?? 'no email',
            'role' => $request->role ?? 'no role',
        ]);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'role' => ['required', 'in:tourist,admin,resort,enterprise'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password) || $user->role !== $validated['role']) {
            \Log::warning('Login failed - Invalid credentials', [
                'email' => $validated['email'],
                'role' => $validated['role'],
                'user_found' => $user ? 'yes' : 'no',
                'password_match' => $user ? (Hash::check($validated['password'], $user->password) ? 'yes' : 'no') : 'N/A',
                'role_match' => $user ? ($user->role === $validated['role'] ? 'yes' : 'no') : 'N/A',
            ]);
            
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        // Check if email is verified (for tourists, resort, and enterprise)
        if (in_array($user->role, ['tourist', 'resort', 'enterprise']) && !$user->email_verified_at) {
            \Log::warning('Login failed - Email not verified', [
                'email' => $user->email,
                'role' => $user->role,
                'email_verified_at' => $user->email_verified_at,
            ]);
            
            return response()->json([
                'message' => 'Please verify your email before logging in',
                'requires_verification' => true,
                'email' => $user->email,
            ], 403);
        }

        // Generate JWT token
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60), // 24 hours
        ];

        $token = JWT::encode($payload, config('app.key'), 'HS256');

        \Log::info('Login successful', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'listing_status' => $user->listing_status,
                'subscription_status' => $user->subscription_status,
            ],
            'token' => $token,
            'expires_in' => 24 * 60 * 60, // 24 hours in seconds
        ]);
    }

    public function logout(Request $request)
    {
        // For JWT, we can't really "logout" server-side without a blacklist
        // The frontend should just remove the token
        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        
        // Generate new JWT token
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60), // 24 hours
        ];

        $token = JWT::encode($payload, config('app.key'), 'HS256');

        return response()->json([
            'token' => $token,
            'expires_in' => 24 * 60 * 60,
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:tourist,resort,enterprise'],
            // Optional fields for business accounts
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            // Extended registration details for admin review
            'owner_name' => ['nullable', 'string', 'max:255'],
            'facilities' => ['nullable', 'string', 'max:1000'],
            'price_range' => ['nullable', 'string', 'max:255'],
            'rooms' => ['nullable', 'string', 'max:255'],
            'registration_number' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $registrationDetails = array_filter([
            'owner_name' => $validated['owner_name'] ?? null,
            'facilities' => $validated['facilities'] ?? null,
            'price_range' => $validated['price_range'] ?? null,
            'rooms' => $validated['rooms'] ?? null,
            'registration_number' => $validated['registration_number'] ?? null,
            'category' => $validated['category'] ?? null,
        ], static fn ($value) => $value !== null && $value !== '');

        // Create user with pending status for business accounts
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'listing_status' => in_array($validated['role'], ['resort', 'enterprise']) ? 'pending' : 'approved',
            'subscription_status' => in_array($validated['role'], ['resort', 'enterprise']) ? 'unpaid' : 'paid',
            'is_active' => true,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'barangay' => $validated['barangay'] ?? null,
            'description' => $validated['description'] ?? null,
            'registration_details' => empty($registrationDetails) ? null : $registrationDetails,
        ]);

        return response()->json([
            'message' => 'Registration successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'listing_status' => $user->listing_status,
                'subscription_status' => $user->subscription_status,
            ],
            'requires_verification' => in_array($validated['role'], ['resort', 'enterprise']),
        ], 201);
    }
}