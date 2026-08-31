<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('resort_rooms', 'images')) {
            Schema::table('resort_rooms', function (Blueprint $table) {
                $table->json('images')->nullable()->after('image');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('resort_rooms', 'images')) {
            Schema::table('resort_rooms', function (Blueprint $table) {
                $table->dropColumn('images');
            });
        }
    }
};
