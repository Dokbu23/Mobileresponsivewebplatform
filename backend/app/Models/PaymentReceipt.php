<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'reference_id',
        'tourist_id',
        'business_id',
        'receipt_image',
        'amount',
        'payment_method',
        'payment_reference',
        'status',
        'notes',
        'verified_at',
    ];

    protected $dates = ['verified_at'];

    public function tourist()
    {
        return $this->belongsTo(User::class, 'tourist_id');
    }

    public function business()
    {
        return $this->belongsTo(User::class, 'business_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'reference_id')->where('type', 'order');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'reference_id')->where('type', 'booking');
    }
}
