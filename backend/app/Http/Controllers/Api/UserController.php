<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\EmailVerificationCode;
use App\Mail\VerificationCodeMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class UserController extends Controller
{
    public function updatePaymentDetails(Request $request)
    {
        $data = $request->validate([
            'payment_details' => 'required|array',
            'payment_details.*.type' => 'required|in:gcash,paymaya,bank_account',
            'payment_details.*.name' => 'required|string',
            'payment_details.*.account_number' => 'required|string',
            'payment_details.*.account_name' => 'required|string',
        ]);

        $user = $request->user();
        $user->update(['payment_details' => $data['payment_details']]);

        return response()->json([
            'message' => 'Payment details updated successfully',
            'user' => $user
        ]);
    }

    public function paymentDetails(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'payment_details' => $user->payment_details ?? []
        ]);
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        
        // Only return payment details for business accounts
        if (in_array($user->role, ['enterprise', 'resort'])) {
            return response()->json($user);
        }
        
        return response()->json(['message' => 'User not found'], 404);
    }

    /**
     * Change password for authenticated user (no OTP needed — they're already logged in).
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        if (!\Illuminate\Support\Facades\Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => bcrypt($data['password'])]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function testAuth(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'message' => 'Authentication working',
            'user' => $user,
            'role' => $user->role ?? 'no role'
        ]);
    }

    /**
     * Update the authenticated user's map location (lat/lng).
     */
    public function updateLocation(Request $request)
    {
        $user = $request->user();

        // Mansalay bounding box validation
        $data = $request->validate([
            'latitude'  => 'required|numeric|between:12.45,12.60',
            'longitude' => 'required|numeric|between:121.38,121.50',
        ]);

        $user->update([
            'latitude'  => $data['latitude'],
            'longitude' => $data['longitude'],
        ]);

        return response()->json([
            'message'   => 'Location updated successfully',
            'latitude'  => $user->latitude,
            'longitude' => $user->longitude,
        ]);
    }

    /**
     * Upload and update user avatar immediately.
     */
    public function uploadAvatar(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:8192',
        ]);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $avatarUrl = '/storage/' . $path;

            // Delete old avatar if it was stored locally in avatars/
            if ($user->avatar && str_starts_with($user->avatar, '/storage/avatars/')) {
                $oldFile = str_replace('/storage/', '', $user->avatar);
                try {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($oldFile);
                } catch (\Throwable $t) {}
            }

            $user->update(['avatar' => $avatarUrl]);

            return response()->json([
                'success' => true,
                'message' => 'Profile picture updated successfully.',
                'avatar'  => $avatarUrl,
                'user'    => $user->fresh(),
            ]);
        }

        return response()->json(['success' => false, 'message' => 'No image file uploaded.'], 400);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'           => 'nullable|string|max:255',
            'resort_name'    => 'nullable|string|max:255',
            'store_name'     => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:20',
            'address'        => 'nullable|string|max:500',
            'barangay'       => 'nullable|string|max:100',
            'description'    => 'nullable|string|max:1000',
            'facebook_link'  => 'nullable|string|max:255',
            'instagram_link' => 'nullable|string|max:255',
            'avatar'         => 'nullable',
        ]);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar'] = '/storage/' . $path;
        } elseif ($request->filled('avatar') && is_string($request->input('avatar'))) {
            $data['avatar'] = preg_replace('#^https?://[^/]+#', '', $request->input('avatar'));
        }

        $user->update(array_filter([
            'name'           => !empty($data['name']) ? $data['name'] : $user->name,
            'resort_name'    => $data['resort_name'] ?? null,
            'store_name'     => $data['store_name'] ?? null,
            'phone'          => $data['phone'] ?? null,
            'address'        => $data['address'] ?? null,
            'barangay'       => $data['barangay'] ?? null,
            'description'    => $data['description'] ?? null,
            'facebook_link'  => $data['facebook_link'] ?? null,
            'instagram_link' => $data['instagram_link'] ?? null,
            'avatar'         => $data['avatar'] ?? null,
        ], fn($v) => $v !== null));

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Send OTP verification code to the user's requested new email.
     */
    public function sendChangeEmailCode(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'new_email' => ['required', 'email', 'max:255', 'unique:users,email'],
        ], [
            'new_email.required' => 'Please enter your new email address.',
            'new_email.email'    => 'Please enter a valid email address.',
            'new_email.unique'   => 'This email address is already taken by another user.',
        ]);

        $newEmail = strtolower(trim($validated['new_email']));

        if (strtolower($user->email) === $newEmail) {
            return response()->json([
                'message' => 'The new email is already your current email address.',
            ], 422);
        }

        // Rate limit: 1 request per 60 seconds
        $recentCode = EmailVerificationCode::where('email', $newEmail)
            ->where('created_at', '>', Carbon::now()->subSeconds(60))
            ->first();

        if ($recentCode) {
            $retryAfter = 60 - Carbon::now()->diffInSeconds($recentCode->created_at);
            return response()->json([
                'message' => 'Please wait ' . $retryAfter . ' seconds before requesting another code.',
            ], 429);
        }

        // Generate 6-digit OTP code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailVerificationCode::create([
            'email'      => $newEmail,
            'code'       => $code,
            'expires_at' => Carbon::now()->addMinutes(10),
            'is_used'    => false,
        ]);

        \Log::info('Change Email OTP Code Generated', [
            'user_id'   => $user->id,
            'new_email' => $newEmail,
            'code'      => $code,
        ]);

        // Deliver email via Brevo HTTPS API or Laravel Mail
        try {
            $this->deliverChangeEmailOtp($newEmail, $user->name, $code);
        } catch (\Throwable $e) {
            \Log::warning('Change email OTP delivery warning: ' . $e->getMessage());
        }

        return response()->json([
            'message'    => 'Verification code sent to ' . $newEmail,
            'expires_in' => 600,
        ]);
    }

    /**
     * Verify OTP code and update user's email address.
     */
    public function verifyAndChangeEmail(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'new_email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'code'      => ['required', 'string', 'size:6'],
        ], [
            'new_email.unique' => 'This email is already taken by another account.',
            'code.size'        => 'Verification code must be exactly 6 digits.',
        ]);

        $newEmail = strtolower(trim($validated['new_email']));
        $code = trim($validated['code']);

        $verificationCode = EmailVerificationCode::where('email', $newEmail)
            ->where('code', $code)
            ->where('is_used', false)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$verificationCode) {
            return response()->json([
                'message' => 'Invalid verification code. Please check and try again.',
            ], 400);
        }

        if ($verificationCode->isExpired()) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new code.',
            ], 400);
        }

        // Mark code as used
        $verificationCode->markAsUsed();

        // Update user email
        $user->email = $newEmail;
        $user->email_verified_at = Carbon::now();
        $user->save();

        return response()->json([
            'message' => 'Email address changed successfully!',
            'user'    => $user->fresh(),
        ]);
    }

    private function deliverChangeEmailOtp(string $toEmail, ?string $userName, string $code): void
    {
        $brevoApiKey = env('BREVO_API_KEY');
        $fromEmail   = env('MAIL_FROM_ADDRESS', 'discoverymansalay@gmail.com');
        $fromName    = env('MAIL_FROM_NAME', 'DiscoverMansalay');
        $subject     = 'Change Email Verification Code - DiscoverMansalay';

        $htmlContent = view('emails.verification-code', [
            'code'     => $code,
            'userName' => $userName ?? 'User',
        ])->render();

        if (!empty($brevoApiKey)) {
            try {
                $response = Http::withHeaders([
                    'api-key'      => $brevoApiKey,
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ])->timeout(10)->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => ['name' => $fromName, 'email' => $fromEmail],
                    'to'     => [['email' => $toEmail, 'name' => $userName ?? 'User']],
                    'subject' => $subject,
                    'htmlContent' => $htmlContent,
                ]);

                if ($response->successful()) {
                    return;
                }
            } catch (\Throwable $e) {
                // fallback to Mail below
            }
        }

        Mail::to($toEmail)->send(new VerificationCodeMail($code, $userName ?? 'User'));
    }
}