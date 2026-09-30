<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddImagesToLandmarksTable extends Migration
{
    public function up()
    {
        Schema::table('landmarks', function (Blueprint $table) {
            if (!Schema::hasColumn('landmarks', 'images')) {
                $table->json('images')->nullable()->after('image')
                      ->comment('Array of uploaded photo URLs for Google-Maps-style gallery');
            }
        });
    }

    public function down()
    {
        Schema::table('landmarks', function (Blueprint $table) {
            if (Schema::hasColumn('landmarks', 'images')) {
                $table->dropColumn('images');
            }
        });
    }
}
