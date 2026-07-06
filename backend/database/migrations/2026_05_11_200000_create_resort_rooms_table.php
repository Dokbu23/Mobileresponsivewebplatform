<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resort_rooms', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // resort owner
            $table->string('name');                // e.g. "Deluxe Room", "Family Suite"
            $table->string('type')->nullable();    // e.g. "Standard", "Deluxe", "Suite"
            $table->decimal('price_per_night', 10, 2);
            $table->integer('capacity')->default(2); // max guests
            $table->text('description')->nullable();
            $table->string('image')->nullable();   // stored path
            $table->boolean('is_available')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resort_rooms');
    }
};
