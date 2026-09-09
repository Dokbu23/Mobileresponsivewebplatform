<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddVirtualTourScenesToUsersAndAccommodations extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'virtual_tour_scenes')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('virtual_tour_scenes')->nullable()->after('video');
            });
        }

        if (Schema::hasTable('accommodations') && !Schema::hasColumn('accommodations', 'virtual_tour_scenes')) {
            Schema::table('accommodations', function (Blueprint $table) {
                $table->json('virtual_tour_scenes')->nullable()->after('video');
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
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'virtual_tour_scenes')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('virtual_tour_scenes');
            });
        }

        if (Schema::hasTable('accommodations') && Schema::hasColumn('accommodations', 'virtual_tour_scenes')) {
            Schema::table('accommodations', function (Blueprint $table) {
                $table->dropColumn('virtual_tour_scenes');
            });
        }
    }
}
