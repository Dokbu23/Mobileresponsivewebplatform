<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWishlistAndLikesSystem extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add likes column to products if not exists
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'likes')) {
            Schema::table('products', function (Blueprint $table) {
                $table->unsignedInteger('likes')->default(0)->after('stock');
            });
        }

        // Add likes column to accommodations if not exists
        if (Schema::hasTable('accommodations') && !Schema::hasColumn('accommodations', 'likes')) {
            Schema::table('accommodations', function (Blueprint $table) {
                $table->unsignedInteger('likes')->default(0);
            });
        }

        // Add likes column to attractions if not exists
        if (Schema::hasTable('attractions') && !Schema::hasColumn('attractions', 'likes')) {
            Schema::table('attractions', function (Blueprint $table) {
                $table->unsignedInteger('likes')->default(0);
            });
        }

        // Add likes column to events if not exists
        if (Schema::hasTable('events') && !Schema::hasColumn('events', 'likes')) {
            Schema::table('events', function (Blueprint $table) {
                $table->unsignedInteger('likes')->default(0);
            });
        }

        // Create wishlist_items table to track wishlist additions
        if (!Schema::hasTable('wishlist_items')) {
            Schema::create('wishlist_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('item_id');
                $table->string('item_type'); // 'product', 'attraction', 'accommodation', 'event'
                $table->timestamps();

                $table->index(['item_id', 'item_type']);
                $table->index('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('wishlist_items');

        if (Schema::hasTable('products') && Schema::hasColumn('products', 'likes')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('likes');
            });
        }

        if (Schema::hasTable('accommodations') && Schema::hasColumn('accommodations', 'likes')) {
            Schema::table('accommodations', function (Blueprint $table) {
                $table->dropColumn('likes');
            });
        }

        if (Schema::hasTable('attractions') && Schema::hasColumn('attractions', 'likes')) {
            Schema::table('attractions', function (Blueprint $table) {
                $table->dropColumn('likes');
            });
        }

        if (Schema::hasTable('events') && Schema::hasColumn('events', 'likes')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropColumn('likes');
            });
        }
    }
}
