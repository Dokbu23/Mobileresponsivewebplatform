<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enterprise_posts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('type')->default('product'); // product, promotion, update
            $table->string('title')->nullable();
            $table->text('content');
            $table->string('image')->nullable();
            $table->string('product_name')->nullable();
            $table->string('price')->nullable();
            $table->string('category')->nullable();
            $table->string('seller_name')->nullable();
            $table->string('location')->nullable();
            $table->string('business_hours')->nullable();
            $table->string('stock')->nullable();
            $table->json('tags')->nullable();
            $table->integer('likes')->default(0);
            $table->integer('saves')->default(0);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enterprise_posts');
    }
};
