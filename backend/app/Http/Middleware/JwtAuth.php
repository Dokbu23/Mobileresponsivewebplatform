<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\TokenBlacklist;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Exception;

class JwtAuth
{
    /**
     * SECURITY: JWT Authentication with Token Blacklist
     * 
     * IMPROVEMENTS:
     * 1. Uses separate JWT_SECRET (not APP_KEY)
     * 2. Checks token blacklist (for logout support)
     * 3. Validates token expiration
     * 4. Validates user is still active
     * 
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Allow OPTIONS requests to pass through without authentication (CORS preflight)
        if ($request->isMethod('OPTIONS')) {
            return response()->json([], 200);
        }

        // Extract token from Authorization header or X-Auth-Token header
        $token = $request->bearerToken() 
            ?? $request->header('X-Auth-Token') 
            ?? $request->header('x-auth-token');

        if (!$token && $authHeader = $request->header('Authorization')) {
            if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }
        if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            if (preg_match('/Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
                $token = $matches[1];
            }
        }
        if (!$token && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            if (preg_match('/Bearer\s+(\S+)/i', $_SERVER['REDIRECT_HTTP_AUTHORIZATION'], $matches)) {
                $token = $matches[1];
            }
        }
        
        if (!$token) {
            return response()->json([
                'error' => 'Authentication token required',
                'message' => 'Please provide a valid authentication token'
            ], 401);
        }

        try {
            // SECURITY FIX #1: Use separate JWT_SECRET (not APP_KEY)
            // WHY: If APP_KEY leaks, only JWT tokens are affected (not sessions/encryption)
            $decoded = JWT::decode($token, new Key(config('jwt.secret'), config('jwt.algo', 'HS256')));
            
            // SECURITY FIX #2: Check token blacklist (logout support)
            // WHY: JWT is stateless, but we need to support logout
            if (TokenBlacklist::isBlacklisted($token)) {
                return response()->json([
                    'error' => 'Token revoked',
                    'message' => 'This token has been revoked. Please login again.'
                ], 401);
            }

            // SECURITY FIX #3: Validate token expiration (belt and suspenders)
            // JWT library already checks this, but we double-check for safety
            if (isset($decoded->exp) && $decoded->exp < time()) {
                return response()->json([
                    'error' => 'Token expired',
                    'message' => 'Authentication token has expired. Please login again.'
                ], 401);
            }

            // Find user from token
            $user = User::find($decoded->user_id);
            
            if (!$user) {
                return response()->json([
                    'error' => 'Invalid token',
                    'message' => 'User not found'
                ], 401);
            }

            // SECURITY FIX #4: Check if user is still active
            // WHY: Admin might have deactivated the account
            if (!$user->is_active) {
                return response()->json([
                    'error' => 'Account deactivated',
                    'message' => 'Your account has been deactivated. Please contact support.'
                ], 403);
            }

            // Add user to request for use in controllers
            $request->merge(['auth_user' => $user]);
            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            // Store token in request for logout functionality
            $request->attributes->add(['jwt_token' => $token]);

        } catch (ExpiredException $e) {
            return response()->json([
                'error' => 'Token expired',
                'message' => 'Authentication token has expired. Please login again.'
            ], 401);
        } catch (Exception $e) {
            \Log::warning('JWT validation failed', [
                'error' => $e->getMessage(),
                'ip' => $request->ip(),
            ]);
            
            return response()->json([
                'error' => 'Invalid token',
                'message' => 'Authentication token is invalid or expired: ' . $e->getMessage()
            ], 401);
        }

        return $next($request);
    }
}