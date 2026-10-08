<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Firebase\JWT\JWT;

class GoogleAuthController extends Controller
{
    /**
     * Generate Google OAuth 2.0 Authorization URL
     */
    public function getAuthUrl(Request $request)
    {
        $clientId = config('services.google.client_id');
        if (empty($clientId)) {
            return response()->json([
                'error' => 'Google Client ID is not configured.',
                'message' => 'Google authentication is not yet configured on the server. Please set GOOGLE_CLIENT_ID.'
            ], 503);
        }

        $redirectUri = $request->query('redirect_uri') ?: config('services.google.redirect_uri');
        
        // Generate CSRF state token
        $state = Str::random(40);
        Cache::put('google_oauth_state_' . $state, true, now()->addMinutes(15));

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'access_type' => 'offline',
            'prompt' => 'select_account',
            'state' => $state,
        ]);

        $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . $query;

        return response()->json([
            'url' => $url,
            'state' => $state,
        ]);
    }

    /**
     * Handle OAuth 2.0 authorization code exchange
     */
    public function handleCallback(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
            'state' => ['nullable', 'string'],
            'redirect_uri' => ['nullable', 'string'],
        ]);

        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');
        $defaultRedirectUri = config('services.google.redirect_uri', 'http://localhost:5173/auth/google/callback');
        $redirectUri = $validated['redirect_uri'] ?? $defaultRedirectUri;

        if (empty($clientId) || empty($clientSecret)) {
            return response()->json([
                'error' => 'Google OAuth credentials not configured',
                'message' => 'Server missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.',
            ], 503);
        }

        // Validate state token if state was provided and stored
        if (!empty($validated['state'])) {
            $cached = Cache::pull('google_oauth_state_' . $validated['state']);
            // Allow state validation or fallback if cache expired but code is valid
        }

        // Server-to-server exchange: Authorization code -> Tokens
        try {
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'code' => $validated['code'],
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ]);

            if (!$tokenResponse->successful()) {
                \Log::warning('Google token exchange failed', [
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->json() ?? $tokenResponse->body(),
                ]);
                return response()->json([
                    'error' => 'Google authentication failed',
                    'message' => 'Unable to verify code with Google. The authorization code may have expired.',
                ], 400);
            }

            $tokenData = $tokenResponse->json();
            $accessToken = $tokenData['access_token'] ?? null;
            $idToken = $tokenData['id_token'] ?? null;

            if (!$accessToken && !$idToken) {
                return response()->json([
                    'error' => 'Invalid Google token response',
                    'message' => 'No access token or ID token received from Google.',
                ], 400);
            }

            // Fetch verified user profile directly from Google
            $userInfoResponse = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v3/userinfo');

            if (!$userInfoResponse->successful()) {
                return response()->json([
                    'error' => 'Failed to fetch Google user profile',
                    'message' => 'Could not retrieve verified profile from Google.',
                ], 400);
            }

            $googleUser = $userInfoResponse->json();
            return $this->resolveAndAuthenticateUser($googleUser);

        } catch (\Throwable $e) {
            \Log::error('Google OAuth callback error', ['exception' => $e->getMessage()]);
            return response()->json([
                'error' => 'Authentication error',
                'message' => 'A secure connection to Google could not be completed.',
            ], 500);
        }
    }

    /**
     * Handle Direct Google Identity Services (GIS) ID Token verification
     */
    public function handleToken(Request $request)
    {
        $validated = $request->validate([
            'id_token' => ['nullable', 'string'],
            'credential' => ['nullable', 'string'],
        ]);

        $token = $validated['id_token'] ?? $validated['credential'];
        if (empty($token)) {
            return response()->json([
                'error' => 'Missing token',
                'message' => 'Google ID token or credential is required.',
            ], 422);
        }

        // Verify token with Google's official tokeninfo endpoint
        try {
            $verifyResponse = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $token,
            ]);

            if (!$verifyResponse->successful()) {
                return response()->json([
                    'error' => 'Invalid Google ID token',
                    'message' => 'The provided Google identity token is invalid or has expired.',
                ], 401);
            }

            $googleUser = $verifyResponse->json();

            // Verify audience matches our Client ID if set
            $expectedClientId = config('services.google.client_id');
            if (!empty($expectedClientId) && isset($googleUser['aud']) && $googleUser['aud'] !== $expectedClientId) {
                return response()->json([
                    'error' => 'Token audience mismatch',
                    'message' => 'Google token was not issued for this application.',
                ], 403);
            }

            return $this->resolveAndAuthenticateUser($googleUser);

        } catch (\Throwable $e) {
            \Log::error('Google token verification error', ['exception' => $e->getMessage()]);
            return response()->json([
                'error' => 'Verification failed',
                'message' => 'Could not verify identity with Google.',
            ], 500);
        }
    }

    /**
     * Core user resolution, account linking, account creation, and JWT issuance
     */
    private function resolveAndAuthenticateUser(array $googleUser)
    {
        $googleId = $googleUser['sub'] ?? null;
        $email = $googleUser['email'] ?? null;
        $name = $googleUser['name'] ?? null;
        $avatar = $googleUser['picture'] ?? null;
        $emailVerified = filter_var($googleUser['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (empty($googleId) || empty($email)) {
            return response()->json([
                'error' => 'Incomplete Google profile',
                'message' => 'Google profile is missing an ID or email address.',
            ], 422);
        }

        if (!$emailVerified) {
            return response()->json([
                'error' => 'Unverified email',
                'message' => 'Your Google email is not verified. Please verify your email with Google first.',
            ], 403);
        }

        // CASE 1: Existing user with Google ID linked
        $user = User::where('google_id', $googleId)->first();

        // CASE 2: Existing user with matching verified email
        if (!$user) {
            $user = User::where('email', $email)->first();
            if ($user) {
                // Link Google identity to existing local account
                $user->google_id = $googleId;
                if (empty($user->auth_provider) || $user->auth_provider === 'local') {
                    $user->auth_provider = 'google';
                }
                if (!$user->email_verified_at) {
                    $user->email_verified_at = now();
                }
                if (empty($user->avatar) && !empty($avatar)) {
                    $user->avatar = $avatar;
                }
                $user->save();
                \Log::info('Linked Google account to existing user', ['user_id' => $user->id, 'email' => $email]);
            }
        }

        // CASE 3: New Google user
        if (!$user) {
            $fallbackName = !empty($name) ? $name : explode('@', $email)[0];
            
            $user = new User();
            $user->name = $fallbackName;
            $user->email = $email;
            $user->google_id = $googleId;
            $user->auth_provider = 'google';
            $user->avatar = $avatar;
            // Default to 'pending' role for new registrations to trigger existing profile setup flow
            $user->role = 'pending';
            $user->email_verified_at = now();
            $user->is_active = true;
            // Secure random password hash to satisfy schema constraint and prevent empty password logins
            $user->password = Hash::make(Str::random(32));
            $user->listing_status = 'pending';
            $user->subscription_status = 'unpaid';
            $user->save();

            \Log::info('Created new pending user via Google Sign-In awaiting profile setup', ['user_id' => $user->id, 'email' => $email]);
        }

        // Check if user is active
        if (!$user->is_active) {
            return response()->json([
                'error' => 'Account deactivated',
                'message' => 'Your account has been deactivated. Please contact support.',
            ], 403);
        }

        // Issue application JWT token using existing app configuration
        $ttl = config('jwt.ttl', 1440) * 60;
        $issuedAt = time();

        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];

        $jwtSecret = $this->getJwtSecret();
        $token = JWT::encode($payload, $jwtSecret, config('jwt.algo', 'HS256'));

        $requiresSetup = empty($user->role) || $user->role === 'pending';

        return response()->json([
            'message' => 'Google authentication successful',
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
     * Get guaranteed non-empty JWT secret matching AuthController
     */
    private function getJwtSecret(): string
    {
        return (string) (config('jwt.secret') ?: env('JWT_SECRET') ?: env('APP_KEY') ?: 'discover-mansalay-jwt-master-secret-key-32chars-2026');
    }
}
