<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddImagesJsonColumnToTables extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasColumn('accommodations', 'images')) {
            Schema::table('accommodations', function (Blueprint $table) {
                $table->json('images')->nullable()->after('image');
            });
        }
        if (!Schema::hasColumn('products', 'images')) {
            Schema::table('products', function (Blueprint $table) {
                $table->json('images')->nullable()->after('image');
            });
        }
        if (!Schema::hasColumn('attractions', 'images')) {
            Schema::table('attractions', function (Blueprint $table) {
                $table->json('images')->nullable()->after('image');
            });
        }
        if (!Schema::hasColumn('events', 'images')) {
            Schema::table('events', function (Blueprint $table) {
                $table->json('images')->nullable()->after('image');
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
        Schema::table('accommodations', function (Blueprint $table) {
            if (Schema::hasColumn('accommodations', 'images')) {
                $table->dropColumn('images');
            }
        });
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'images')) {
                $table->dropColumn('images');
            }
        });
        Schema::table('attractions', function (Blueprint $table) {
            if (Schema::hasColumn('attractions', 'images')) {
                $table->dropColumn('images');
            }
        });
        Schema::table('events', function (Blueprint $table) {
            if (Schema::hasColumn('events', 'images')) {
                $table->dropColumn('images');
            }
        });
    }
}
