<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class UpdateBookingsForResortProfiles extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedBigInteger('resort_user_id')->nullable()->after('accommodation_id');
            $table->index('resort_user_id');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['accommodation_id']);
        });

        DB::statement('ALTER TABLE bookings MODIFY accommodation_id BIGINT UNSIGNED NULL');

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreign('accommodation_id')
                ->references('id')
                ->on('accommodations')
                ->onDelete('cascade');

            $table->foreign('resort_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['resort_user_id']);
            $table->dropIndex(['resort_user_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['accommodation_id']);
        });

        DB::statement('ALTER TABLE bookings MODIFY accommodation_id BIGINT UNSIGNED NOT NULL');

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreign('accommodation_id')
                ->references('id')
                ->on('accommodations')
                ->onDelete('cascade');

            $table->dropColumn('resort_user_id');
        });
    }
}
