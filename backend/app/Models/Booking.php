<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'accommodation_id',
        'resort_user_id',
        'accommodation_type',
        'accommodation_snapshot',
        'check_in',
        'check_out',
        'status',
        'payment_method',
        'total',
        'customer_id',
        'customer_name',
        'customer_email',
        'customer_phone'
    ];

    protected $casts = [
        'accommodation_snapshot' => 'array',
        'check_in' => 'date',
        'check_out' => 'date',
    ];

    public function accommodation()
    {
        return $this->belongsTo(Accommodation::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function resortOwner()
    {
        return $this->belongsTo(User::class, 'resort_user_id');
    }
}
