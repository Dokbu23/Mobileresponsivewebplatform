<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ValidateApiRequest
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
        // Validate Content-Type for POST/PUT/PATCH requests
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $contentType = $request->header('Content-Type');
            
            // Allow JSON and multipart/form-data
            if (!str_contains($contentType, 'application/json') && 
                !str_contains($contentType, 'multipart/form-data') &&
                !str_contains($contentType, 'application/x-www-form-urlencoded')) {
                
                return response()->json([
                    'error' => 'Invalid Content-Type',
                    'message' => 'Content-Type must be application/json, multipart/form-data, or application/x-www-form-urlencoded'
                ], 400);
            }
        }

        // Validate request size (max 10MB)
        $maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if ($request->server('CONTENT_LENGTH') > $maxSize) {
            return response()->json([
                'error' => 'Request too large',
                'message' => 'Request size exceeds 10MB limit'
            ], 413);
        }

        // Sanitize input data
        $this->sanitizeInput($request);

        return $next($request);
    }

    /**
     * Sanitize input data to prevent XSS and injection attacks.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return void
     */
    protected function sanitizeInput(Request $request)
    {
        $input = $request->all();
        
        array_walk_recursive($input, function (&$value) {
            if (is_string($value)) {
                // Remove potentially dangerous characters
                $value = strip_tags($value);
                $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
        });

        $request->merge($input);
    }
}