<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends Controller
{
    /**
     * SECURITY: Login with improved JWT token generation
     * 
     * IMPROVEMENTS:
     * 1. Uses JWT_SECRET (not APP_KEY)
     * 2. Configurable token expiration (JWT_TTL)
     * 3. Adds issued_at timestamp
     * 4. Validates user is active
     */
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

        // SECURITY: Check if user account is active
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated. Please contact support.',
            ], 403);
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

        // SECURITY FIX: Use JWT_SECRET and configurable TTL
        $ttl = config('jwt.ttl', 1440) * 60; // Convert minutes to seconds
        $issuedAt = time();
        
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];

        $token = JWT::encode($payload, config('jwt.secret'), config('jwt.algo', 'HS256'));

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
            'expires_in' => $ttl,
        ]);
    }

    /**
     * SECURITY: Logout with token blacklist
     * 
     * BEFORE: JWT logout did nothing (tokens stayed valid)
     * AFTER: Add token to blacklist so it can't be reused
     */
    public function logout(Request $request)
    {
        // Get token from request
        $token = $request->attributes->get('jwt_token') 
                 ?? $request->bearerToken() 
                 ?? $request->header('X-Auth-Token');
        
        if ($token) {
            try {
                // Decode to get expiration time
                $decoded = JWT::decode($token, new Key(config('jwt.secret'), config('jwt.algo', 'HS256')));
                $expiresAt = isset($decoded->exp) ? date('Y-m-d H:i:s', $decoded->exp) : now()->addDays(14);
                
                // Add to blacklist
                \App\Models\TokenBlacklist::add(
                    $token, 
                    $request->user()->id ?? null,
                    $expiresAt,
                    'logout'
                );
                
                \Log::info('User logged out', [
                    'user_id' => $request->user()->id ?? null,
                    'token_blacklisted' => true,
                ]);
            } catch (\Exception $e) {
                \Log::warning('Logout token blacklist failed', ['error' => $e->getMessage()]);
            }
        }
        
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

    /**
     * SECURITY: Token refresh with improved security
     * 
     * IMPROVEMENTS:
     * 1. Uses JWT_SECRET
     * 2. Validates user is still active
     * 3. Blacklists old token
     */
    public function refresh(Request $request)
    {
        $user = $request->user();
        
        // SECURITY: Validate user is still active
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        // Blacklist the old token
        $oldToken = $request->attributes->get('jwt_token') 
                   ?? $request->bearerToken() 
                   ?? $request->header('X-Auth-Token');
        
        if ($oldToken) {
            try {
                $decoded = JWT::decode($oldToken, new Key(config('jwt.secret'), config('jwt.algo', 'HS256')));
                $expiresAt = isset($decoded->exp) ? date('Y-m-d H:i:s', $decoded->exp) : now()->addDays(14);
                
                \App\Models\TokenBlacklist::add(
                    $oldToken, 
                    $user->id,
                    $expiresAt,
                    'refresh'
                );
            } catch (\Exception $e) {
                \Log::warning('Token refresh blacklist failed', ['error' => $e->getMessage()]);
            }
        }

        // Generate new JWT token
        $ttl = config('jwt.ttl', 1440) * 60; // Convert minutes to seconds
        $issuedAt = time();
        
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];

        $token = JWT::encode($payload, config('jwt.secret'), config('jwt.algo', 'HS256'));

        return response()->json([
            'token' => $token,
            'expires_in' => $ttl,
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

        // SECURITY FIX: Create user with safe fields only (mass assignment protection)
        // Sensitive fields (role, listing_status, subscription_status) are now guarded
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'barangay' => $validated['barangay'] ?? null,
            'description' => $validated['description'] ?? null,
            'registration_details' => empty($registrationDetails) ? null : $registrationDetails,
        ]);

        // SECURITY: Explicitly set protected fields (cannot be mass assigned)
        // This prevents privilege escalation attacks
        $user->role = $validated['role'];
        $user->listing_status = in_array($validated['role'], ['resort', 'enterprise']) ? 'pending' : 'approved';
        $user->subscription_status = in_array($validated['role'], ['resort', 'enterprise']) ? 'unpaid' : 'paid';
        $user->is_active = true;
        $user->save();

        // Notify admins of new registration (fire-and-forget)
        try {
            Notification::notifyAdmins(
                'user_registered',
                'New User Registration',
                "{$user->name} ({$user->role}) just registered.",
                ['new_user_id' => $user->id, 'role' => $user->role],
                '/admin/users'
            );
        } catch (\Throwable $e) {
            \Log::warning('User registration notification failed', ['error' => $e->getMessage()]);
        }

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