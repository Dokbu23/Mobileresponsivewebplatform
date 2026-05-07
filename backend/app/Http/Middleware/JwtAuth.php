<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JwtAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken() ?? $request->header('X-Auth-Token');
        
        if (!$token) {
            return response()->json([
                'error' => 'Authentication token required',
                'message' => 'Please provide a valid authentication token'
            ], 401);
        }

        try {
            $decoded = JWT::decode($token, new Key(config('app.key'), 'HS256'));
            $user = User::find($decoded->user_id);
            
            if (!$user) {
                return response()->json([
                    'error' => 'Invalid token',
                    'message' => 'User not found'
                ], 401);
            }

            // Add user to request for use in controllers
            $request->merge(['auth_user' => $user]);
            $request->setUserResolver(function () use ($user) {
                return $user;
            });

        } catch (Exception $e) {
            return response()->json([
                'error' => 'Invalid token',
                'message' => 'Authentication token is invalid or expired'
            ], 401);
        }

        return $next($request);
    }
}