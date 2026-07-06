<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // owner (resort or enterprise)
            $table->string('code')->unique();       // e.g. SUMMER20
            $table->string('description')->nullable();
            $table->enum('type', ['percent', 'fixed'])->default('percent'); // % or fixed amount
            $table->decimal('value', 10, 2);        // 20 = 20% or ₱20
            $table->decimal('min_amount', 10, 2)->default(0); // minimum order/booking amount
            $table->integer('max_uses')->nullable(); // null = unlimited
            $table->integer('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');
    }
};
