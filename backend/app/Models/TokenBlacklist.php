<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class TokenBlacklist extends Model
{
    /**
     * Table name
     */
    protected $table = 'token_blacklist';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'token_hash',
        'user_id',
        'expires_at',
        'blacklisted_at',
        'reason',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'expires_at' => 'datetime',
        'blacklisted_at' => 'datetime',
    ];

    /**
     * Disable timestamps (we use blacklisted_at instead)
     */
    public $timestamps = false;

    /**
     * SECURITY: Add token to blacklist
     * 
     * @param string $token The JWT token to blacklist
     * @param int|null $userId The user ID who owns the token
     * @param \DateTime $expiresAt When the token expires
     * @param string $reason Why the token is blacklisted
     * @return bool
     */
    public static function add($token, $userId = null, $expiresAt = null, $reason = 'logout')
    {
        // SECURITY: Hash the token before storing (don't store raw tokens)
        // WHY: If database is compromised, attackers can't steal tokens
        $tokenHash = hash('sha256', $token);

        try {
            self::create([
                'token_hash' => $tokenHash,
                'user_id' => $userId,
                'expires_at' => $expiresAt ?? now()->addDays(14),
                'blacklisted_at' => now(),
                'reason' => $reason,
            ]);
            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to blacklist token', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * SECURITY: Check if token is blacklisted
     * 
     * @param string $token The JWT token to check
     * @return bool
     */
    public static function isBlacklisted($token)
    {
        $tokenHash = hash('sha256', $token);
        
        return self::where('token_hash', $tokenHash)
            ->where('expires_at', '>', now()) // Only check non-expired entries
            ->exists();
    }

    /**
     * SECURITY: Blacklist all tokens for a user (force logout)
     * 
     * Use case: Security breach, account compromise, admin force logout
     * 
     * @param int $userId
     * @param string $reason
     * @return int Number of tokens blacklisted
     */
    public static function blacklistAllForUser($userId, $reason = 'forced_logout')
    {
        // Note: This requires storing user_id in JWT payload
        // For now, we'll return 0 as we need to implement user-specific token tracking
        return 0;
    }

    /**
     * MAINTENANCE: Cleanup expired tokens from blacklist
     * 
     * Run this periodically (daily cron job recommended)
     * Removes tokens that have already expired (no point keeping them)
     * 
     * @return int Number of tokens removed
     */
    public static function cleanup()
    {
        return self::where('expires_at', '<', now())->delete();
    }

    /**
     * Get blacklist statistics
     * 
     * @return array
     */
    public static function getStats()
    {
        return [
            'total' => self::count(),
            'active' => self::where('expires_at', '>', now())->count(),
            'expired' => self::where('expires_at', '<', now())->count(),
        ];
    }
}
