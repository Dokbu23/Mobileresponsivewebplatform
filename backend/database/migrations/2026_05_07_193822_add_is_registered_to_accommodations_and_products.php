<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddIsRegisteredToAccommodationsAndProducts extends Migration
{
    public function up()
    {
        // Add user_id and is_registered to accommodations
        Schema::table('accommodations', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->boolean('is_registered')->default(false)->after('user_id')
                ->comment('true = managed by registered business owner, false = static listing managed by admin');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });

        // Add is_registered to products (user_id already exists)
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_registered')->default(false)->after('user_id')
                ->comment('true = managed by registered enterprise owner, false = static listing managed by admin');
        });
    }

    public function down()
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'is_registered']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_registered');
        });
    }
}
