<?php

return [
    
    /*
    |--------------------------------------------------------------------------
    | JWT Secret Key
    |--------------------------------------------------------------------------
    |
    | SECURITY: Separate secret key for JWT tokens (DO NOT use APP_KEY)
    | 
    | WHY: If APP_KEY is compromised, everything breaks (sessions, encryption, JWT)
    |      With separate JWT_SECRET, only tokens are affected
    | 
    | HOW TO GENERATE:
    | Run: php artisan tinker
    | Then: echo base64_encode(random_bytes(32));
    | Copy the output to .env as JWT_SECRET=xxx
    |
    */
    'secret' => env('JWT_SECRET', env('APP_KEY')),

    /*
    |--------------------------------------------------------------------------
    | JWT Time to Live (TTL)
    |--------------------------------------------------------------------------
    |
    | Token expiration time in minutes
    | Default: 1440 minutes (24 hours)
    |
    */
    'ttl' => env('JWT_TTL', 1440),

    /*
    |--------------------------------------------------------------------------
    | Refresh Time to Live
    |--------------------------------------------------------------------------
    |
    | How long (in minutes) can a token be refreshed before requiring re-login
    | Default: 20160 minutes (14 days)
    |
    */
    'refresh_ttl' => env('JWT_REFRESH_TTL', 20160),

    /*
    |--------------------------------------------------------------------------
    | JWT Algorithm
    |--------------------------------------------------------------------------
    |
    | Encryption algorithm for signing tokens
    | Default: HS256 (HMAC with SHA-256)
    |
    */
    'algo' => env('JWT_ALGO', 'HS256'),

];
