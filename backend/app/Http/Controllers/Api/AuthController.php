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
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'role' => ['required', 'in:tourist,admin,resort,enterprise'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password) || $user->role !== $validated['role']) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
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

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
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
}