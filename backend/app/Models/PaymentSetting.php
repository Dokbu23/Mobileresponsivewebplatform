<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'subscription_amount',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'subscription_amount' => 'decimal:2',
    ];

    /**
     * Get the current payment settings (singleton pattern).
     * Only one record should exist in the table.
     *
     * @return PaymentSetting
     */
    public static function current()
    {
        $settings = self::first();
        
        if (!$settings) {
            // Create default settings if none exist
            $settings = self::create([
                'subscription_amount' => 50.00,
            ]);
        }
        
        return $settings;
    }

    /**
     * Get the subscription amount attribute.
     *
     * @param mixed $value
     * @return float
     */
    public function getSubscriptionAmountAttribute($value)
    {
        return (float) $value;
    }
}
