<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistoryPost extends Model
{
    use HasFactory;

    protected $table = 'histories';

    protected $fillable = [
        'user_id',
        'name',
        'category',
        'period',
        'date',
        'location',
        'image',
        'images',
        'video',
        'description',
        'full_description',
        'source',
        'status',
        'previous_status',
        'archived_at',
        'is_featured',
        'view_count',
        'likes',
    ];

    protected $casts = [
        'images'      => 'array',
        'is_featured' => 'boolean',
        'view_count'  => 'integer',
        'likes'       => 'integer',
        'archived_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
