<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddVideoColumnsToUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'video')) {
                $table->string('video', 1000)->nullable()->after('store_banner');
            }
            if (!Schema::hasColumn('users', 'video_url')) {
                $table->string('video_url', 1000)->nullable()->after('video');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'video_url')) {
                $table->dropColumn('video_url');
            }
            if (Schema::hasColumn('users', 'video')) {
                $table->dropColumn('video');
            }
        });
    }
}
