<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPostIdToProductsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'post_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->unsignedBigInteger('post_id')->nullable()->after('user_id');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'post_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('post_id');
            });
        }
    }
}
