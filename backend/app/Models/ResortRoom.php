<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResortRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'price_per_night',
        'capacity',
        'description',
        'image',
        'is_available',
    ];

    protected $casts = [
        'is_available' => 'boolean',
        'price_per_night' => 'float',
        'capacity' => 'integer',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
