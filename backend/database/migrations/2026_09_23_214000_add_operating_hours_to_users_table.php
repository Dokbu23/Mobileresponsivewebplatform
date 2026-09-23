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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'opening_time')) {
                $table->string('opening_time')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'closing_time')) {
                $table->string('closing_time')->nullable()->after('opening_time');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'closing_time')) {
                $table->dropColumn('closing_time');
            }
            if (Schema::hasColumn('users', 'opening_time')) {
                $table->dropColumn('opening_time');
            }
        });
    }
};
