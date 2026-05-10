<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attraction extends Model
{
    use HasFactory;

    protected $fillable = ['user_id','name','location','category','image','description','full_description'];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
