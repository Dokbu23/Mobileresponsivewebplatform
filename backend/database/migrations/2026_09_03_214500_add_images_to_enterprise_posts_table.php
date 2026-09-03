<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('enterprise_posts') && !Schema::hasColumn('enterprise_posts', 'images')) {
            Schema::table('enterprise_posts', function (Blueprint $table) {
                $table->json('images')->nullable()->after('image');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('enterprise_posts') && Schema::hasColumn('enterprise_posts', 'images')) {
            Schema::table('enterprise_posts', function (Blueprint $table) {
                $table->dropColumn('images');
            });
        }
    }
};
