<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['name','description','price','stock','image','images','category','user_id','is_registered'];

    protected $casts = [
        'is_registered' => 'boolean',
        'images' => 'array',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function variations()
    {
        return $this->hasMany(ProductVariation::class);
    }
}
