<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = ['user_id','name','location','category','image','images','date','time','capacity','description','full_description','likes','status','previous_status','archived_at'];

    protected $casts = [
        'images' => 'array',
        'archived_at' => 'datetime',
    ];

    protected $dates = ['date'];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Alias for consistency with design document
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
