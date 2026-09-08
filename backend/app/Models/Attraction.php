<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attraction extends Model
{
    use HasFactory;

    protected $fillable = ['user_id','name','location','latitude','longitude','category','image','images','video','description','full_description','view_count','likes'];

    protected $casts = [
        'images'    => 'array',
        'latitude'  => 'float',
        'longitude' => 'float',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
