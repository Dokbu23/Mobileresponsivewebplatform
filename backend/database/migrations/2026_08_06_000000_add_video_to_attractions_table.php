<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddVideoToAttractionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasColumn('attractions', 'video')) {
            Schema::table('attractions', function (Blueprint $table) {
                $table->string('video')->nullable()->after('image');
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
        if (Schema::hasColumn('attractions', 'video')) {
            Schema::table('attractions', function (Blueprint $table) {
                $table->dropColumn('video');
            });
        }
    }
}
