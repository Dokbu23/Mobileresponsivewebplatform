<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('events', 'video')) {
            Schema::table('events', function (Blueprint $table) {
                $table->string('video', 2048)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('events', 'video')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropColumn('video');
            });
        }
    }
};
