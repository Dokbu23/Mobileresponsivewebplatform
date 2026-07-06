<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAdminManagedColumnsToAccommodationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds admin-managed listing columns to the accommodations table:
     * - created_by_admin_id: admin user who created the listing
     * - assigned_by_admin_id: admin user who assigned the listing to an owner
     * - assigned_at: timestamp when the owner was assigned
     * - is_admin_managed: true when the listing has no assigned business owner
     *
     * The existing user_id column on accommodations is already nullable and
     * already uses ON DELETE SET NULL (see
     * 2026_05_07_193822_add_is_registered_to_accommodations_and_products.php),
     * so no column alteration is required. We re-declare the foreign key
     * with ON DELETE SET NULL to keep the intent explicit and consistent
     * with the products table migration (Task 1.1). Since the column is
     * already nullable, this migration does not depend on doctrine/dbal.
     *
     * @return void
     */
    public function up()
    {
        // Re-declare the user_id foreign key with ON DELETE SET NULL to
        // make the admin-managed semantics explicit: if a business owner
        // account is removed, their accommodations revert to
        // admin-managed rather than being deleted.
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        Schema::table('accommodations', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by_admin_id')
                ->nullable()
                ->after('user_id')
                ->comment('Admin user who created this admin-managed listing');

            $table->unsignedBigInteger('assigned_by_admin_id')
                ->nullable()
                ->after('created_by_admin_id')
                ->comment('Admin user who assigned this listing to an owner');

            $table->timestamp('assigned_at')
                ->nullable()
                ->after('assigned_by_admin_id')
                ->comment('Timestamp when the listing was assigned to an owner');

            $table->boolean('is_admin_managed')
                ->default(false)
                ->after('assigned_at')
                ->comment('True when listing has no assigned business owner');

            $table->foreign('created_by_admin_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('assigned_by_admin_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
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
            $table->dropForeign(['created_by_admin_id']);
            $table->dropForeign(['assigned_by_admin_id']);
            $table->dropColumn([
                'created_by_admin_id',
                'assigned_by_admin_id',
                'assigned_at',
                'is_admin_managed',
            ]);
        });

        Schema::table('accommodations', function (Blueprint $table) {
            // Restore the user_id foreign key to its prior ON DELETE SET NULL
            // behavior (the state it was in before this migration ran).
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }
}
