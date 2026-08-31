<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    /**
     * SECURITY: Lista ng allowed origins (domains na puwedeng tumawag sa API)
     * 
     * WHY: Protektado tayo sa Cross-Site Request Forgery (CSRF) attacks
     * - Kapag may wildcard (*), kahit evil-site.com puwedeng kumuha ng data
     * - With whitelist, ONLY trusted domains ang makakagamit ng API
     * 
     * HOW TO UPDATE:
     * 1. Development: Add localhost:3000, localhost:5173, etc.
     * 2. Production: Add your actual domain (e.g., discovermansalay.com)
     * 3. Render: Add your-app.onrender.com
     * 4. Staging: Add staging domain kung meron
     */
    protected function getAllowedOrigins()
    {
        return [
            // Development URLs
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            
            // Production URLs
            'https://discovermansalay.com',
            'https://www.discovermansalay.com',
            
            // Render URLs
            'https://discmansalay.onrender.com',
            'https://discmansalay-frontend.onrender.com',
            'https://disc-mansalay.onrender.com',
            'https://disc-mansalay-frontend.onrender.com',
            
            // Environment variable override (supports comma-separated list)
            ...array_filter(array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:3000')))),
        ];
    }

    /**
     * Check kung allowed ang origin
     * 
     * @param  string|null  $origin
     * @return bool
     */
    protected function isOriginAllowed($origin)
    {
        if (!$origin) {
            return false;
        }

        // Allow any *.onrender.com origin (frontend/backend deployed on Render)
        if (preg_match('/^https:\/\/[a-z0-9-]+\.onrender\.com$/i', $origin)) {
            return true;
        }

        // Allow any *.vercel.app origin (frontend deployed on Vercel)
        if (preg_match('/^https:\/\/[a-z0-9-]+\.vercel\.app$/i', $origin)) {
            return true;
        }

        $allowedOrigins = $this->getAllowedOrigins();
        return in_array($origin, $allowedOrigins, true);
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Get the origin from request header
        $origin = $request->header('Origin');

        // Handle preflight OPTIONS request
        if ($request->isMethod('OPTIONS')) {
            $response = response()->json([], 200);
            
            // SECURITY: Only add CORS headers if origin is allowed
            if ($this->isOriginAllowed($origin)) {
                $response
                    ->header('Access-Control-Allow-Origin', $origin)
                    ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                    ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Auth-Token')
                    ->header('Access-Control-Allow-Credentials', 'true')
                    ->header('Access-Control-Max-Age', '86400'); // 24 hours
            }
            
            return $response;
        }

        // Handle actual request
        $response = $next($request);

        // SECURITY: Only add CORS headers if origin is allowed
        if ($this->isOriginAllowed($origin)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Auth-Token');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Expose-Headers', 'Authorization');
        }

        // SECURITY: Add additional security headers (protect against common attacks)
        $response->headers->set('X-Content-Type-Options', 'nosniff'); // Prevents MIME type sniffing
        $response->headers->set('X-Frame-Options', 'DENY'); // Prevents clickjacking
        $response->headers->set('X-XSS-Protection', '1; mode=block'); // Enables XSS filter
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Controls referrer info

        // SECURITY: Force HTTPS in production
        if (config('app.env') === 'production') {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
