<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Accommodation extends Model
{
    use HasFactory;

    protected $fillable = ['name','description','price_per_night','image','availability'];

    protected $casts = [
        'availability' => 'array',
    ];
}
