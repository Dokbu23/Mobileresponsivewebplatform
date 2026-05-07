<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @param  string  ...$roles
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'error' => 'Authentication required',
                'message' => 'Please login to access this resource'
            ], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json([
                'error' => 'Insufficient permissions',
                'message' => "Access denied. Required roles: " . implode(', ', $roles) . ". Your role: {$user->role}"
            ], 403);
        }

        return $next($request);
    }
}