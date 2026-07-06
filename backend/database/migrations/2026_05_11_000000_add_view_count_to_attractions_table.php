<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddViewCountToAttractionsTable extends Migration
{
    public function up()
    {
        Schema::table('attractions', function (Blueprint $table) {
            $table->unsignedBigInteger('view_count')->default(0)->after('full_description');
        });
    }

    public function down()
    {
        Schema::table('attractions', function (Blueprint $table) {
            $table->dropColumn('view_count');
        });
    }
}
