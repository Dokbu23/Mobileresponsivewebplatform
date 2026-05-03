<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = ['accommodation_id','accommodation_snapshot','check_in','check_out','status','payment_method','total'];

    protected $casts = [
        'accommodation_snapshot' => 'array',
        'check_in' => 'date',
        'check_out' => 'date',
    ];
}
