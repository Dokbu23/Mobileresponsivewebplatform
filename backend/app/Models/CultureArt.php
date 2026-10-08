<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CultureArt extends Model
{
    use HasFactory;

    protected $table = 'culture_arts';

    protected $fillable = [
        'user_id',
        'name',
        'category',
        'artist_name',
        'period_era',
        'location',
        'image',
        'images',
        'video',
        'description',
        'full_description',
        'status',
        'is_featured',
        'view_count',
        'likes',
    ];

    protected $casts = [
        'images'      => 'array',
        'is_featured' => 'boolean',
        'view_count'  => 'integer',
        'likes'       => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
