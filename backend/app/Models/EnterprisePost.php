<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnterprisePost extends Model
{
    use HasFactory;

    protected $table = 'enterprise_posts';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'content',
        'image',
        'images',
        'video',
        'product_name',
        'price',
        'category',
        'seller_name',
        'location',
        'business_hours',
        'stock',
        'tags',
        'likes',
        'saves',
        'status',
        'previous_status',
        'archived_at',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_remarks',
        'moderation_history',
    ];

    protected $casts = [
        'tags' => 'array',
        'images' => 'array',
        'likes' => 'integer',
        'saves' => 'integer',
        'moderation_history' => 'array',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejecter()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }
}
