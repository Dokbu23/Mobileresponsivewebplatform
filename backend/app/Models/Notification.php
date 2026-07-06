<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'link',
        'is_read',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
    ];

    /**
     * The recipient of the notification.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Helper to quickly create a notification for a user.
     * Safe to call inside try/catch — on failure, it simply logs and returns null.
     *
     * @param  int     $userId
     * @param  string  $type
     * @param  string  $title
     * @param  string  $message
     * @param  array   $data
     * @param  string|null $link
     * @return \App\Models\Notification|null
     */
    public static function notify($userId, $type, $title, $message, $data = [], $link = null)
    {
        try {
            if (empty($userId)) {
                return null;
            }

            return self::create([
                'user_id' => $userId,
                'type'    => $type,
                'title'   => $title,
                'message' => $message,
                'data'    => $data ?: [],
                'link'    => $link,
                'is_read' => false,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Notification creation failed', [
                'user_id' => $userId,
                'type'    => $type,
                'error'   => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Send the same notification to all admins.
     *
     * @param  string $type
     * @param  string $title
     * @param  string $message
     * @param  array  $data
     * @param  string|null $link
     * @return void
     */
    public static function notifyAdmins($type, $title, $message, $data = [], $link = null)
    {
        try {
            $adminIds = User::where('role', 'admin')->pluck('id');
            foreach ($adminIds as $adminId) {
                self::notify($adminId, $type, $title, $message, $data, $link);
            }
        } catch (\Throwable $e) {
            \Log::warning('Notify admins failed', ['error' => $e->getMessage()]);
        }
    }
}
