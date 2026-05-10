<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationCode;
use App\Models\User;
use App\Mail\VerificationCodeMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class EmailVerificationController extends Controller
{
    /**
     * Send verification code to email
     */
    public function sendCode(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Check if user is already verified
        if ($user->email_verified_at) {
            return response()->json([
                'message' => 'Email is already verified',
            ], 400);
        }

        // Check for recent code (rate limiting - 1 minute)
        $recentCode = EmailVerificationCode::where('email', $validated['email'])
            ->where('created_at', '>', Carbon::now()->subMinute())
            ->first();

        if ($recentCode) {
            return response()->json([
                'message' => 'Please wait before requesting a new code',
                'retry_after' => 60 - Carbon::now()->diffInSeconds($recentCode->created_at),
            ], 429);
        }

        // Generate 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store code in database
        $verificationCode = EmailVerificationCode::create([
            'email' => $validated['email'],
            'code' => $code,
            'expires_at' => Carbon::now()->addMinutes(10),
            'is_used' => false,
        ]);

        // Debug: Log the generated code
        \Log::info('OTP Code Generated', [
            'email' => $validated['email'],
            'code' => $code,
            'expires_at' => $verificationCode->expires_at,
        ]);

        // Send email
        try {
            Mail::to($validated['email'])->send(new VerificationCodeMail($code, $user->name));

            return response()->json([
                'message' => 'Verification code sent to your email',
                'expires_in' => 600, // 10 minutes in seconds
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send email. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify the code
     */
    public function verifyCode(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Check if user is already verified
        if ($user->email_verified_at) {
            return response()->json([
                'message' => 'Email is already verified',
            ], 400);
        }

        // Find the most recent unused code
        $verificationCode = EmailVerificationCode::where('email', $validated['email'])
            ->where('code', $validated['code'])
            ->where('is_used', false)
            ->orderBy('created_at', 'desc')
            ->first();

        // Log verification attempt
        \Log::info('Verification attempt', [
            'email' => $validated['email'],
            'code_found' => $verificationCode ? 'yes' : 'no',
        ]);

        if (!$verificationCode) {
            return response()->json([
                'message' => 'Invalid verification code',
            ], 400);
        }

        // Check if code is expired
        if ($verificationCode->isExpired()) {
            return response()->json([
                'message' => 'Verification code has expired',
            ], 400);
        }

        // Mark code as used
        $verificationCode->markAsUsed();

        // Mark user email as verified
        $updated = $user->update([
            'email_verified_at' => Carbon::now(),
        ]);

        // Log the update result
        \Log::info('Email verification update', [
            'email' => $user->email,
            'update_result' => $updated ? 'success' : 'failed',
            'email_verified_at_before' => $user->getOriginal('email_verified_at'),
            'email_verified_at_after' => $user->fresh()->email_verified_at,
        ]);

        return response()->json([
            'message' => 'Email verified successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->fresh()->email_verified_at,
            ],
        ]);
    }

    /**
     * Resend verification code
     */
    public function resendCode(Request $request)
    {
        return $this->sendCode($request);
    }

    /**
     * Send password reset code to email
     */
    public function sendPasswordResetCode(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Check for recent code (rate limiting - 1 minute)
        $recentCode = EmailVerificationCode::where('email', $validated['email'])
            ->where('created_at', '>', Carbon::now()->subMinute())
            ->first();

        if ($recentCode) {
            return response()->json([
                'message' => 'Please wait before requesting a new code',
                'retry_after' => 60 - Carbon::now()->diffInSeconds($recentCode->created_at),
            ], 429);
        }

        // Generate 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store code in database
        $verificationCode = EmailVerificationCode::create([
            'email' => $validated['email'],
            'code' => $code,
            'expires_at' => Carbon::now()->addMinutes(10),
            'is_used' => false,
        ]);

        // Send email
        try {
            Mail::to($validated['email'])->send(new VerificationCodeMail($code, $user->name));

            return response()->json([
                'message' => 'Password reset code sent to your email',
                'expires_in' => 600, // 10 minutes in seconds
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send email. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset password with OTP code
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Find the most recent unused code
        $verificationCode = EmailVerificationCode::where('email', $validated['email'])
            ->where('code', $validated['code'])
            ->where('is_used', false)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$verificationCode) {
            return response()->json([
                'message' => 'Invalid verification code',
            ], 400);
        }

        // Check if code is expired
        if ($verificationCode->isExpired()) {
            return response()->json([
                'message' => 'Verification code has expired',
            ], 400);
        }

        // Mark code as used
        $verificationCode->markAsUsed();

        // Update user password
        $user->update([
            'password' => bcrypt($validated['password']),
        ]);

        return response()->json([
            'message' => 'Password reset successfully',
        ]);
    }
}
