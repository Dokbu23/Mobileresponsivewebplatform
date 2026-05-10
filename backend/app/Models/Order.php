<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'items',
        'total',
        'status',
        'payment_method',
        'customer_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'business_owner_id'
    ];

    protected $casts = [
        'items' => 'array',
        'shipping_address' => 'array',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function businessOwner()
    {
        return $this->belongsTo(User::class, 'business_owner_id');
    }
}
