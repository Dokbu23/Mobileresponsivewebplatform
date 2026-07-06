<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStoreProfileColumnsToUsers extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('store_name')->nullable()->after('description');
            $table->text('store_description')->nullable()->after('store_name');
            $table->string('store_logo')->nullable()->after('store_description');
            $table->string('store_banner')->nullable()->after('store_logo');
            $table->boolean('store_is_setup')->default(false)->after('store_banner');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['store_name', 'store_description', 'store_logo', 'store_banner', 'store_is_setup']);
        });
    }
}
