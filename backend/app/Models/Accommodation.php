<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Accommodation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'is_registered',
        'name',
        'location',
        'category',
        'type',
        'description',
        'full_description',
        'operating_hours',
        'contact_number',
        'facebook',
        'instagram',
        'website',
        'video',
        'price_per_night',
        'image',
        'images',
        'availability',
    ];

    protected $casts = [
        'availability' => 'array',
        'images' => 'array',
        'is_registered' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
