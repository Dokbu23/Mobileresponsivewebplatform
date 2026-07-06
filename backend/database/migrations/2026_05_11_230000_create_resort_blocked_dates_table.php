<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resort_blocked_dates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // resort owner
            $table->date('blocked_date');
            $table->string('reason')->nullable(); // e.g. "Fully booked", "Maintenance"
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'blocked_date']); // no duplicate dates per resort
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resort_blocked_dates');
    }
};
