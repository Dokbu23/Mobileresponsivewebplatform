<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddLatLngToAttractionsAndAccommodationsTable extends Migration
{
    /**
     * Add precise GPS latitude/longitude columns to attractions and accommodations
     * so the map can use real coordinates instead of hardcoded barangay approximations.
     */
    public function up()
    {
        // --- Attractions ---
        Schema::table('attractions', function (Blueprint $table) {
            if (!Schema::hasColumn('attractions', 'latitude')) {
                $table->decimal('latitude', 10, 8)->nullable()->after('location')
                    ->comment('GPS latitude — set via LocationPicker on admin/listing form');
            }
            if (!Schema::hasColumn('attractions', 'longitude')) {
                $table->decimal('longitude', 11, 8)->nullable()->after('latitude')
                    ->comment('GPS longitude — set via LocationPicker on admin/listing form');
            }
        });

        // --- Accommodations ---
        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'latitude')) {
                $table->decimal('latitude', 10, 8)->nullable()->after('location')
                    ->comment('GPS latitude — set via LocationPicker on admin/listing form');
            }
            if (!Schema::hasColumn('accommodations', 'longitude')) {
                $table->decimal('longitude', 11, 8)->nullable()->after('latitude')
                    ->comment('GPS longitude — set via LocationPicker on admin/listing form');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('attractions', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });

        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
}
