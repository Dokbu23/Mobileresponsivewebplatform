<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legacy_resort_migrations', function (Blueprint $table) {
            $table->id();
            $table->uuid('migration_key')->unique();
            $table->unsignedBigInteger('accommodation_id');
            $table->timestamps();

            $table->foreign('accommodation_id')
                ->references('id')
                ->on('accommodations')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_resort_migrations');
    }
};
