<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Only check for enterprise and resort roles
        if (!in_array($user->role, ['enterprise', 'resort'])) {
            return $next($request);
        }

        // Check if subscription is paid
        if ($user->subscription_status !== 'paid') {
            return response()->json([
                'message' => 'Subscription payment required to access this feature',
                'subscription_status' => $user->subscription_status,
                'requires_subscription' => true
            ], 403);
        }

        // Check if subscription expired
        if ($user->subscription_expires_at && $user->subscription_expires_at < now()) {
            $user->update(['subscription_status' => 'expired']);
            return response()->json([
                'message' => 'Subscription expired. Please renew your subscription.',
                'subscription_status' => 'expired',
                'requires_subscription' => true
            ], 403);
        }

        return $next($request);
    }
}
