<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProductVariationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the product_variations table to support Shopee-style
     * product variations (Size, Color, Flavor, etc.) with their own
     * optional price override and dedicated stock tracking.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('product_variations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('name');              // e.g., "Size", "Color"
            $table->string('value');             // e.g., "Small", "Red"
            $table->decimal('price', 10, 2)->nullable(); // Optional: override base price
            $table->integer('stock')->default(0); // Stock for this specific variation
            $table->string('image')->nullable();  // Optional: variation-specific image
            $table->timestamps();
            $table->index(['product_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('product_variations');
    }
}
