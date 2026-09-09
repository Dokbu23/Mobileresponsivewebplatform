<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Landmark extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'category',
        'description',
        'address',
        'latitude',
        'longitude',
        'image',
        'is_active',
        'virtual_tour_scenes',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'is_active' => 'boolean',
        'virtual_tour_scenes' => 'array',
    ];

    /**
     * Get owner user if any.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
