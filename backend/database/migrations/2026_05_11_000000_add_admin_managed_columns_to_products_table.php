<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAdminManagedColumnsToProductsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds admin-managed listing columns to the products table:
     * - created_by_admin_id: admin user who created the listing
     * - assigned_by_admin_id: admin user who assigned the listing to an owner
     * - assigned_at: timestamp when the owner was assigned
     * - is_admin_managed: true when the listing has no assigned business owner
     *
     * Also re-links the existing user_id foreign key to use ON DELETE SET NULL
     * so admin-managed listings survive owner account deletion. The user_id
     * column is already nullable from a prior migration, so no column
     * alteration (and therefore no doctrine/dbal dependency) is required.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop the existing FK (originally ON DELETE CASCADE) and re-add
            // it with ON DELETE SET NULL so removing a business owner
            // converts their listings back to admin-managed rather than
            // destroying them.
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        Schema::table('products', function (Blueprint $table) {
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
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['created_by_admin_id']);
            $table->dropForeign(['assigned_by_admin_id']);
            $table->dropColumn([
                'created_by_admin_id',
                'assigned_by_admin_id',
                'assigned_at',
                'is_admin_managed',
            ]);
        });

        Schema::table('products', function (Blueprint $table) {
            // Restore the original ON DELETE CASCADE behavior on user_id.
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }
}
