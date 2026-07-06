<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'code', 'description', 'type', 'value',
        'min_amount', 'max_uses', 'used_count', 'is_active', 'expires_at',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'expires_at' => 'datetime',
        'value'      => 'float',
        'min_amount' => 'float',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Calculate the discount amount for a given subtotal.
     */
    public function calculateDiscount(float $subtotal): float
    {
        if ($this->type === 'percent') {
            return round($subtotal * ($this->value / 100), 2);
        }
        return min($this->value, $subtotal); // fixed — can't exceed subtotal
    }

    /**
     * Check if this code is valid for a given amount and owner.
     */
    public function isValid(float $amount, ?int $ownerId = null): array
    {
        if (!$this->is_active) {
            return ['valid' => false, 'message' => 'Promo code is no longer active.'];
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return ['valid' => false, 'message' => 'Promo code has expired.'];
        }
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return ['valid' => false, 'message' => 'Promo code usage limit reached.'];
        }
        if ($amount < $this->min_amount) {
            return ['valid' => false, 'message' => "Minimum amount of ₱{$this->min_amount} required."];
        }
        if ($ownerId && $this->user_id !== $ownerId) {
            return ['valid' => false, 'message' => 'Promo code is not valid for this business.'];
        }
        return ['valid' => true, 'message' => 'Promo code applied!'];
    }
}
