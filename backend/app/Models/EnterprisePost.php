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
    ];

    protected $casts = [
        'tags' => 'array',
        'likes' => 'integer',
        'saves' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
