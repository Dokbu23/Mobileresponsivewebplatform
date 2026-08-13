<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddExtraFieldsToAccommodationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'location')) {
                $table->string('location')->nullable()->after('name');
            }
            if (!Schema::hasColumn('accommodations', 'category')) {
                $table->string('category')->nullable()->after('location');
            }
            if (!Schema::hasColumn('accommodations', 'type')) {
                $table->string('type')->nullable()->after('category');
            }
            if (!Schema::hasColumn('accommodations', 'full_description')) {
                $table->text('full_description')->nullable()->after('description');
            }
            if (!Schema::hasColumn('accommodations', 'operating_hours')) {
                $table->string('operating_hours')->nullable()->after('full_description');
            }
            if (!Schema::hasColumn('accommodations', 'contact_number')) {
                $table->string('contact_number')->nullable()->after('operating_hours');
            }
            if (!Schema::hasColumn('accommodations', 'facebook')) {
                $table->string('facebook')->nullable()->after('contact_number');
            }
            if (!Schema::hasColumn('accommodations', 'instagram')) {
                $table->string('instagram')->nullable()->after('facebook');
            }
            if (!Schema::hasColumn('accommodations', 'website')) {
                $table->string('website')->nullable()->after('instagram');
            }
            if (!Schema::hasColumn('accommodations', 'video')) {
                $table->string('video')->nullable()->after('image');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('accommodations', function (Blueprint $table) {
            //
        });
    }
}
