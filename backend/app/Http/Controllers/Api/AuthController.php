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
            'role' => ['nullable', 'in:tourist,admin,resort,enterprise'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            \Log::warning('Login failed - Invalid credentials', [
                'email' => $validated['email'],
                'user_found' => $user ? 'yes' : 'no',
                'password_match' => $user ? (Hash::check($validated['password'], $user->password) ? 'yes' : 'no') : 'N/A',
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

        // Check if email is verified (for non-admin users)
        if ($user->role !== 'admin' && !$user->email_verified_at) {
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

        $requiresSetup = empty($user->role) || $user->role === 'pending';

        \Log::info('Login successful', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'requires_setup' => $requiresSetup,
        ]);

        return response()->json([
            'message' => $requiresSetup ? 'Profile setup required' : 'Login successful',
            'requires_setup' => $requiresSetup,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'listing_status' => $user->listing_status,
                'subscription_status' => $user->subscription_status,
            ],
            'token' => $token,
            'expires_in' => $ttl,
        ]);
    }

    /**
     * Setup user profile (Account Type selection & optional business details after first login)
     */
    public function setupProfile(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:tourist,resort,enterprise'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'facebook_link' => ['nullable', 'string', 'max:500'],
            'instagram_link' => ['nullable', 'string', 'max:500'],
        ]);

        $role = $validated['role'];
        $user->role = $role;

        if ($role === 'tourist') {
            $user->listing_status = 'approved';
            $user->subscription_status = 'paid';
        } else {
            // Resort Owner or Enterprise Merchant
            $user->listing_status = 'pending';
            $user->subscription_status = 'unpaid';

            if (!empty($validated['business_name'])) {
                if ($role === 'resort') {
                    $user->resort_name = $validated['business_name'];
                } elseif ($role === 'enterprise') {
                    $user->store_name = $validated['business_name'];
                }
            }
            if (!empty($validated['barangay'])) {
                $user->barangay = $validated['barangay'];
            }
        }

        if (!empty($validated['phone'])) {
            $user->phone = $validated['phone'];
        }
        if (!empty($validated['facebook_link'])) {
            $user->facebook_link = $validated['facebook_link'];
        }
        if (!empty($validated['instagram_link'])) {
            $user->instagram_link = $validated['instagram_link'];
        }

        $user->save();

        // Generate fresh token with updated role in payload
        $ttl = config('jwt.ttl', 1440) * 60;
        $issuedAt = time();
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];
        $token = JWT::encode($payload, config('jwt.secret'), config('jwt.algo', 'HS256'));

        // Notify admins if business user registered
        if (in_array($role, ['resort', 'enterprise'])) {
            try {
                Notification::notifyAdmins(
                    'user_registered',
                    'New Business Profile Setup',
                    "{$user->name} ({$user->role}) set up their profile.",
                    ['new_user_id' => $user->id, 'role' => $user->role],
                    '/admin/users'
                );
            } catch (\Throwable $e) {
                \Log::warning('Profile setup notification failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'resort_name' => $user->resort_name,
                'store_name' => $user->store_name,
                'barangay' => $user->barangay,
                'phone' => $user->phone,
                'listing_status' => $user->listing_status,
                'subscription_status' => $user->subscription_status,
            ],
            'token' => $token,
            'expires_in' => $ttl,
        ]);
    }

    /**
     * SECURITY: Logout with token blacklist
     */
    public function logout(Request $request)
    {
        $token = $request->attributes->get('jwt_token') 
                 ?? $request->bearerToken() 
                 ?? $request->header('X-Auth-Token');
        
        if ($token) {
            try {
                $decoded = JWT::decode($token, new Key(config('jwt.secret'), config('jwt.algo', 'HS256')));
                $expiresAt = isset($decoded->exp) ? date('Y-m-d H:i:s', $decoded->exp) : now()->addDays(14);
                
                \App\Models\TokenBlacklist::add(
                    $token, 
                    $request->user()->id ?? null,
                    $expiresAt,
                    'logout'
                );
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
                'avatar' => $user->avatar,
                'phone' => $user->phone,
                'address' => $user->address,
                'barangay' => $user->barangay,
                'description' => $user->description,
                'facebook_link' => $user->facebook_link,
                'instagram_link' => $user->instagram_link,
                'resort_name' => $user->resort_name,
                'store_name' => $user->store_name,
                'listing_status' => $user->listing_status,
                'subscription_status' => $user->subscription_status,
            ]
        ]);
    }

    public function refresh(Request $request)
    {
        return response()->json(['token' => 'refresh']);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', 'string', 'in:tourist,resort,enterprise'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'owner_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'barangay' => $validated['barangay'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        // Default to 'pending' role if not specified to satisfy MySQL NOT NULL constraint
        $initialRole = !empty($validated['role']) ? $validated['role'] : 'pending';
        $user->role = $initialRole;
        $user->listing_status = in_array($initialRole, ['resort', 'enterprise']) ? 'pending' : ($initialRole === 'tourist' ? 'approved' : 'pending');
        $user->subscription_status = in_array($initialRole, ['resort', 'enterprise']) ? 'unpaid' : ($initialRole === 'tourist' ? 'paid' : 'unpaid');
        $user->is_active = true;
        $user->save();

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
            'requires_verification' => true,
        ], 201);
    }
}