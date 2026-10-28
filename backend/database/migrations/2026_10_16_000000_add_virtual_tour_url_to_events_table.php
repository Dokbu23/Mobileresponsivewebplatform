<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('events', 'virtual_tour_url')) {
            Schema::table('events', function (Blueprint $table) {
                $table->string('virtual_tour_url', 2048)->nullable()->after('full_description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('events', 'virtual_tour_url')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropColumn('virtual_tour_url');
            });
        }
    }
};
