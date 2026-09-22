<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'facebook_link')) {
                $table->string('facebook_link', 500)->nullable()->after('longitude');
            }
            if (!Schema::hasColumn('users', 'instagram_link')) {
                $table->string('instagram_link', 500)->nullable()->after('facebook_link');
            }
            if (!Schema::hasColumn('users', 'virtual_tour_scenes')) {
                $table->longText('virtual_tour_scenes')->nullable()->after('instagram_link');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumnIfExists('facebook_link');
            $table->dropColumnIfExists('instagram_link');
            $table->dropColumnIfExists('virtual_tour_scenes');
        });
    }
};
